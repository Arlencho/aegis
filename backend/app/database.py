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
            # --- Users table ---
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id              SERIAL PRIMARY KEY,
                    email           TEXT NOT NULL UNIQUE,
                    name            TEXT,
                    password_hash   TEXT,
                    provider        TEXT NOT NULL DEFAULT 'credentials',
                    plan            TEXT NOT NULL DEFAULT 'free',
                    stripe_customer_id TEXT,
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)
            """)
            # --- Organizations table ---
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS organizations (
                    id              SERIAL PRIMARY KEY,
                    name            TEXT NOT NULL,
                    plan            TEXT NOT NULL DEFAULT 'pro',
                    stripe_customer_id TEXT,
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            # --- Org members (join table) ---
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS org_members (
                    id              SERIAL PRIMARY KEY,
                    org_id          INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role            TEXT NOT NULL DEFAULT 'viewer',
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (org_id, user_id)
                )
            """)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members (user_id)
            """)
            # --- Clients table (end-clients / treasuries) ---
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS clients (
                    id              SERIAL PRIMARY KEY,
                    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
                    org_id          INT REFERENCES organizations(id) ON DELETE CASCADE,
                    name            TEXT NOT NULL,
                    description     TEXT,
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_clients_user ON clients (user_id)
            """)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_clients_org ON clients (org_id)
            """)
            # --- Wallets table (belong to clients) ---
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS wallets (
                    id              SERIAL PRIMARY KEY,
                    client_id       INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                    address         TEXT NOT NULL,
                    chain           TEXT NOT NULL DEFAULT 'ethereum',
                    label           TEXT,
                    last_audit_at   TIMESTAMPTZ,
                    last_risk_level TEXT,
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (client_id, address, chain)
                )
            """)
            # Ensure client_id column exists (for tables created before client model)
            try:
                await conn.execute("""
                    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS client_id INT REFERENCES clients(id) ON DELETE CASCADE
                """)
            except Exception:
                pass
            try:
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_wallets_client ON wallets (client_id)
                """)
            except Exception:
                pass
            # --- Schedule columns on wallets ---
            try:
                await conn.execute("""
                    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS schedule_frequency TEXT
                """)
                await conn.execute("""
                    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS schedule_include_ai BOOLEAN NOT NULL DEFAULT FALSE
                """)
                await conn.execute("""
                    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS next_audit_at TIMESTAMPTZ
                """)
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_wallets_next_audit
                        ON wallets (next_audit_at) WHERE next_audit_at IS NOT NULL
                """)
            except Exception:
                pass
            # --- Trigger column on audit_history ---
            try:
                await conn.execute("""
                    ALTER TABLE audit_history ADD COLUMN IF NOT EXISTS trigger TEXT NOT NULL DEFAULT 'manual'
                """)
            except Exception:
                pass
            # Add optional user_id and client_id to audit_history
            try:
                await conn.execute("""
                    ALTER TABLE audit_history
                        ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL
                """)
                await conn.execute("""
                    ALTER TABLE audit_history
                        ADD COLUMN IF NOT EXISTS client_id INT REFERENCES clients(id) ON DELETE SET NULL
                """)
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_audit_history_user
                        ON audit_history (user_id, created_at DESC)
                """)
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_audit_history_client
                        ON audit_history (client_id, created_at DESC)
                """)
            except Exception:
                pass  # Columns may already exist

            # --- Notifications table ---
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id          SERIAL PRIMARY KEY,
                    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type        TEXT NOT NULL DEFAULT 'audit_alert',
                    title       TEXT NOT NULL,
                    body        TEXT NOT NULL,
                    severity    TEXT NOT NULL DEFAULT 'info',
                    wallet_id   INT REFERENCES wallets(id) ON DELETE SET NULL,
                    audit_id    INT REFERENCES audit_history(id) ON DELETE SET NULL,
                    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_notifications_user
                    ON notifications (user_id, is_read, created_at DESC)
            """)

            # --- Webhook columns on clients ---
            try:
                await conn.execute("""
                    ALTER TABLE clients ADD COLUMN IF NOT EXISTS webhook_url TEXT
                """)
                await conn.execute("""
                    ALTER TABLE clients ADD COLUMN IF NOT EXISTS webhook_secret TEXT
                """)
            except Exception:
                pass

            # --- Share token on audit_history ---
            try:
                await conn.execute("""
                    ALTER TABLE audit_history ADD COLUMN IF NOT EXISTS share_token TEXT
                """)
                await conn.execute("""
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_history_share_token
                        ON audit_history (share_token) WHERE share_token IS NOT NULL
                """)
            except Exception:
                pass

            # --- Migration: move old wallets (user_id-based) to client model ---
            # Check if the old wallets table has a user_id column
            has_user_id_col = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'wallets' AND column_name = 'user_id'
                )
            """)
            if has_user_id_col:
                # Migrate: for each user that has wallets with user_id, create a
                # default client and move their wallets over
                old_wallets = await conn.fetch("""
                    SELECT DISTINCT user_id FROM wallets WHERE user_id IS NOT NULL
                """)
                for row in old_wallets:
                    uid = row["user_id"]
                    # Create a default client for this user if they don't have one
                    existing_client = await conn.fetchval(
                        "SELECT id FROM clients WHERE user_id = $1 LIMIT 1", uid
                    )
                    if existing_client is None:
                        existing_client = await conn.fetchval(
                            """INSERT INTO clients (user_id, name)
                               VALUES ($1, 'My Treasury')
                               RETURNING id""",
                            uid,
                        )
                    # Move wallets to the client
                    await conn.execute(
                        """UPDATE wallets SET client_id = $1 WHERE user_id = $2 AND client_id IS NULL""",
                        existing_client, uid,
                    )
                # After migration, we can drop the user_id column from wallets
                # But we do it carefully — only if client_id column exists and all rows migrated
                all_migrated = await conn.fetchval(
                    "SELECT NOT EXISTS (SELECT 1 FROM wallets WHERE client_id IS NULL)"
                )
                if all_migrated:
                    try:
                        await conn.execute("ALTER TABLE wallets DROP COLUMN IF EXISTS user_id")
                        # Drop the old unique constraint if it exists
                        await conn.execute("DROP INDEX IF EXISTS idx_wallets_user")
                    except Exception:
                        pass

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


