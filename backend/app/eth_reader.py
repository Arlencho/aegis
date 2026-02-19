"""Etherscan-based balance + transaction reader for regular ETH wallets (EOAs).

Fallback for addresses that aren't Gnosis Safe multisig wallets.
Returns the same dict shapes as safe_reader for validator compatibility.
"""

from __future__ import annotations

import asyncio
import logging
import os

import httpx

from .safe_reader import STABLECOINS, _fetch_eth_price

logger = logging.getLogger(__name__)

ETHERSCAN_API = "https://api.etherscan.io/v2/api"
ETHERSCAN_KEY = os.getenv("ETHERSCAN_API_KEY", "")

# Cap token discovery to prevent abuse on wallets with thousands of transfers
MAX_TOKENS = 20

# Etherscan free tier: 5 calls/sec. We add a small delay between calls.
ETHERSCAN_DELAY = 0.25


def _safe_int(value: str, default: int = 0) -> int:
    """Parse an int from Etherscan, returning default if the result is an error string."""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


async def fetch_eoa_balances(address: str) -> dict | None:
    """Fetch native ETH + ERC-20 token balances for a regular Ethereum address.

    Uses Etherscan API to discover tokens via recent transfers, then queries
    individual token balances. Returns same shape as safe_reader.fetch_safe_balances().
    """
    if not ETHERSCAN_KEY:
        logger.warning("ETHERSCAN_API_KEY not set — EOA reader disabled")
        return None

    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Get native ETH balance
        try:
            resp = await client.get(
                ETHERSCAN_API,
                params={
                    "chainid": "1",
                    "module": "account",
                    "action": "balance",
                    "address": address,
                    "tag": "latest",
                    "apikey": ETHERSCAN_KEY,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") != "1" and data.get("message") != "OK":
                if data.get("result") != "0":
                    logger.error(f"Etherscan balance error: {data.get('message')}")
                    return None
        except httpx.HTTPError as e:
            logger.error(f"Etherscan balance request failed: {e}")
            return None

        eth_balance_wei = _safe_int(data.get("result", "0"))
        eth_balance = eth_balance_wei / 1e18

        # 2. Fetch ETH price
        eth_price = await _fetch_eth_price(client)
        eth_usd = eth_balance * eth_price

        tokens = []
        total_usd = eth_usd

        # Add native ETH
        if eth_balance > 0:
            tokens.append({
                "symbol": "ETH",
                "balance": eth_balance,
                "usd_value": eth_usd,
                "is_stablecoin": False,
                "address": None,
                "decimals": 18,
            })

        # 3. Discover ERC-20 tokens via recent token transfers
        await asyncio.sleep(ETHERSCAN_DELAY)
        try:
            resp = await client.get(
                ETHERSCAN_API,
                params={
                    "chainid": "1",
                    "module": "account",
                    "action": "tokentx",
                    "address": address,
                    "page": "1",
                    "offset": "100",
                    "sort": "desc",
                    "apikey": ETHERSCAN_KEY,
                },
            )
            resp.raise_for_status()
            tx_data = resp.json()
        except httpx.HTTPError as e:
            logger.error(f"Etherscan tokentx request failed: {e}")
            tx_data = {"result": []}

        # Extract unique token contracts
        seen_contracts: dict[str, dict] = {}
        if isinstance(tx_data.get("result"), list):
            for tx in tx_data["result"]:
                contract = tx.get("contractAddress", "").lower()
                if contract and contract not in seen_contracts:
                    seen_contracts[contract] = {
                        "symbol": tx.get("tokenSymbol", "???"),
                        "decimals": _safe_int(tx.get("tokenDecimal", "18"), 18),
                    }
                if len(seen_contracts) >= MAX_TOKENS:
                    break

        # 4. Get balance for each discovered token (with rate limit delays)
        for contract, info in seen_contracts.items():
            await asyncio.sleep(ETHERSCAN_DELAY)
            try:
                resp = await client.get(
                    ETHERSCAN_API,
                    params={
                        "chainid": "1",
                        "module": "account",
                        "action": "tokenbalance",
                        "contractaddress": contract,
                        "address": address,
                        "tag": "latest",
                        "apikey": ETHERSCAN_KEY,
                    },
                )
                resp.raise_for_status()
                bal_data = resp.json()
            except httpx.HTTPError:
                continue

            # Handle rate limit or error responses gracefully
            raw_balance = _safe_int(bal_data.get("result", "0"))
            if raw_balance == 0:
                continue

            decimals = info["decimals"]
            balance = raw_balance / (10 ** decimals)
            is_stablecoin = contract in STABLECOINS

            if is_stablecoin:
                usd_value = balance
            else:
                usd_value = 0.0

            total_usd += usd_value

            tokens.append({
                "symbol": info["symbol"],
                "balance": balance,
                "usd_value": usd_value,
                "is_stablecoin": is_stablecoin,
                "address": contract,
                "decimals": decimals,
            })

    return {
        "address": address,
        "total_usd": total_usd,
        "eth_price": eth_price,
        "tokens": tokens,
    }


async def fetch_eoa_transactions(
    address: str, limit: int = 20
) -> list[dict] | None:
    """Fetch recent transactions for a regular Ethereum address.

    Returns same shape as safe_reader.fetch_safe_transactions().
    """
    if not ETHERSCAN_KEY:
        return None

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(
                ETHERSCAN_API,
                params={
                    "chainid": "1",
                    "module": "account",
                    "action": "txlist",
                    "address": address,
                    "page": "1",
                    "offset": str(limit),
                    "sort": "desc",
                    "apikey": ETHERSCAN_KEY,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError as e:
            logger.error(f"Etherscan txlist request failed: {e}")
            return None

    if not isinstance(data.get("result"), list):
        return None

    transactions = []
    for tx in data["result"]:
        value_wei = _safe_int(tx.get("value", "0"))

        # Map to safe_reader transaction shape
        transactions.append({
            "execution_date": tx.get("timeStamp"),
            "value_wei": value_wei,
            "value_eth": value_wei / 1e18,
            "to": tx.get("to"),
            "method": tx.get("functionName", "").split("(")[0] or None,
            "token_address": None,
            "token_value_raw": None,
            "is_executed": True,
            "tx_hash": tx.get("hash"),
        })

    return transactions
