"""AEGIS API — Treasury Risk Audit with AI Analysis"""

import os

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .validator import validate_policy
from .safe_reader import fetch_safe_balances, fetch_safe_transactions
from .alerts import send_alerts
from .ai_analysis import analyze_treasury

import yaml

app = FastAPI(title="AEGIS", version="0.2.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models for JSON endpoint ---

class RuleParam(BaseModel):
    type: str
    params: dict
    severity: str = "warning"


class ValidateRequest(BaseModel):
    safe_address: str
    rules: list[RuleParam]
    include_ai: bool = True


@app.get("/")
def root():
    return {"service": "AEGIS", "version": "0.2.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


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
    """Validate a Safe wallet against policy rules (JSON body).

    Accepts structured rule parameters from the frontend UI.
    Optionally includes AI-powered analysis.
    """
    rules = [r.model_dump() for r in request.rules]

    # Fetch current Safe state
    balances = await fetch_safe_balances(request.safe_address)
    if balances is None:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch balances for Safe: {request.safe_address}",
        )

    # Fetch transaction history
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
