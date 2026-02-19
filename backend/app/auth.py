"""JWT verification for NextAuth.js v5 tokens + FastAPI dependencies."""

from __future__ import annotations

import os
import logging

import jwt
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "")


def _decode_jwt(token: str) -> dict:
    """Decode and verify a NextAuth.js v5 JWT token."""
    if not NEXTAUTH_SECRET:
        raise HTTPException(status_code=500, detail="Auth not configured")
    try:
        # NextAuth v5 uses a derived key for JWE/JWS.  When using the "jwt"
        # strategy with the default configuration the session token is a
        # *JWE* (encrypted JWT).  However, when the frontend explicitly sends
        # a plain JWT (signed with HS256) via the Authorization header we can
        # decode it directly.  We try HS256 first; if that fails we surface
        # the error.
        payload = jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT decode failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency — requires a valid Bearer token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    return _decode_jwt(token)


async def get_optional_user(request: Request) -> dict | None:
    """FastAPI dependency — returns user dict or None if not authenticated."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        return _decode_jwt(token)
    except HTTPException:
        return None
