"""Background scheduler for recurring wallet audits."""

from __future__ import annotations

import asyncio
import logging

from .database import (
    get_wallets_due_for_audit,
    advance_wallet_schedule,
    save_audit,
    update_wallet_audit,
)
from .validator import validate_policy, DEFAULT_RULES
from .eth_reader import fetch_eoa_balances
from .solana_reader import fetch_solana_balances, fetch_solana_transactions
from .safe_reader import fetch_safe_balances
from .ai_analysis import analyze_treasury

logger = logging.getLogger(__name__)

EVM_CHAINS = {"ethereum", "bsc", "base", "arbitrum", "polygon"}

AUDIT_GAP_SECONDS = 10  # delay between audits to respect rate limits
POLL_INTERVAL_SECONDS = 300  # 5 minutes


async def _fetch_balances(address: str, chain: str) -> dict | None:
    """Fetch balances for a wallet, dispatching to the right chain reader."""
    if chain == "solana":
        return await fetch_solana_balances(address)
    if chain == "ethereum":
        balances = await fetch_safe_balances(address)
        if balances is not None:
            return balances
    return await fetch_eoa_balances(address, chain=chain)


async def run_scheduled_audit(wallet: dict) -> None:
    """Execute a single scheduled audit for a wallet."""
    wallet_id = wallet["id"]
    address = wallet["address"]
    chain = wallet["chain"]
    frequency = wallet["schedule_frequency"]
    include_ai = wallet.get("schedule_include_ai", False)

    logger.info(f"Scheduled audit: wallet {wallet_id} ({address[:10]}... on {chain})")

    try:
        balances = await _fetch_balances(address, chain)
        if balances is None:
            logger.warning(f"Scheduled audit: could not fetch balances for wallet {wallet_id}")
            await advance_wallet_schedule(wallet_id, frequency, None)
            return

        # Fetch transactions for rule evaluation
        transactions = None
        if chain == "solana":
            transactions = await fetch_solana_transactions(address, limit=10)
        # EVM transactions are optional for scheduled audits — skip to reduce API calls

        report = validate_policy(balances, DEFAULT_RULES, transactions=transactions)

        if include_ai:
            try:
                report["ai_analysis"] = await analyze_treasury(balances, report)
            except Exception as e:
                logger.warning(f"Scheduled audit AI failed for wallet {wallet_id}: {e}")
                report["ai_analysis"] = None

        # Extract risk level
        risk_level = None
        ai = report.get("ai_analysis")
        if isinstance(ai, dict):
            risk_level = ai.get("risk_level")

        # Persist
        await save_audit(
            address, chain, report,
            client_id=wallet.get("client_id"),
            trigger="scheduled",
        )
        await update_wallet_audit(wallet_id, risk_level)
        await advance_wallet_schedule(wallet_id, frequency, risk_level)

        logger.info(f"Scheduled audit complete: wallet {wallet_id}, risk={risk_level}")

    except Exception as e:
        logger.error(f"Scheduled audit failed for wallet {wallet_id}: {e}")
        # Always advance to prevent retry loops
        try:
            await advance_wallet_schedule(wallet_id, frequency, None)
        except Exception:
            pass


async def scheduler_loop() -> None:
    """Poll for due wallets and run their audits. Runs forever."""
    logger.info("Scheduler started — polling every %ds", POLL_INTERVAL_SECONDS)
    while True:
        try:
            wallets = await get_wallets_due_for_audit()
            if wallets:
                logger.info(f"Scheduler: {len(wallets)} wallet(s) due for audit")
            for wallet in wallets:
                await run_scheduled_audit(wallet)
                await asyncio.sleep(AUDIT_GAP_SECONDS)
        except asyncio.CancelledError:
            logger.info("Scheduler shutting down")
            return
        except Exception as e:
            logger.error(f"Scheduler loop error: {e}")

        await asyncio.sleep(POLL_INTERVAL_SECONDS)
