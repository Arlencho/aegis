"""PostgreSQL connection pool + waitlist/audit queries using asyncpg."""

from __future__ import annotations

import json
import logging
import os

import asyncpg

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


def _get_database_url() -> str:
    return os.getenv("DATABASE_URL", "")


async def init_db():
    """Create connection pool and ensure tables exist."""
    global _pool
    url = _get_database_url()
    if not url or not url.startswith(("postgresql://", "postgres://")):
        logger.warning("DATABASE_URL not set or invalid — DB features disabled")
        return

    try:
        _pool = await asyncpg.create_pool(url, min_size=2, max_size=10)
        async with _pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS waitlist (
                    id          SERIAL PRIMARY KEY,
                    email       TEXT NOT NULL UNIQUE,
                    name        TEXT,
                    source      TEXT DEFAULT 'website',
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_history (
                    id              SERIAL PRIMARY KEY,
                    wallet_address  TEXT NOT NULL,
                    chain           TEXT NOT NULL DEFAULT 'ethereum',
                    total_usd       NUMERIC,
                    overall_status  TEXT NOT NULL,
                    passed          INT NOT NULL,
                    failed          INT NOT NULL,
                    total_rules     INT NOT NULL,
                    risk_level      TEXT,
                    report_json     JSONB NOT NULL,
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_history_wallet
                    ON audit_history (wallet_address, created_at DESC)
            """)
        logger.info("Database initialized, all tables ready")
    except Exception as e:
        logger.error(f"Database connection failed: {e} — DB features disabled")
        _pool = None


async def close_db():
    """Close the connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def add_to_waitlist(
    email: str, name: str | None = None, source: str = "website"
) -> bool | None:
    """Insert email into waitlist.

    Returns True if new signup, False if duplicate, None if DB unavailable.
    """
    if not _pool:
        return None
    try:
        result = await _pool.fetchval(
            """INSERT INTO waitlist (email, name, source)
               VALUES ($1, $2, $3)
               ON CONFLICT (email) DO NOTHING
               RETURNING id""",
            email.lower().strip(),
            name,
            source,
        )
        return result is not None
    except Exception as e:
        logger.error(f"Waitlist insert failed: {e}")
        return None


async def get_waitlist_count() -> int:
    """Return total number of waitlist signups."""
    if not _pool:
        return 0
    try:
        return await _pool.fetchval("SELECT COUNT(*) FROM waitlist")
    except Exception:
        return 0


# --- Audit History ---


async def save_audit(
    wallet_address: str, chain: str, report: dict
) -> int | None:
    """Persist an audit report. Returns the new row ID, or None if DB unavailable."""
    if not _pool:
        return None
    try:
        risk_level = None
        ai = report.get("ai_analysis")
        if isinstance(ai, dict):
            risk_level = ai.get("risk_level")

        return await _pool.fetchval(
            """INSERT INTO audit_history
                   (wallet_address, chain, total_usd, overall_status,
                    passed, failed, total_rules, risk_level, report_json)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
               RETURNING id""",
            wallet_address.lower().strip(),
            chain,
            report.get("total_usd", 0),
            report.get("overall_status", "UNKNOWN"),
            report.get("passed", 0),
            report.get("failed", 0),
            report.get("total_rules", 0),
            risk_level,
            json.dumps(report),
        )
    except Exception as e:
        logger.error(f"Audit save failed: {e}")
        return None


async def get_audit_history(
    wallet_address: str, limit: int = 20
) -> list[dict]:
    """Return recent audits for a wallet (without full report JSON)."""
    if not _pool:
        return []
    try:
        rows = await _pool.fetch(
            """SELECT id, chain, total_usd, overall_status,
                      passed, failed, total_rules, risk_level, created_at
                 FROM audit_history
                WHERE wallet_address = $1
                ORDER BY created_at DESC
                LIMIT $2""",
            wallet_address.lower().strip(),
            limit,
        )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Audit history fetch failed: {e}")
        return []


async def get_audit_detail(audit_id: int) -> dict | None:
    """Return a single audit with full report JSON."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, wallet_address, chain, total_usd, overall_status,
                      passed, failed, total_rules, risk_level,
                      report_json, created_at
                 FROM audit_history
                WHERE id = $1""",
            audit_id,
        )
        if row is None:
            return None
        result = dict(row)
        if isinstance(result.get("report_json"), str):
            result["report_json"] = json.loads(result["report_json"])
        return result
    except Exception as e:
        logger.error(f"Audit detail fetch failed: {e}")
        return None
