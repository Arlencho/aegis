"""AEGIS API — Treasury Risk Audit with AI Analysis"""

import asyncio
import os
import re
import time
from collections import defaultdict
from contextlib import asynccontextmanager

import bcrypt
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .validator import validate_policy
from .safe_reader import fetch_safe_balances, fetch_safe_transactions
from .eth_reader import fetch_eoa_balances, fetch_eoa_transactions
from .solana_reader import fetch_solana_balances, fetch_solana_transactions
from .alerts import send_alerts
from .ai_analysis import analyze_treasury
from .auth import get_current_user, get_optional_user
from .database import (
    init_db, close_db,
    add_to_waitlist, get_waitlist_count,
    save_audit, get_audit_history, get_audit_detail,
    create_user, get_user_by_email, get_user_by_id,
    create_organization, get_user_orgs, get_org, get_org_member, get_org_members,
    add_org_member, remove_org_member,
    create_client, get_clients, get_client, update_client, delete_client,
    user_can_access_client,
    create_wallet, get_wallets, get_wallets_for_user, get_wallet, update_wallet,
    delete_wallet, update_wallet_audit, update_wallet_schedule, get_dashboard_stats,
    get_notifications, get_unread_count, mark_notifications_read,
)
from .scheduler import scheduler_loop
from .notifications import notify_audit_result
from .webhooks import build_webhook_payload, send_webhook

import yaml


# --- Address validation ---

ETH_ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")
# Solana addresses are base58, 32-44 chars
SOLANA_ADDRESS_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")

MAX_YAML_SIZE = 1_048_576  # 1 MB


def _validate_eth_address(addr: str) -> bool:
    return bool(ETH_ADDRESS_RE.match(addr))


def _validate_solana_address(addr: str) -> bool:
    return bool(SOLANA_ADDRESS_RE.match(addr))


# --- Rate limiting ---

RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MIN", "10"))
_rate_buckets: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(client_ip: str) -> bool:
    """Return True if request is allowed, False if rate-limited."""
    now = time.time()
    bucket = _rate_buckets[client_ip]
    # Prune old entries
    _rate_buckets[client_ip] = [t for t in bucket if now - t < 60]
    if len(_rate_buckets[client_ip]) >= RATE_LIMIT:
        return False
    _rate_buckets[client_ip].append(now)
    return True


# --- Ethereum balance fetching with Smart fallback ---

EVM_CHAINS = {"ethereum", "bsc", "base", "arbitrum", "polygon"}


async def _fetch_evm_balances(address: str, chain: str = "ethereum") -> dict | None:
    """For Ethereum: try Safe API first, fall back to Etherscan.
    For L2s (Base, Arbitrum, Polygon): use Etherscan directly."""
    if chain == "ethereum":
        balances = await fetch_safe_balances(address)
        if balances is not None:
            return balances
    return await fetch_eoa_balances(address, chain=chain)


async def _fetch_evm_transactions(address: str, limit: int = 20, chain: str = "ethereum") -> list[dict] | None:
    """For Ethereum: try Safe API first, fall back to Etherscan.
    For L2s: use Etherscan directly."""
    if chain == "ethereum":
        txs = await fetch_safe_transactions(address, limit=limit)
        if txs is not None:
            return txs
    return await fetch_eoa_transactions(address, limit=limit, chain=chain)


# --- Helpers ---

def _get_user_id(user: dict) -> int:
    """Extract user ID from JWT payload."""
    return int(user.get("sub", user.get("id", 0)))


# --- App setup ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler_task = asyncio.create_task(scheduler_loop())
    yield
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    await close_db()


app = FastAPI(title="AEGIS", version="0.7.0", lifespan=lifespan)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ---

class RuleParam(BaseModel):
    type: str
    params: dict
    severity: str = "warning"


class ValidateRequest(BaseModel):
    safe_address: str
    rules: list[RuleParam]
    include_ai: bool = True
    chain: str = "ethereum"


class WaitlistRequest(BaseModel):
    email: str
    name: str | None = None
    source: str = "website"


class WaitlistResponse(BaseModel):
    success: bool
    message: str
    is_new: bool


