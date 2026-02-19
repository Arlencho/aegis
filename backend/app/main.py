"""AEGIS API — Treasury Risk Audit with AI Analysis"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .validator import validate_policy
from .safe_reader import fetch_safe_balances, fetch_safe_transactions
from .solana_reader import fetch_solana_balances, fetch_solana_transactions
from .alerts import send_alerts
from .ai_analysis import analyze_treasury
from .database import init_db, close_db, add_to_waitlist, get_waitlist_count

import yaml


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="AEGIS", version="0.3.0", lifespan=lifespan)

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
    return {"service": "AEGIS", "version": "0.3.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


# --- Waitlist endpoints ---

@app.post("/waitlist", response_model=WaitlistResponse)
async def join_waitlist(request: WaitlistRequest):
    """Add email to waitlist for AEGIS Pro early access."""
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
async def validate(safe_address: str = Form(...), policy_file: UploadFile = File(...)):
    """Validate a Safe wallet against a policy YAML file."""

    # Parse policy
    try:
        content = await policy_file.read()
        policy = yaml.safe_load(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid policy YAML: {e}")

    if "rules" not in policy:
        raise HTTPException(status_code=400, detail="Policy must contain 'rules' key")

    # Fetch current Safe state
    balances = await fetch_safe_balances(safe_address)
    if balances is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch balances for Safe: {safe_address}")

    # Fetch transaction history
    transactions = await fetch_safe_transactions(safe_address, limit=20)

    # Run validation
    report = validate_policy(balances, policy["rules"], transactions=transactions)

    # Send alerts for failures
    failures = [r for r in report["results"] if not r["passed"]]
    if failures:
        await send_alerts(safe_address, failures, policy.get("treasury", {}).get("name", "Unknown"))

    return report


@app.post("/validate/json")
async def validate_json(request: ValidateRequest):
    """Validate a wallet against policy rules (JSON body).

    Supports Ethereum (Safe wallets) and Solana wallets.
    Optionally includes AI-powered analysis.
    """
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
        balances = await fetch_safe_balances(request.safe_address)
        if balances is None:
            raise HTTPException(
                status_code=404,
                detail=f"Could not fetch balances for Safe: {request.safe_address}",
            )
        transactions = await fetch_safe_transactions(request.safe_address, limit=20)

    # Run deterministic validation
    report = validate_policy(balances, rules, transactions=transactions)

    # Run AI analysis (non-blocking on failure)
    ai_analysis = None
    if request.include_ai:
        ai_analysis = await analyze_treasury(balances, report)

    report["ai_analysis"] = ai_analysis

    # Send alerts for failures
    failures = [r for r in report["results"] if not r["passed"]]
    if failures:
        await send_alerts(request.safe_address, failures, "Treasury Audit")

    return report
