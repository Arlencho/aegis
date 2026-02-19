"""Alert dispatcher — Telegram + SendGrid notifications on rule breaches."""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_ALERT_CHAT_ID", "")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
ALERT_EMAIL = os.getenv("ALERT_EMAIL", "")


async def send_alerts(safe_address: str, failures: list[dict], treasury_name: str):
    """Send alerts for policy violations via configured channels."""
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        await _send_telegram_alert(safe_address, failures, treasury_name)

    if SENDGRID_API_KEY and ALERT_EMAIL:
        await _send_email_alert(safe_address, failures, treasury_name)


async def _send_telegram_alert(safe_address: str, failures: list[dict], treasury_name: str):
    """Send policy violation alert via Telegram."""
    lines = [f"AEGIS Alert: {treasury_name}", f"Safe: {safe_address[:10]}...{safe_address[-6:]}", ""]

    for f in failures:
        icon = "!" if f["severity"] == "breach" else "?"
        lines.append(f"[{icon}] {f['rule']}: {f['detail']}")

    message = "\n".join(lines)

    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": TELEGRAM_CHAT_ID, "text": message},
            )
        except httpx.HTTPError as e:
            logger.error(f"Telegram alert failed: {e}")


async def _send_email_alert(safe_address: str, failures: list[dict], treasury_name: str):
    """Send policy violation alert via SendGrid."""
    subject = f"AEGIS Policy Violation: {treasury_name}"

    body_lines = [f"Safe Address: {safe_address}", ""]
    for f in failures:
        body_lines.append(f"- [{f['severity'].upper()}] {f['rule']}: {f['detail']}")

    body = "\n".join(body_lines)

    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": ALERT_EMAIL}]}],
                    "from": {"email": "alerts@aegis.dev"},
                    "subject": subject,
                    "content": [{"type": "text/plain", "value": body}],
                },
            )
        except httpx.HTTPError as e:
            logger.error(f"SendGrid alert failed: {e}")
