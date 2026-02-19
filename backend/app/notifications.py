"""In-app notification creation + webhook dispatch for audit events."""

from __future__ import annotations

import logging

from .database import create_notifications_for_wallet, get_client_for_wallet
from .webhooks import build_webhook_payload, send_webhook

logger = logging.getLogger(__name__)


async def notify_audit_result(
    wallet_id: int,
    wallet_label: str | None,
    wallet_address: str,
    report: dict,
    trigger: str = "manual",
    audit_id: int | None = None,
) -> None:
    """Create in-app notifications if an audit has failures or notable risk."""
    failures = [r for r in report.get("results", []) if not r.get("passed")]
    risk_level = None
    ai = report.get("ai_analysis")
    if isinstance(ai, dict):
        risk_level = ai.get("risk_level")

    # Only notify if there are failures or risk is medium/high
    if not failures and risk_level in (None, "low"):
        return

    wallet_name = wallet_label or f"{wallet_address[:8]}...{wallet_address[-4:]}"
    fail_count = len(failures)
    trigger_label = "Scheduled audit" if trigger == "scheduled" else "Manual audit"

    if fail_count > 0:
        title = f"Audit Alert: {wallet_name}"
        breach_count = sum(1 for f in failures if f.get("severity") == "breach")
        if breach_count > 0:
            severity = "critical"
            body = f"{trigger_label}. {breach_count} breach(es) and {fail_count - breach_count} warning(s) detected."
        else:
            severity = "warning"
            body = f"{trigger_label}. {fail_count} warning(s) detected."
    else:
        title = f"Risk Change: {wallet_name}"
        severity = "warning" if risk_level == "medium" else "critical"
        body = f"{trigger_label}. AI risk assessment: {risk_level}."

    if risk_level and fail_count > 0:
        body += f" Risk level: {risk_level}."

    ntype = "audit_alert" if fail_count > 0 else "risk_change"

    # --- In-app notifications ---
    try:
        count = await create_notifications_for_wallet(
            wallet_id=wallet_id,
            ntype=ntype,
            title=title,
            body=body,
            severity=severity,
            audit_id=audit_id,
        )
        if count:
            logger.info(f"Created {count} notification(s) for wallet {wallet_id}")
    except Exception as e:
        logger.error(f"Notification creation failed for wallet {wallet_id}: {e}")

    # --- Webhook dispatch ---
    try:
        client = await get_client_for_wallet(wallet_id)
        if client and client.get("webhook_url"):
            wallet_data = {
                "id": wallet_id,
                "address": wallet_address,
                "chain": report.get("chain", "ethereum"),
                "label": wallet_label,
            }
            payload = build_webhook_payload(wallet_data, report, audit_id, trigger)
            await send_webhook(client["webhook_url"], client.get("webhook_secret"), payload)
    except Exception as e:
        logger.error(f"Webhook dispatch failed for wallet {wallet_id}: {e}")
