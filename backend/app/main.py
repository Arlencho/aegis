"""AEGIS API — Deterministic Policy Enforcement for DAO Treasuries"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .validator import validate_policy
from .safe_reader import fetch_safe_balances
from .alerts import send_alerts

import yaml

app = FastAPI(title="AEGIS", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/validate")
async def validate(safe_address: str = Form(...), policy_file: UploadFile = File(...)):
    """Validate a Gnosis Safe against a policy YAML file."""

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

    # Run validation
    report = validate_policy(balances, policy["rules"])

    # Send alerts for failures
    failures = [r for r in report["results"] if not r["passed"]]
    if failures:
        await send_alerts(safe_address, failures, policy.get("treasury", {}).get("name", "Unknown"))

    return report
