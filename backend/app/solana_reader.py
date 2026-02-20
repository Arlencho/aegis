"""Solana wallet balance + transaction reader using JSON-RPC via httpx."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

SOLANA_RPC = os.getenv(
    "SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"
)
COINGECKO_API = "https://api.coingecko.com/api/v3"

# SPL Token Program ID
TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

# Known Solana stablecoin mints (mainnet)
SOLANA_STABLECOINS = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
}


async def _rpc_call(
    client: httpx.AsyncClient, method: str, params: list
) -> dict | None:
    """Make a Solana JSON-RPC call."""
    try:
        resp = await client.post(
            SOLANA_RPC,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        )
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            logger.error(f"Solana RPC error ({method}): {data['error']}")
            return None
        return data.get("result")
    except httpx.HTTPError as e:
        logger.error(f"Solana RPC request failed ({method}): {e}")
        return None


async def _fetch_sol_price(client: httpx.AsyncClient) -> float:
    """Fetch current SOL/USD price from CoinGecko."""
    try:
        resp = await client.get(
            f"{COINGECKO_API}/simple/price",
            params={"ids": "solana", "vs_currencies": "usd"},
        )
        resp.raise_for_status()
        return resp.json()["solana"]["usd"]
    except (httpx.HTTPError, KeyError):
        return 0.0


async def _fetch_spl_token_prices(
    mint_addresses: list[str], client: httpx.AsyncClient
) -> dict[str, float]:
    """Batch-fetch USD prices for SPL tokens from CoinGecko.

    Returns {mint_address: usd_price}. Free tier, no key needed.
    """
    if not mint_addresses:
        return {}
    csv = ",".join(mint_addresses)
    try:
        resp = await client.get(
            f"{COINGECKO_API}/simple/token_price/solana",
            params={"contract_addresses": csv, "vs_currencies": "usd"},
        )
        resp.raise_for_status()
        data = resp.json()
        return {addr: info["usd"] for addr, info in data.items() if "usd" in info}
    except Exception as e:
        logger.warning(f"CoinGecko SPL token price fetch failed: {e}")
        return {}


async def fetch_solana_balances(address: str) -> dict | None:
    """Fetch SOL + all SPL token balances for a Solana wallet.

    Returns the same dict shape as safe_reader.fetch_safe_balances().
    """
    async with httpx.AsyncClient(timeout=30) as client:
        # Native SOL balance
        sol_result = await _rpc_call(client, "getBalance", [address])
        if sol_result is None:
            return None

        sol_lamports = sol_result.get("value", 0)
        sol_balance = sol_lamports / 1e9

        # SOL price
        sol_price = await _fetch_sol_price(client)

        # All SPL token accounts
        token_result = await _rpc_call(
            client,
            "getTokenAccountsByOwner",
            [
                address,
                {"programId": TOKEN_PROGRAM_ID},
                {"encoding": "jsonParsed"},
            ],
        )

        tokens = []
        total_usd = 0.0

        # Native SOL
        sol_usd = sol_balance * sol_price
        total_usd += sol_usd
        tokens.append(
            {
                "symbol": "SOL",
                "balance": sol_balance,
                "usd_value": sol_usd,
                "is_stablecoin": False,
                "address": None,
                "decimals": 9,
            }
        )

        # SPL tokens
        non_stable_mints = []
        if token_result and "value" in token_result:
            for account in token_result["value"]:
                parsed = (
                    account.get("account", {}).get("data", {}).get("parsed", {})
                )
                info = parsed.get("info", {})
                mint = info.get("mint", "")
                token_amount = info.get("tokenAmount", {})

                decimals = token_amount.get("decimals", 0)
                ui_amount = token_amount.get("uiAmount")
                if ui_amount is None or ui_amount == 0:
                    continue

                balance = float(ui_amount)
                is_stablecoin = mint in SOLANA_STABLECOINS
                symbol = SOLANA_STABLECOINS.get(mint, mint[:6] + "...")

                if is_stablecoin:
                    usd_value = balance
                else:
                    usd_value = 0.0
                    non_stable_mints.append(mint)

                total_usd += usd_value

                tokens.append(
                    {
                        "symbol": symbol,
                        "balance": balance,
                        "usd_value": usd_value,
                        "is_stablecoin": is_stablecoin,
                        "address": mint,
                        "decimals": decimals,
                    }
                )

        # Batch-fetch prices for non-stablecoin SPL tokens
        if non_stable_mints:
            spl_prices = await _fetch_spl_token_prices(non_stable_mints, client)
            for token in tokens:
                mint_addr = token.get("address")
                if mint_addr and not token["is_stablecoin"] and mint_addr in spl_prices:
                    token["usd_value"] = token["balance"] * spl_prices[mint_addr]
                    total_usd += token["usd_value"]

    return {
        "address": address,
        "total_usd": total_usd,
        "eth_price": sol_price,  # reuse field name for validator compatibility
        "tokens": tokens,
    }


async def fetch_solana_transactions(
    address: str, limit: int = 10
) -> list[dict] | None:
    """Fetch recent transactions for a Solana address.

    Returns list matching safe_reader.fetch_safe_transactions() shape.
    Uses getSignaturesForAddress only (avoids per-tx RPC calls to stay
    within public RPC rate limits).
    """
    async with httpx.AsyncClient(timeout=30) as client:
        sigs_result = await _rpc_call(
            client,
            "getSignaturesForAddress",
            [address, {"limit": limit}],
        )
        if sigs_result is None:
            return None

    transactions = []
    for sig_info in sigs_result:
        block_time = sig_info.get("blockTime")
        execution_date = None
        if block_time:
            execution_date = datetime.fromtimestamp(
                block_time, tz=timezone.utc
            ).isoformat()

        transactions.append(
            {
                "execution_date": execution_date,
                "value_wei": 0,
                "value_eth": 0.0,
                "to": None,
                "method": None,
                "token_address": None,
                "token_value_raw": None,
                "is_executed": True,
                "tx_hash": sig_info.get("signature"),
            }
        )

    return transactions
