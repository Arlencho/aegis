"""PostgreSQL connection pool + waitlist queries using asyncpg."""

from __future__ import annotations

import logging
import os

import asyncpg

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


def _get_database_url() -> str:
    return os.getenv("DATABASE_URL", "")


async def init_db():
    """Create connection pool and ensure waitlist table exists."""
    global _pool
    url = _get_database_url()
    if not url or not url.startswith(("postgresql://", "postgres://")):
        logger.warning("DATABASE_URL not set or invalid — waitlist features disabled")
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
        logger.info("Database initialized, waitlist table ready")
    except Exception as e:
        logger.error(f"Database connection failed: {e} — waitlist features disabled")
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