# --- User Management ---


async def create_user(
    email: str, name: str | None, password_hash: str | None, provider: str = "credentials"
) -> dict | None:
    """Create a new user and a default client. Returns user dict or None if DB unavailable."""
    if not _pool:
        return None
    try:
        async with _pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """INSERT INTO users (email, name, password_hash, provider)
                       VALUES ($1, $2, $3, $4)
                       RETURNING id, email, name, provider, plan, created_at""",
                    email.lower().strip(),
                    name,
                    password_hash,
                    provider,
                )
                if row is None:
                    return None
                user = dict(row)
                # Create a default client for the new user
                await conn.execute(
                    """INSERT INTO clients (user_id, name)
                       VALUES ($1, 'My Treasury')""",
                    user["id"],
                )
                return user
    except asyncpg.UniqueViolationError:
        return None
    except Exception as e:
        logger.error(f"User creation failed: {e}")
        return None


async def get_user_by_email(email: str) -> dict | None:
    """Fetch user by email. Returns full user dict including password_hash."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, email, name, password_hash, provider, plan,
                      stripe_customer_id, created_at, updated_at
                 FROM users WHERE email = $1""",
            email.lower().strip(),
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"User lookup failed: {e}")
        return None


async def update_user_name(user_id: int, name: str) -> None:
    """Update a user's display name."""
    if not _pool:
        return
    try:
        await _pool.execute(
            "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2",
            name, user_id,
        )
    except Exception as e:
        logger.error(f"User name update failed: {e}")


async def get_user_by_id(user_id: int) -> dict | None:
    """Fetch user by ID. Returns user dict without password_hash."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, email, name, provider, plan,
                      stripe_customer_id, created_at, updated_at
                 FROM users WHERE id = $1""",
            user_id,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"User lookup failed: {e}")
        return None


# --- Organization Management ---


async def create_organization(name: str, owner_user_id: int) -> dict | None:
    """Create a new organization and add the user as owner."""
    if not _pool:
        return None
    try:
        async with _pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """INSERT INTO organizations (name)
                       VALUES ($1)
                       RETURNING id, name, plan, stripe_customer_id, created_at""",
                    name,
                )
                if row is None:
                    return None
                org = dict(row)
                await conn.execute(
                    """INSERT INTO org_members (org_id, user_id, role)
                       VALUES ($1, $2, 'owner')""",
                    org["id"], owner_user_id,
                )
                return org
    except Exception as e:
        logger.error(f"Org creation failed: {e}")
        return None