class SignupRequest(BaseModel):
    email: str
    name: str | None = None
    password: str


class VerifyRequest(BaseModel):
    email: str
    password: str


class ClientCreateRequest(BaseModel):
    name: str
    description: str | None = None
    org_id: int | None = None


class ClientUpdateRequest(BaseModel):
    name: str
    description: str | None = None
    webhook_url: str | None = None
    webhook_secret: str | None = None


class WalletCreateRequest(BaseModel):
    address: str
    chain: str = "ethereum"
    label: str | None = None
    client_id: int


class WalletUpdateRequest(BaseModel):
    label: str


class WalletAuditRequest(BaseModel):
    rules: list[RuleParam] | None = None
    include_ai: bool = True


class WalletScheduleRequest(BaseModel):
    frequency: str | None = None  # "daily", "weekly", "monthly", or null to disable
    include_ai: bool = False


class MarkReadRequest(BaseModel):
    notification_ids: list[int] | None = None


class OrgCreateRequest(BaseModel):
    name: str


class OrgInviteRequest(BaseModel):
    email: str
    role: str = "viewer"


@app.get("/")
def root():
    return {"service": "AEGIS", "version": "0.7.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


# --- Auth endpoints ---

AUTH_RATE_LIMIT = 5  # Stricter rate limit for auth


@app.post("/auth/signup")
async def signup(request: SignupRequest, req: Request):
    """Create a new user account."""
    if not _check_rate_limit(req.client.host if req.client else "unknown"):
        raise HTTPException(status_code=429, detail="Too many requests.")

    if "@" not in request.email or "." not in request.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    user = await create_user(request.email, request.name, password_hash)

    if user is None:
        raise HTTPException(status_code=409, detail="Email already registered")

    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "plan": user["plan"],
        "created_at": str(user["created_at"]),
    }


@app.post("/auth/verify")
async def verify_credentials(request: VerifyRequest, req: Request):
    """Verify email + password. Used by NextAuth credentials provider."""
    if not _check_rate_limit(req.client.host if req.client else "unknown"):
        raise HTTPException(status_code=429, detail="Too many requests.")

    user = await get_user_by_email(request.email)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not bcrypt.checkpw(request.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "plan": user["plan"],
    }


@app.get("/users/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile (requires authentication)."""
    db_user = await get_user_by_id(_get_user_id(user))
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": db_user["id"],
        "email": db_user["email"],
        "name": db_user["name"],
        "plan": db_user["plan"],
        "created_at": str(db_user["created_at"]),
    }


# --- Organization endpoints (protected) ---

@app.post("/orgs")
async def create_org_endpoint(
    request: OrgCreateRequest,
    user: dict = Depends(get_current_user),
):
    """Create a new organization. The authenticated user becomes the owner."""
    user_id = _get_user_id(user)
    org = await create_organization(request.name, user_id)
    if org is None:
        raise HTTPException(status_code=500, detail="Failed to create organization")
    return org


@app.get("/orgs")
async def list_orgs(user: dict = Depends(get_current_user)):
    """List all organizations the current user belongs to."""
    user_id = _get_user_id(user)
    orgs = await get_user_orgs(user_id)
    return {"organizations": orgs}


