"""Webhook dispatcher — sends signed POST requests to client-configured URLs."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

WEBHOOK_TIMEOUT = 5.0  # seconds


def _sign_payload(secret: str, body: str) -> str:
    """HMAC-SHA256 signature of the JSON body."""
    return hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()


def build_webhook_payload(
    wallet: dict,
    report: dict,
    audit_id: int | None,
    trigger: str,
) -> dict:
    """Build the standardised webhook payload from audit data."""
    failures = [
        {
            "rule": r.get("rule", r.get("name", "")),
            "severity": r.get("severity", "warning"),
            "detail": r.get("detail", ""),
        }
        for r in report.get("results", [])
        if not r.get("passed")
    ]

    risk_level = None
    ai = report.get("ai_analysis")
    if isinstance(ai, dict):
        risk_level = ai.get("risk_level")

    fail_count = len(failures)
    summary_parts = []
    if fail_count:
        summary_parts.append(f"{fail_count} rule violation{'s' if fail_count != 1 else ''}.")
    if risk_level:
        summary_parts.append(f"Risk level: {risk_level}.")

    return {
        "event": "audit.alert",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "wallet": {
            "id": wallet.get("id"),
            "address": wallet.get("address"),
            "chain": wallet.get("chain"),
            "label": wallet.get("label"),
        },
        "audit": {
            "id": audit_id,
            "trigger": trigger,
            "overall_status": report.get("overall_status", "UNKNOWN"),
            "total_usd": report.get("total_usd", 0),
        },
        "risk_level": risk_level,
        "failures": failures,
        "summary": " ".join(summary_parts) or "Audit completed.",
    }


async def send_webhook(
    webhook_url: str,
    webhook_secret: str | None,
    payload: dict,
) -> bool:
    """POST the payload to the webhook URL with HMAC signature. Returns True on success."""
    body = json.dumps(payload, default=str)

    headers = {"Content-Type": "application/json"}
    if webhook_secret:
        headers["X-Aegis-Signature"] = _sign_payload(webhook_secret, body)

    try:
        async with httpx.AsyncClient(timeout=WEBHOOK_TIMEOUT) as client:
            resp = await client.post(webhook_url, content=body, headers=headers)
        if resp.status_code < 400:
            logger.info(f"Webhook delivered to {webhook_url} (HTTP {resp.status_code})")
            return True
        else:
            logger.warning(f"Webhook to {webhook_url} returned HTTP {resp.status_code}")
            return False
    except Exception as e:
        logger.error(f"Webhook delivery failed for {webhook_url}: {e}")
        return False