async def get_user_orgs(user_id: int) -> list[dict]:
    """List all organizations the user belongs to."""
    if not _pool:
        return []
    try:
        rows = await _pool.fetch(
            """SELECT o.id, o.name, o.plan, o.created_at, om.role
                 FROM organizations o
                 JOIN org_members om ON o.id = om.org_id
                WHERE om.user_id = $1
                ORDER BY o.created_at DESC""",
            user_id,
        )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"User orgs fetch failed: {e}")
        return []


async def get_org(org_id: int) -> dict | None:
    """Get a single organization by ID."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, name, plan, stripe_customer_id, created_at, updated_at
                 FROM organizations WHERE id = $1""",
            org_id,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Org fetch failed: {e}")
        return None


async def get_org_member(org_id: int, user_id: int) -> dict | None:
    """Check if a user is a member of an org and return their role."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, org_id, user_id, role, created_at
                 FROM org_members WHERE org_id = $1 AND user_id = $2""",
            org_id, user_id,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Org member check failed: {e}")
        return None


async def get_org_members(org_id: int) -> list[dict]:
    """List all members of an organization."""
    if not _pool:
        return []
    try:
        rows = await _pool.fetch(
            """SELECT om.id, om.user_id, om.role, om.created_at,
                      u.email, u.name
                 FROM org_members om
                 JOIN users u ON u.id = om.user_id
                WHERE om.org_id = $1
                ORDER BY om.created_at""",
            org_id,
        )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Org members fetch failed: {e}")
        return []