@app.get("/orgs/{org_id}")
async def get_org_endpoint(org_id: int, user: dict = Depends(get_current_user)):
    """Get a single organization (must be a member)."""
    user_id = _get_user_id(user)
    member = await get_org_member(org_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    org = await get_org(org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    org["role"] = member["role"]
    return org


@app.get("/orgs/{org_id}/members")
async def list_org_members(org_id: int, user: dict = Depends(get_current_user)):
    """List members of an organization."""
    user_id = _get_user_id(user)
    member = await get_org_member(org_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    members = await get_org_members(org_id)
    return {"members": members}


@app.post("/orgs/{org_id}/members")
async def invite_org_member(
    org_id: int,
    request: OrgInviteRequest,
    user: dict = Depends(get_current_user),
):
    """Invite a user to an organization (owner/admin only)."""
    user_id = _get_user_id(user)
    member = await get_org_member(org_id, user_id)
    if member is None or member["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can invite members")

    if request.role not in ("admin", "viewer"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'viewer'")

    invited_user = await get_user_by_email(request.email)
    if invited_user is None:
        raise HTTPException(status_code=404, detail="User not found. They must sign up first.")

    result = await add_org_member(org_id, invited_user["id"], request.role)
    if result is None:
        raise HTTPException(status_code=409, detail="User is already a member")
    return result


@app.delete("/orgs/{org_id}/members/{member_user_id}")
async def remove_org_member_endpoint(
    org_id: int,
    member_user_id: int,
    user: dict = Depends(get_current_user),
):
    """Remove a member from an organization (owner/admin only)."""
    user_id = _get_user_id(user)
    member = await get_org_member(org_id, user_id)
    if member is None or member["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can remove members")

    if member_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    deleted = await remove_org_member(org_id, member_user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}


# --- Client endpoints (protected) ---

@app.post("/clients")
async def create_client_endpoint(
    request: ClientCreateRequest,
    user: dict = Depends(get_current_user),
):
    """Create a new client (treasury/end-client)."""
    user_id = _get_user_id(user)

    # If org_id provided, verify user is a member
    if request.org_id:
        member = await get_org_member(request.org_id, user_id)
        if member is None or member["role"] not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Not authorized to create clients in this org")
        client = await create_client(None, request.org_id, request.name, request.description)
    else:
        client = await create_client(user_id, None, request.name, request.description)

    if client is None:
        raise HTTPException(status_code=500, detail="Failed to create client")
    return client


@app.get("/clients")
async def list_clients(
    user: dict = Depends(get_current_user),
    org_id: int | None = None,
):
    """List all clients accessible to the current user."""
    user_id = _get_user_id(user)
    clients = await get_clients(user_id, org_id=org_id)
    return {"clients": clients}


@app.get("/clients/{client_id}")
async def get_client_endpoint(client_id: int, user: dict = Depends(get_current_user)):
    """Get a single client."""
    user_id = _get_user_id(user)
    if not await user_can_access_client(user_id, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    client = await get_client(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.patch("/clients/{client_id}")
async def update_client_endpoint(
    client_id: int,
    request: ClientUpdateRequest,
    user: dict = Depends(get_current_user),
):
    """Update a client's name, description, and webhook settings."""
    user_id = _get_user_id(user)
    if not await user_can_access_client(user_id, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    client = await update_client(
        client_id, request.name, request.description,
        webhook_url=request.webhook_url, webhook_secret=request.webhook_secret,
    )
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.delete("/clients/{client_id}")
async def delete_client_endpoint(client_id: int, user: dict = Depends(get_current_user)):
    """Delete a client and all its wallets."""
    user_id = _get_user_id(user)
    if not await user_can_access_client(user_id, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    deleted = await delete_client(client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True}


@app.post("/clients/{client_id}/test-webhook")
async def test_webhook_endpoint(client_id: int, user: dict = Depends(get_current_user)):
    """Send a test payload to the client's configured webhook URL."""
    user_id = _get_user_id(user)
    if not await user_can_access_client(user_id, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    client = await get_client(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    if not client.get("webhook_url"):
        raise HTTPException(status_code=400, detail="No webhook URL configured")

    test_payload = build_webhook_payload(
        wallet={"id": 0, "address": "0x0000000000000000000000000000000000000000", "chain": "ethereum", "label": "Test Wallet"},
        report={
            "overall_status": "NON-COMPLIANT",
            "total_usd": 50000,
            "results": [{"rule": "test_rule", "name": "Test Rule", "passed": False, "severity": "warning", "detail": "This is a test webhook delivery."}],
        },
        audit_id=0,
        trigger="test",
    )

    success = await send_webhook(client["webhook_url"], client.get("webhook_secret"), test_payload)
    if not success:
        raise HTTPException(status_code=502, detail="Webhook delivery failed — check the URL and try again")
    return {"success": True, "message": "Test webhook delivered"}


# --- Wallet endpoints (protected, scoped through clients) ---

@app.post("/wallets")
async def create_wallet_endpoint(
    request: WalletCreateRequest,
    user: dict = Depends(get_current_user),
):
    """Save a wallet to a client."""
    user_id = _get_user_id(user)

    # Verify user can access this client
    if not await user_can_access_client(user_id, request.client_id):
        raise HTTPException(status_code=404, detail="Client not found")

    # Validate address format
    if request.chain == "solana":
        if not _validate_solana_address(request.address):
            raise HTTPException(status_code=400, detail="Invalid Solana address format.")
    else:
        if not _validate_eth_address(request.address):
            raise HTTPException(status_code=400, detail="Invalid Ethereum address format.")

    wallet = await create_wallet(request.client_id, request.address, request.chain, request.label)
    if wallet is None:
        raise HTTPException(status_code=409, detail="Wallet already saved")
    return wallet


@app.get("/wallets")
async def list_wallets(
    user: dict = Depends(get_current_user),
    client_id: int | None = None,
):
    """List wallets. If client_id provided, scope to that client. Otherwise all user wallets."""
    user_id = _get_user_id(user)
    if client_id:
        if not await user_can_access_client(user_id, client_id):
            raise HTTPException(status_code=404, detail="Client not found")
        wallets = await get_wallets(client_id)
    else:
        wallets = await get_wallets_for_user(user_id)
    return {"wallets": wallets}


@app.patch("/wallets/{wallet_id}")
async def update_wallet_endpoint(
    wallet_id: int,
    request: WalletUpdateRequest,
    user: dict = Depends(get_current_user),
):
    """Update a wallet's label."""
    user_id = _get_user_id(user)
    wallet = await get_wallet(wallet_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet not found")
    if not await user_can_access_client(user_id, wallet["client_id"]):
        raise HTTPException(status_code=404, detail="Wallet not found")
    updated = await update_wallet(wallet_id, request.label)
    if updated is None:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return updated


@app.delete("/wallets/{wallet_id}")
async def delete_wallet_endpoint(
    wallet_id: int,
    user: dict = Depends(get_current_user),
):
    """Delete a saved wallet."""
    user_id = _get_user_id(user)
    wallet = await get_wallet(wallet_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet not found")
    if not await user_can_access_client(user_id, wallet["client_id"]):
        raise HTTPException(status_code=404, detail="Wallet not found")
    deleted = await delete_wallet(wallet_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return {"success": True}


@app.patch("/wallets/{wallet_id}/schedule")
async def schedule_wallet(
    wallet_id: int,
    request: WalletScheduleRequest,
    user: dict = Depends(get_current_user),
):
    """Set or clear a wallet's recurring audit schedule."""
    user_id = _get_user_id(user)
    wallet = await get_wallet(wallet_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet not found")
    if not await user_can_access_client(user_id, wallet["client_id"]):
        raise HTTPException(status_code=404, detail="Wallet not found")

    if request.frequency and request.frequency not in ("daily", "weekly", "monthly"):
        raise HTTPException(status_code=400, detail="Frequency must be 'daily', 'weekly', 'monthly', or null")

    updated = await update_wallet_schedule(wallet_id, request.frequency, request.include_ai)
    if updated is None:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return updated


@app.post("/wallets/{wallet_id}/audit")
async def audit_wallet(
    wallet_id: int,
    request: WalletAuditRequest = WalletAuditRequest(),
    user: dict = Depends(get_current_user),
    req: Request = None,
):
    """Run an audit on a saved wallet."""
    if req and not _check_rate_limit(req.client.host if req.client else "unknown"):
        raise HTTPException(status_code=429, detail="Too many requests.")

    user_id = _get_user_id(user)
    wallet = await get_wallet(wallet_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet not found")
    if not await user_can_access_client(user_id, wallet["client_id"]):
        raise HTTPException(status_code=404, detail="Wallet not found")

    address = wallet["address"]
    chain = wallet["chain"]

    # Use default rules if none provided
    if request.rules:
        rules = [r.model_dump() for r in request.rules]
    else:
        from .validator import DEFAULT_RULES
        rules = DEFAULT_RULES

    # Fetch balances
    if chain == "solana":
        balances = await fetch_solana_balances(address)
        transactions = await fetch_solana_transactions(address, limit=10) if balances else None
    else:
        balances = await _fetch_evm_balances(address, chain=chain)
        transactions = await _fetch_evm_transactions(address, limit=20, chain=chain) if balances else None

    if balances is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch balances for {address}")

    report = validate_policy(balances, rules, transactions=transactions)

    if request.include_ai:
        report["ai_analysis"] = await analyze_treasury(balances, report)

    audit_id = await save_audit(address, chain, report, client_id=wallet["client_id"], trigger="manual")

    # Update wallet last audit info
    risk_level = None
    ai = report.get("ai_analysis")
    if isinstance(ai, dict):
        risk_level = ai.get("risk_level")
    await update_wallet_audit(wallet_id, risk_level)

    # In-app notifications
    await notify_audit_result(
        wallet_id=wallet_id,
        wallet_label=wallet.get("label"),
        wallet_address=address,
        report=report,
        trigger="manual",
        audit_id=audit_id,
    )

    return report


@app.get("/dashboard/overview")
async def dashboard_overview(user: dict = Depends(get_current_user)):
    """Get dashboard overview stats for the logged-in user."""
    user_id = _get_user_id(user)
    stats = await get_dashboard_stats(user_id)
    return stats


@app.get("/dashboard/history")
async def dashboard_history(
    user: dict = Depends(get_current_user),
    limit: int = 50,
    wallet_address: str | None = None,
):
    """Get audit history for the logged-in user's wallets."""
    user_id = _get_user_id(user)
    # Get all user's wallets across all clients
    wallets = await get_wallets_for_user(user_id)
    if not wallets:
        return {"audits": []}

    if wallet_address:
        addresses = [wallet_address.lower().strip()]
    else:
        addresses = [w["address"] for w in wallets]

    # Aggregate audit history across all user wallets
    all_audits = []
    for addr in addresses:
        audits = await get_audit_history(addr, limit=min(limit, 100))
        all_audits.extend(audits)

    # Sort by created_at desc and limit
    all_audits.sort(key=lambda a: a.get("created_at", ""), reverse=True)
    return {"audits": all_audits[:limit]}


# --- Notification endpoints ---

@app.get("/notifications")
async def list_notifications(
    user: dict = Depends(get_current_user),
    unread_only: bool = False,
    limit: int = 50,
):
    """Get notifications for the current user."""
    user_id = _get_user_id(user)
    notifications = await get_notifications(user_id, unread_only=unread_only, limit=min(limit, 100))
    return {"notifications": notifications}


@app.get("/notifications/unread-count")
async def unread_notification_count(user: dict = Depends(get_current_user)):
    """Get unread notification count for the current user."""
    user_id = _get_user_id(user)
    count = await get_unread_count(user_id)
    return {"count": count}


@app.post("/notifications/mark-read")
async def mark_read(
    request: MarkReadRequest,
    user: dict = Depends(get_current_user),
):
    """Mark notifications as read. If no IDs provided, marks all as read."""
    user_id = _get_user_id(user)
    updated = await mark_notifications_read(user_id, request.notification_ids)
    return {"updated": updated}


# --- Waitlist endpoints ---

@app.post("/waitlist", response_model=WaitlistResponse)
async def join_waitlist(request: WaitlistRequest, req: Request):
    """Add email to waitlist for AEGIS Pro early access."""
    if not _check_rate_limit(req.client.host if req.client else "unknown"):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again in a minute.")

    if "@" not in request.email or "." not in request.email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    result = await add_to_waitlist(request.email, request.name, request.source)

    if result is None:
        raise HTTPException(status_code=503, detail="Waitlist temporarily unavailable. Please try again later.")

    if result:
        return WaitlistResponse(
            success=True,
            message="You're on the list! We'll reach out when AEGIS Pro launches.",
            is_new=True,
        )
    return WaitlistResponse(
        success=True,
        message="You're already on the list!",
        is_new=False,
    )


@app.get("/waitlist/count")
async def waitlist_count():
    """Return total waitlist signups for social proof."""
    count = await get_waitlist_count()
    return {"count": count}


# --- Validation endpoints ---

@app.post("/validate")
async def validate(
    safe_address: str = Form(...),
    policy_file: UploadFile = File(...),
    req: Request = None,
):
    """Validate an Ethereum wallet against a policy YAML file."""
    if req and not _check_rate_limit(req.client.host if req.client else "unknown"):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again in a minute.")

    # Validate address format
    if not _validate_eth_address(safe_address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address format. Expected 0x followed by 40 hex characters.")

    # Parse policy (with size limit)
    try:
        content = await policy_file.read(MAX_YAML_SIZE + 1)
        if len(content) > MAX_YAML_SIZE:
            raise HTTPException(status_code=400, detail="Policy file too large. Maximum size is 1MB.")
        policy = yaml.safe_load(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid policy YAML: {e}")

    if "rules" not in policy:
        raise HTTPException(status_code=400, detail="Policy must contain 'rules' key")

    # Fetch balances (Safe first, then Etherscan fallback)
    balances = await _fetch_evm_balances(safe_address)
    if balances is None:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch balances for address: {safe_address}.",
        )

    # Fetch transaction history
    transactions = await _fetch_evm_transactions(safe_address, limit=20)

    # Run validation
    report = validate_policy(balances, policy["rules"], transactions=transactions)

    # Send alerts for failures
    failures = [r for r in report["results"] if not r["passed"]]
    if failures:
        await send_alerts(safe_address, failures, policy.get("treasury", {}).get("name", "Unknown"))

    return report


@app.post("/validate/json")
async def validate_json(request: ValidateRequest, req: Request):
    """Validate a wallet against policy rules (JSON body).

    Supports Ethereum (Safe + regular wallets) and Solana wallets.
    Optionally includes AI-powered analysis.
    """
    if not _check_rate_limit(req.client.host if req.client else "unknown"):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again in a minute.")

    # Validate address format
    if request.chain == "solana":
        if not _validate_solana_address(request.safe_address):
            raise HTTPException(status_code=400, detail="Invalid Solana address format.")
    elif request.chain in EVM_CHAINS:
        if not _validate_eth_address(request.safe_address):
            raise HTTPException(status_code=400, detail="Invalid address format. Expected 0x followed by 40 hex characters.")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported chain: {request.chain}")

    rules = [r.model_dump() for r in request.rules]

    # Dispatch to correct chain reader
    if request.chain == "solana":
        balances = await fetch_solana_balances(request.safe_address)
        if balances is None:
            raise HTTPException(
                status_code=404,
                detail=f"Could not fetch balances for Solana wallet: {request.safe_address}",
            )
        transactions = await fetch_solana_transactions(request.safe_address, limit=10)
    else:
        # EVM chains: Ethereum uses Safe API fallback, L2s go direct to Etherscan
        balances = await _fetch_evm_balances(request.safe_address, chain=request.chain)
        if balances is None:
            raise HTTPException(
                status_code=404,
                detail=f"Could not fetch balances for {request.chain} address: {request.safe_address}. "
                       "Please verify the address is correct.",
            )
        transactions = await _fetch_evm_transactions(request.safe_address, limit=20, chain=request.chain)

    # Run deterministic validation
    report = validate_policy(balances, rules, transactions=transactions)

    # Run AI analysis (non-blocking on failure)
    ai_analysis = None
    if request.include_ai:
        ai_analysis = await analyze_treasury(balances, report)

    report["ai_analysis"] = ai_analysis

    # Persist audit (fire-and-forget — don't fail the response)
    await save_audit(request.safe_address, request.chain, report)

    # Send alerts for failures
    failures = [r for r in report["results"] if not r["passed"]]
    if failures:
        await send_alerts(request.safe_address, failures, "Treasury Audit")

    return report


# --- Audit History endpoints ---

@app.get("/audits/{wallet_address}")
async def audit_history(wallet_address: str, limit: int = 20):
    """Return audit history for a wallet address."""
    history = await get_audit_history(wallet_address, limit=min(limit, 100))
    return {"wallet_address": wallet_address, "audits": history}


@app.get("/audits/detail/{audit_id}")
async def audit_detail(audit_id: int):
    """Return a single audit with full report data."""
    result = await get_audit_detail(audit_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return result
