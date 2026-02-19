"""AEGIS API — Treasury Risk Audit with AI Analysis"""

import os
import re
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .validator import validate_policy
from .safe_reader import fetch_safe_balances, fetch_safe_transactions
from .eth_reader import fetch_eoa_balances, fetch_eoa_transactions
from .solana_reader import fetch_solana_balances, fetch_solana_transactions
from .alerts import send_alerts
from .ai_analysis import analyze_treasury
from .database import (
    init_db, close_db,
    add_to_waitlist, get_waitlist_count,
    save_audit, get_audit_history, get_audit_detail,
)

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

async def _fetch_eth_balances(address: str) -> dict | None:
    """Try Safe API first, fall back to Etherscan for regular wallets."""
    balances = await fetch_safe_balances(address)
    if balances is not None:
        return balances
    return await fetch_eoa_balances(address)


async def _fetch_eth_transactions(address: str, limit: int = 20) -> list[dict] | None:
    """Try Safe API first, fall back to Etherscan for regular wallets."""
    txs = await fetch_safe_transactions(address, limit=limit)
    if txs is not None:
        return txs
    return await fetch_eoa_transactions(address, limit=limit)


# --- App setup ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="AEGIS", version="0.5.0", lifespan=lifespan)

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


@app.get("/")
def root():
    return {"service": "AEGIS", "version": "0.5.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


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
    balances = await _fetch_eth_balances(safe_address)
    if balances is None:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch balances for address: {safe_address}.",
        )

    # Fetch transaction history
    transactions = await _fetch_eth_transactions(safe_address, limit=20)

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
    else:
        if not _validate_eth_address(request.safe_address):
            raise HTTPException(status_code=400, detail="Invalid Ethereum address format. Expected 0x followed by 40 hex characters.")

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
        # Smart fallback: try Safe API, then Etherscan for regular wallets
        balances = await _fetch_eth_balances(request.safe_address)
        if balances is None:
            raise HTTPException(
                status_code=404,
                detail=f"Could not fetch balances for Ethereum address: {request.safe_address}. "
                       "Please verify the address is correct.",
            )
        transactions = await _fetch_eth_transactions(request.safe_address, limit=20)

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