async def add_org_member(org_id: int, user_id: int, role: str = "viewer") -> dict | None:
    """Add a user to an organization."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """INSERT INTO org_members (org_id, user_id, role)
               VALUES ($1, $2, $3)
               RETURNING id, org_id, user_id, role, created_at""",
            org_id, user_id, role,
        )
        return dict(row) if row else None
    except asyncpg.UniqueViolationError:
        return None
    except Exception as e:
        logger.error(f"Add org member failed: {e}")
        return None


async def remove_org_member(org_id: int, user_id: int) -> bool:
    """Remove a user from an organization."""
    if not _pool:
        return False
    try:
        result = await _pool.execute(
            "DELETE FROM org_members WHERE org_id = $1 AND user_id = $2",
            org_id, user_id,
        )
        return result == "DELETE 1"
    except Exception as e:
        logger.error(f"Remove org member failed: {e}")
        return False


# --- Client Management ---


async def create_client(
    user_id: int | None, org_id: int | None, name: str, description: str | None = None
) -> dict | None:
    """Create a new client (treasury/end-client)."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """INSERT INTO clients (user_id, org_id, name, description)
               VALUES ($1, $2, $3, $4)
               RETURNING id, user_id, org_id, name, description, created_at""",
            user_id, org_id, name, description,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Client creation failed: {e}")
        return None


async def get_clients(user_id: int, org_id: int | None = None) -> list[dict]:
    """List clients accessible to a user (personal + org clients)."""
    if not _pool:
        return []
    try:
        risk_subquery = """(SELECT CASE MAX(
                    CASE w2.last_risk_level
                        WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
                    END)
                    WHEN 3 THEN 'high' WHEN 2 THEN 'medium' WHEN 1 THEN 'low' ELSE NULL
                END FROM wallets w2 WHERE w2.client_id = c.id) as aggregate_risk_level"""
        if org_id:
            # Get clients for a specific org
            rows = await _pool.fetch(
                f"""SELECT c.id, c.user_id, c.org_id, c.name, c.description, c.created_at,
                          (SELECT COUNT(*) FROM wallets w WHERE w.client_id = c.id) as wallet_count,
                          {risk_subquery}
                     FROM clients c
                    WHERE c.org_id = $1
                    ORDER BY c.created_at DESC""",
                org_id,
            )
        else:
            # Get personal clients + clients from all user's orgs
            rows = await _pool.fetch(
                f"""SELECT c.id, c.user_id, c.org_id, c.name, c.description, c.created_at,
                          (SELECT COUNT(*) FROM wallets w WHERE w.client_id = c.id) as wallet_count,
                          {risk_subquery}
                     FROM clients c
                    WHERE c.user_id = $1
                       OR c.org_id IN (SELECT org_id FROM org_members WHERE user_id = $1)
                    ORDER BY c.created_at DESC""",
                user_id,
            )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Client list failed: {e}")
        return []


async def get_client(client_id: int) -> dict | None:
    """Get a single client by ID."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, user_id, org_id, name, description,
                      webhook_url, webhook_secret,
                      created_at, updated_at
                 FROM clients WHERE id = $1""",
            client_id,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Client fetch failed: {e}")
        return None


async def update_client(
    client_id: int, name: str, description: str | None = None,
    webhook_url: str | None = None, webhook_secret: str | None = None,
) -> dict | None:
    """Update a client's name, description, and webhook settings."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """UPDATE clients
               SET name = $2, description = $3,
                   webhook_url = $4, webhook_secret = $5,
                   updated_at = NOW()
               WHERE id = $1
               RETURNING id, user_id, org_id, name, description,
                         webhook_url, webhook_secret,
                         created_at, updated_at""",
            client_id, name, description, webhook_url, webhook_secret,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Client update failed: {e}")
        return None


async def delete_client(client_id: int) -> bool:
    """Delete a client and all its wallets (CASCADE)."""
    if not _pool:
        return False
    try:
        result = await _pool.execute("DELETE FROM clients WHERE id = $1", client_id)
        return result == "DELETE 1"
    except Exception as e:
        logger.error(f"Client delete failed: {e}")
        return False


async def user_can_access_client(user_id: int, client_id: int) -> bool:
    """Check if a user can access a client (owns it or is in the client's org)."""
    if not _pool:
        return False
    try:
        result = await _pool.fetchval(
            """SELECT EXISTS (
                SELECT 1 FROM clients c
                WHERE c.id = $2
                  AND (c.user_id = $1
                       OR c.org_id IN (SELECT org_id FROM org_members WHERE user_id = $1))
            )""",
            user_id, client_id,
        )
        return bool(result)
    except Exception as e:
        logger.error(f"Client access check failed: {e}")
        return False


async def get_client_for_wallet(wallet_id: int) -> dict | None:
    """Get the client (with webhook fields) that owns a given wallet."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT c.id, c.user_id, c.org_id, c.name, c.description,
                      c.webhook_url, c.webhook_secret
                 FROM clients c
                 JOIN wallets w ON w.client_id = c.id
                WHERE w.id = $1""",
            wallet_id,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Client-for-wallet lookup failed: {e}")
        return None


SCHEDULE_INTERVALS = {
    "daily": "1 day",
    "weekly": "7 days",
    "monthly": "30 days",
}

# --- Wallet Management ---


async def create_wallet(
    client_id: int, address: str, chain: str, label: str | None = None
) -> dict | None:
    """Save a wallet for a client. Returns wallet dict or None."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """INSERT INTO wallets (client_id, address, chain, label)
               VALUES ($1, $2, $3, $4)
               RETURNING id, client_id, address, chain, label, last_audit_at, last_risk_level,
                              schedule_frequency, schedule_include_ai, next_audit_at, created_at""",
            client_id,
            _normalize_address(address, chain),
            chain,
            label,
        )
        return dict(row) if row else None
    except asyncpg.UniqueViolationError:
        return None
    except Exception as e:
        logger.error(f"Wallet creation failed: {e}")
        return None


async def get_wallets(client_id: int) -> list[dict]:
    """List all wallets for a client."""
    if not _pool:
        return []
    try:
        rows = await _pool.fetch(
            """SELECT id, client_id, address, chain, label, last_audit_at, last_risk_level,
                      schedule_frequency, schedule_include_ai, next_audit_at, created_at
                 FROM wallets WHERE client_id = $1
                 ORDER BY created_at DESC""",
            client_id,
        )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Wallet list failed: {e}")
        return []


async def get_wallets_for_user(user_id: int) -> list[dict]:
    """List all wallets across all clients accessible to a user."""
    if not _pool:
        return []
    try:
        rows = await _pool.fetch(
            """SELECT w.id, w.client_id, w.address, w.chain, w.label,
                      w.last_audit_at, w.last_risk_level,
                      w.schedule_frequency, w.schedule_include_ai, w.next_audit_at,
                      w.created_at, c.name as client_name
                 FROM wallets w
                 JOIN clients c ON c.id = w.client_id
                WHERE c.user_id = $1
                   OR c.org_id IN (SELECT org_id FROM org_members WHERE user_id = $1)
                ORDER BY w.created_at DESC""",
            user_id,
        )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"User wallets list failed: {e}")
        return []


async def get_wallet(wallet_id: int) -> dict | None:
    """Get a single wallet by ID."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, client_id, address, chain, label, last_audit_at, last_risk_level,
                      schedule_frequency, schedule_include_ai, next_audit_at, created_at
                 FROM wallets WHERE id = $1""",
            wallet_id,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Wallet fetch failed: {e}")
        return None


async def update_wallet(wallet_id: int, label: str) -> dict | None:
    """Update wallet label. Returns updated wallet or None."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """UPDATE wallets SET label = $2
               WHERE id = $1
               RETURNING id, client_id, address, chain, label, last_audit_at, last_risk_level,
                              schedule_frequency, schedule_include_ai, next_audit_at, created_at""",
            wallet_id, label,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Wallet update failed: {e}")
        return None


async def delete_wallet(wallet_id: int) -> bool:
    """Delete a wallet. Returns True if deleted."""
    if not _pool:
        return False
    try:
        result = await _pool.execute(
            "DELETE FROM wallets WHERE id = $1", wallet_id
        )
        return result == "DELETE 1"
    except Exception as e:
        logger.error(f"Wallet delete failed: {e}")
        return False


async def update_wallet_audit(wallet_id: int, risk_level: str | None) -> None:
    """Update a wallet's last_audit_at and risk_level after an audit."""
    if not _pool:
        return
    try:
        await _pool.execute(
            """UPDATE wallets SET last_audit_at = NOW(), last_risk_level = $2
               WHERE id = $1""",
            wallet_id,
            risk_level,
        )
    except Exception as e:
        logger.error(f"Wallet audit update failed: {e}")


# --- Wallet Schedule Management ---


async def update_wallet_schedule(
    wallet_id: int, frequency: str | None, include_ai: bool = False
) -> dict | None:
    """Set or clear a wallet's audit schedule."""
    if not _pool:
        return None
    try:
        if frequency and frequency in SCHEDULE_INTERVALS:
            interval = SCHEDULE_INTERVALS[frequency]
            row = await _pool.fetchrow(
                f"""UPDATE wallets
                    SET schedule_frequency = $2,
                        schedule_include_ai = $3,
                        next_audit_at = NOW() + INTERVAL '{interval}'
                    WHERE id = $1
                    RETURNING id, client_id, address, chain, label, last_audit_at, last_risk_level,
                              schedule_frequency, schedule_include_ai, next_audit_at, created_at""",
                wallet_id, frequency, include_ai,
            )
        else:
            row = await _pool.fetchrow(
                """UPDATE wallets
                   SET schedule_frequency = NULL,
                       schedule_include_ai = FALSE,
                       next_audit_at = NULL
                   WHERE id = $1
                   RETURNING id, client_id, address, chain, label, last_audit_at, last_risk_level,
                             schedule_frequency, schedule_include_ai, next_audit_at, created_at""",
                wallet_id,
            )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Wallet schedule update failed: {e}")
        return None


async def get_wallets_due_for_audit() -> list[dict]:
    """Get wallets whose scheduled audit is overdue (next_audit_at <= NOW())."""
    if not _pool:
        return []
    try:
        rows = await _pool.fetch(
            """SELECT id, client_id, address, chain, label,
                      schedule_frequency, schedule_include_ai, next_audit_at
                 FROM wallets
                WHERE schedule_frequency IS NOT NULL
                  AND next_audit_at IS NOT NULL
                  AND next_audit_at <= NOW()
                ORDER BY next_audit_at ASC
                LIMIT 10"""
        )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Due wallets query failed: {e}")
        return []


async def advance_wallet_schedule(
    wallet_id: int, frequency: str, risk_level: str | None
) -> None:
    """Bump next_audit_at forward after a scheduled audit completes."""
    if not _pool:
        return
    interval = SCHEDULE_INTERVALS.get(frequency, "1 day")
    try:
        await _pool.execute(
            f"""UPDATE wallets
                SET next_audit_at = NOW() + INTERVAL '{interval}',
                    last_audit_at = NOW(),
                    last_risk_level = $2
                WHERE id = $1""",
            wallet_id, risk_level,
        )
    except Exception as e:
        logger.error(f"Advance schedule failed: {e}")


# --- Notifications ---


async def create_notification(
    user_id: int, ntype: str, title: str, body: str,
    severity: str = "info", wallet_id: int | None = None, audit_id: int | None = None,
) -> dict | None:
    """Insert a single notification for a user."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """INSERT INTO notifications (user_id, type, title, body, severity, wallet_id, audit_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING id, user_id, type, title, body, severity, wallet_id, audit_id, is_read, created_at""",
            user_id, ntype, title, body, severity, wallet_id, audit_id,
        )
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Notification creation failed: {e}")
        return None


async def create_notifications_for_wallet(
    wallet_id: int, ntype: str, title: str, body: str,
    severity: str = "info", audit_id: int | None = None,
) -> int:
    """Create notifications for all users who can access a wallet's client. Returns count created."""
    if not _pool:
        return 0
    try:
        async with _pool.acquire() as conn:
            # Resolve all users who should be notified
            rows = await conn.fetch(
                """SELECT DISTINCT COALESCE(om.user_id, c.user_id) AS uid
                     FROM wallets w
                     JOIN clients c ON c.id = w.client_id
                     LEFT JOIN org_members om ON om.org_id = c.org_id
                    WHERE w.id = $1
                      AND COALESCE(om.user_id, c.user_id) IS NOT NULL""",
                wallet_id,
            )
            count = 0
            for row in rows:
                uid = row["uid"]
                await conn.execute(
                    """INSERT INTO notifications (user_id, type, title, body, severity, wallet_id, audit_id)
                       VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                    uid, ntype, title, body, severity, wallet_id, audit_id,
                )
                count += 1
            return count
    except Exception as e:
        logger.error(f"Wallet notification fan-out failed: {e}")
        return 0


async def get_notifications(
    user_id: int, unread_only: bool = False, limit: int = 50,
) -> list[dict]:
    """List notifications for a user, newest first."""
    if not _pool:
        return []
    try:
        if unread_only:
            rows = await _pool.fetch(
                """SELECT id, type, title, body, severity, wallet_id, audit_id, is_read, created_at
                     FROM notifications
                    WHERE user_id = $1 AND is_read = FALSE
                    ORDER BY created_at DESC
                    LIMIT $2""",
                user_id, limit,
            )
        else:
            rows = await _pool.fetch(
                """SELECT id, type, title, body, severity, wallet_id, audit_id, is_read, created_at
                     FROM notifications
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT $2""",
                user_id, limit,
            )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Notifications fetch failed: {e}")
        return []


async def get_unread_count(user_id: int) -> int:
    """Return the number of unread notifications for a user."""
    if not _pool:
        return 0
    try:
        return await _pool.fetchval(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
            user_id,
        )
    except Exception as e:
        logger.error(f"Unread count failed: {e}")
        return 0


async def mark_notifications_read(
    user_id: int, notification_ids: list[int] | None = None,
) -> int:
    """Mark notifications as read. If no IDs given, marks all unread for the user."""
    if not _pool:
        return 0
    try:
        if notification_ids:
            result = await _pool.execute(
                """UPDATE notifications SET is_read = TRUE
                   WHERE user_id = $1 AND id = ANY($2::int[]) AND is_read = FALSE""",
                user_id, notification_ids,
            )
        else:
            result = await _pool.execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
                user_id,
            )
        # result is like "UPDATE 3"
        return int(result.split()[-1]) if result else 0
    except Exception as e:
        logger.error(f"Mark notifications read failed: {e}")
        return 0


# --- Dashboard Stats ---


async def get_dashboard_stats(user_id: int) -> dict:
    """Return aggregate dashboard stats for a user across all their clients."""
    if not _pool:
        return {"wallet_count": 0, "audit_count": 0, "latest_risk": None, "wallets": [], "client_count": 0}
    try:
        # Get all clients accessible to this user
        clients = await get_clients(user_id)
        client_ids = [c["id"] for c in clients]

        # Wallet count + data
        wallets = await get_wallets_for_user(user_id)

        # Total audit count across user's wallets
        audit_count = 0
        if wallets:
            addresses = [w["address"] for w in wallets]
            audit_count = await _pool.fetchval(
                """SELECT COUNT(*) FROM audit_history
                   WHERE wallet_address = ANY($1::text[])""",
                addresses,
            )

        # Latest risk level from most recent audit across all wallets
        latest_risk = None
        if wallets:
            addresses = [w["address"] for w in wallets]
            latest_risk = await _pool.fetchval(
                """SELECT risk_level FROM audit_history
                   WHERE wallet_address = ANY($1::text[])
                     AND risk_level IS NOT NULL
                   ORDER BY created_at DESC LIMIT 1""",
                addresses,
            )

        return {
            "wallet_count": len(wallets),
            "audit_count": audit_count or 0,
            "latest_risk": latest_risk,
            "wallets": wallets,
            "client_count": len(client_ids),
        }
    except Exception as e:
        logger.error(f"Dashboard stats failed: {e}")
        return {"wallet_count": 0, "audit_count": 0, "latest_risk": None, "wallets": [], "client_count": 0}


# --- Waitlist ---


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


def _normalize_address(address: str, chain: str) -> str:
    """Normalize wallet address — preserve case for Solana (base58), lowercase for EVM."""
    if chain == "solana":
        return address.strip()
    return address.lower().strip()


async def save_audit(
    wallet_address: str, chain: str, report: dict,
    client_id: int | None = None, trigger: str = "manual",
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
                    passed, failed, total_rules, risk_level, report_json, client_id, trigger)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
               RETURNING id""",
            _normalize_address(wallet_address, chain),
            chain,
            report.get("total_usd", 0),
            report.get("overall_status", "UNKNOWN"),
            report.get("passed", 0),
            report.get("failed", 0),
            report.get("total_rules", 0),
            risk_level,
            json.dumps(report),
            client_id,
            trigger,
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
            wallet_address.strip(),
            limit,
        )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Audit history fetch failed: {e}")
        return []


async def get_audit_history_by_client(client_id: int, limit: int = 50) -> list[dict]:
    """Return recent audits for a client (without full report JSON)."""
    if not _pool:
        return []
    try:
        rows = await _pool.fetch(
            """SELECT id, wallet_address, chain, total_usd, overall_status,
                      passed, failed, total_rules, risk_level, trigger, created_at
                 FROM audit_history
                WHERE client_id = $1
                ORDER BY created_at DESC
                LIMIT $2""",
            client_id,
            limit,
        )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Client audit history fetch failed: {e}")
        return []


async def get_audit_detail(audit_id: int) -> dict | None:
    """Return a single audit with full report JSON."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, wallet_address, chain, total_usd, overall_status,
                      passed, failed, total_rules, risk_level,
                      report_json, created_at, user_id, client_id, share_token
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


# --- Share Token Management ---


async def set_share_token(audit_id: int, token: str) -> bool:
    """Set a share token on an audit. Returns True on success."""
    if not _pool:
        return False
    try:
        result = await _pool.execute(
            "UPDATE audit_history SET share_token = $2 WHERE id = $1",
            audit_id, token,
        )
        return result == "UPDATE 1"
    except Exception as e:
        logger.error(f"Set share token failed: {e}")
        return False


async def clear_share_token(audit_id: int) -> bool:
    """Remove a share token from an audit. Returns True on success."""
    if not _pool:
        return False
    try:
        result = await _pool.execute(
            "UPDATE audit_history SET share_token = NULL WHERE id = $1",
            audit_id,
        )
        return result == "UPDATE 1"
    except Exception as e:
        logger.error(f"Clear share token failed: {e}")
        return False


async def get_audit_by_share_token(token: str) -> dict | None:
    """Fetch an audit by its share token (public access — no user/client IDs returned)."""
    if not _pool:
        return None
    try:
        row = await _pool.fetchrow(
            """SELECT id, wallet_address, chain, total_usd, overall_status,
                      passed, failed, total_rules, risk_level,
                      report_json, created_at
                 FROM audit_history
                WHERE share_token = $1""",
            token,
        )
        if row is None:
            return None
        result = dict(row)
        if isinstance(result.get("report_json"), str):
            result["report_json"] = json.loads(result["report_json"])
        return result
    except Exception as e:
        logger.error(f"Share token lookup failed: {e}")
        return None
