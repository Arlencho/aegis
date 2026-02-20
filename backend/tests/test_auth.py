"""Tests for AEGIS auth endpoints — signup, verify, forgot/reset password."""

from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock

import bcrypt
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app, _rate_buckets


@pytest_asyncio.fixture
async def client():
    """Async test client for the FastAPI app."""
    _rate_buckets.clear()  # Reset rate limiter between tests
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# --- Signup ---

@pytest.mark.asyncio
async def test_signup_success(client):
    mock_user = {"id": 1, "email": "test@example.com", "name": "Test", "plan": "free", "created_at": datetime.now(timezone.utc)}
    with patch("app.main.create_user", new_callable=AsyncMock, return_value=mock_user):
        resp = await client.post("/auth/signup", json={"email": "test@example.com", "password": "password123"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["plan"] == "free"


@pytest.mark.asyncio
async def test_signup_duplicate_email(client):
    with patch("app.main.create_user", new_callable=AsyncMock, return_value=None):
        resp = await client.post("/auth/signup", json={"email": "dup@example.com", "password": "password123"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_signup_short_password(client):
    resp = await client.post("/auth/signup", json={"email": "test@example.com", "password": "short"})
    assert resp.status_code == 400
    assert "8 characters" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_signup_invalid_email(client):
    resp = await client.post("/auth/signup", json={"email": "notanemail", "password": "password123"})
    assert resp.status_code == 400
    assert "Invalid email" in resp.json()["detail"]


# --- Verify ---

@pytest.mark.asyncio
async def test_verify_success(client):
    hashed = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()
    mock_user = {"id": 1, "email": "test@example.com", "name": "Test", "password_hash": hashed, "plan": "free"}
    with patch("app.main.get_user_by_email", new_callable=AsyncMock, return_value=mock_user):
        resp = await client.post("/auth/verify", json={"email": "test@example.com", "password": "password123"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_verify_wrong_password(client):
    hashed = bcrypt.hashpw(b"correctpassword", bcrypt.gensalt()).decode()
    mock_user = {"id": 1, "email": "test@example.com", "name": "Test", "password_hash": hashed, "plan": "free"}
    with patch("app.main.get_user_by_email", new_callable=AsyncMock, return_value=mock_user):
        resp = await client.post("/auth/verify", json={"email": "test@example.com", "password": "wrongpassword"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_verify_no_user(client):
    with patch("app.main.get_user_by_email", new_callable=AsyncMock, return_value=None):
        resp = await client.post("/auth/verify", json={"email": "nobody@example.com", "password": "password123"})
    assert resp.status_code == 401


# --- Forgot Password ---

@pytest.mark.asyncio
async def test_forgot_password_existing_email(client):
    mock_user = {"id": 1, "email": "test@example.com"}
    with patch("app.main.get_user_by_email", new_callable=AsyncMock, return_value=mock_user), \
         patch("app.main.create_reset_token", new_callable=AsyncMock, return_value=True), \
         patch("app.main.send_password_reset_email", new_callable=AsyncMock):
        resp = await client.post("/auth/forgot-password", json={"email": "test@example.com"})
    assert resp.status_code == 200
    assert "reset link" in resp.json()["message"].lower()


@pytest.mark.asyncio
async def test_forgot_password_nonexistent_email(client):
    """Should return the same success message even if email doesn't exist."""
    with patch("app.main.get_user_by_email", new_callable=AsyncMock, return_value=None):
        resp = await client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert resp.status_code == 200
    assert "reset link" in resp.json()["message"].lower()


# --- Reset Password ---

@pytest.mark.asyncio
async def test_reset_password_valid_token(client):
    mock_user = {"id": 1, "email": "test@example.com"}
    with patch("app.main.validate_reset_token", new_callable=AsyncMock, return_value=mock_user), \
         patch("app.main.update_user_password", new_callable=AsyncMock):
        resp = await client.post("/auth/reset-password", json={"token": "validtoken123", "password": "newpassword123"})
    assert resp.status_code == 200
    assert "updated" in resp.json()["message"].lower()


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client):
    with patch("app.main.validate_reset_token", new_callable=AsyncMock, return_value=None):
        resp = await client.post("/auth/reset-password", json={"token": "invalidtoken", "password": "newpassword123"})
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reset_password_short_password(client):
    resp = await client.post("/auth/reset-password", json={"token": "sometoken", "password": "short"})
    assert resp.status_code == 400
    assert "8 characters" in resp.json()["detail"]
