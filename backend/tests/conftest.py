"""Shared fixtures for AEGIS backend tests."""

from datetime import datetime, timezone, timedelta

import pytest


@pytest.fixture
def compliant_balances():
    """A well-diversified portfolio that passes all default rules."""
    return {
        "address": "0x" + "a" * 40,
        "total_usd": 1_000_000,
        "eth_price": 2500.0,
        "tokens": [
            {"symbol": "ETH", "balance": 100, "usd_value": 250_000, "is_stablecoin": False, "address": None, "decimals": 18},
            {"symbol": "USDC", "balance": 250_000, "usd_value": 250_000, "is_stablecoin": True, "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "decimals": 6},
            {"symbol": "USDT", "balance": 250_000, "usd_value": 250_000, "is_stablecoin": True, "address": "0xdac17f958d2ee523a2206206994597c13d831ec7", "decimals": 6},
            {"symbol": "WBTC", "balance": 3.5, "usd_value": 250_000, "is_stablecoin": False, "address": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", "decimals": 8},
        ],
    }


@pytest.fixture
def concentrated_balances():
    """A single-token portfolio that fails allocation, stablecoin, and diversification rules."""
    return {
        "address": "0x" + "b" * 40,
        "total_usd": 500_000,
        "eth_price": 2500.0,
        "tokens": [
            {"symbol": "ETH", "balance": 200, "usd_value": 500_000, "is_stablecoin": False, "address": None, "decimals": 18},
        ],
    }


@pytest.fixture
def empty_balances():
    """An empty portfolio with $0."""
    return {
        "address": "0x" + "c" * 40,
        "total_usd": 0,
        "eth_price": 2500.0,
        "tokens": [],
    }


@pytest.fixture
def small_balances():
    """A portfolio below the minimum treasury value threshold."""
    return {
        "address": "0x" + "d" * 40,
        "total_usd": 50_000,
        "eth_price": 2500.0,
        "tokens": [
            {"symbol": "USDC", "balance": 30_000, "usd_value": 30_000, "is_stablecoin": True, "address": "0xa0b8", "decimals": 6},
            {"symbol": "ETH", "balance": 8, "usd_value": 20_000, "is_stablecoin": False, "address": None, "decimals": 18},
        ],
    }


@pytest.fixture
def recent_transactions():
    """Transactions within the last 24 hours, all small."""
    now = datetime.now(timezone.utc)
    return [
        {
            "execution_date": now.isoformat(),
            "value_wei": 1_000_000_000_000_000_000,  # 1 ETH
            "value_eth": 1.0,
            "to": "0x" + "e" * 40,
            "method": "transfer",
            "token_address": None,
            "token_value_raw": None,
            "is_executed": True,
            "tx_hash": "0x" + "f" * 64,
        },
    ]


@pytest.fixture
def stale_transactions():
    """Transactions older than 7 days."""
    old = datetime.now(timezone.utc) - timedelta(hours=240)
    return [
        {
            "execution_date": old.isoformat(),
            "value_wei": 1_000_000_000_000_000_000,
            "value_eth": 1.0,
            "to": "0x" + "e" * 40,
            "method": "transfer",
            "token_address": None,
            "token_value_raw": None,
            "is_executed": True,
            "tx_hash": "0x" + "f" * 64,
        },
    ]


@pytest.fixture
def large_transactions(compliant_balances):
    """A transaction that exceeds $100K (40 ETH at $2500 = $100K)."""
    now = datetime.now(timezone.utc)
    return [
        {
            "execution_date": now.isoformat(),
            "value_wei": 40_000_000_000_000_000_000,  # 40 ETH
            "value_eth": 40.0,
            "to": "0x" + "e" * 40,
            "method": "transfer",
            "token_address": None,
            "token_value_raw": None,
            "is_executed": True,
            "tx_hash": "0x" + "f" * 64,
        },
    ]
