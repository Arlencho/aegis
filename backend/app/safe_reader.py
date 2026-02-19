"""Safe wallet balance + transaction reader using Safe Transaction Service API."""

from __future__ import annotations

import httpx

SAFE_API = "https://safe-transaction-mainnet.safe.global/api/v1"
COINGECKO_API = "https://api.coingecko.com/api/v3"

# Common stablecoins by contract address (Ethereum mainnet, lowercase)
# These are priced at $1.00 per unit to avoid CoinGecko rate limits.
STABLECOINS = {
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
    "0x853d955acef822db058eb8505911ed77f175b99e": "FRAX",
    "0x5f98805a4e8be255a32880fdec7f6728c6568ba0": "LUSD",
    "0x4fabb145d64652a948d72533023f6e7a623c7c53": "BUSD",
    "0x8e870d67f660d95d5be530380d0ec0bd388289e1": "USDP",
    "0x056fd409e1d7a124bd7017459dfea2f387b6d5cd": "GUSD",
    "0x57ab1ec28d129707052df4df418d58a2d46d5f51": "sUSD",
    "0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3": "MIM",
}


async def _fetch_eth_price(client: httpx.AsyncClient) -> float:
    """Fetch current ETH/USD price from CoinGecko."""
    try:
        resp = await client.get(
            f"{COINGECKO_API}/simple/price",
            params={"ids": "ethereum", "vs_currencies": "usd"},
        )
        resp.raise_for_status()
        return resp.json()["ethereum"]["usd"]
    except (httpx.HTTPError, KeyError):
        return 0.0


async def fetch_safe_balances(safe_address: str) -> dict | None:
    """Fetch token balances and USD values for a Gnosis Safe address.

    Uses Safe Transaction Service for balances, CoinGecko for ETH price,
    and $1.00/unit for known stablecoins. Other tokens get $0 estimate.
    """
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        try:
            resp = await client.get(
                f"{SAFE_API}/safes/{safe_address}/balances/",
                params={"trusted": "true", "exclude_spam": "true"},
            )
            resp.raise_for_status()
        except httpx.HTTPError:
            return None

        raw_balances = resp.json()

        # Fetch ETH price for USD estimation
        eth_price = await _fetch_eth_price(client)

    tokens = []
    total_usd = 0.0

    for item in raw_balances:
        token_address = item.get("tokenAddress")
        token_info = item.get("token")

        symbol = "ETH"
        decimals = 18
        if token_info:
            symbol = token_info.get("symbol", "UNKNOWN")
            decimals = token_info.get("decimals", 18)

        balance_raw = int(item.get("balance", "0"))
        balance = balance_raw / (10**decimals)

        # Estimate USD value
        is_stablecoin = (
            token_address is not None
            and token_address.lower() in STABLECOINS
        )

        if token_address is None:
            # Native ETH
            usd_value = balance * eth_price
        elif is_stablecoin:
            # Known stablecoins at $1.00/unit
            usd_value = balance
        else:
            # Unknown tokens — $0 estimate (conservative)
            usd_value = 0.0

        total_usd += usd_value

        tokens.append({
            "symbol": symbol,
            "balance": balance,
            "usd_value": usd_value,
            "is_stablecoin": is_stablecoin,
            "address": token_address,
            "decimals": decimals,
        })

    return {
        "address": safe_address,
        "total_usd": total_usd,
        "eth_price": eth_price,
        "tokens": tokens,
    }


async def fetch_safe_transactions(safe_address: str, limit: int = 20) -> list[dict] | None:
    """Fetch recent executed multisig transactions for a Gnosis Safe.

    Returns a list of transaction dicts with execution_date, value, method,
    token details, and tx_hash. Only includes executed transactions.
    """
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        try:
            resp = await client.get(
                f"{SAFE_API}/safes/{safe_address}/multisig-transactions/",
                params={"limit": limit, "executed": "true", "ordering": "-executionDate"},
            )
            resp.raise_for_status()
        except httpx.HTTPError:
            return None

        data = resp.json()

    transactions = []
    for tx in data.get("results", []):
        if not tx.get("isExecuted"):
            continue

        value_wei = int(tx.get("value", "0"))
        data_decoded = tx.get("dataDecoded")

        method = None
        token_address = None
        token_value_raw = None

        if data_decoded:
            method = data_decoded.get("method")
            if method == "transfer" and data_decoded.get("parameters"):
                token_address = tx.get("to")
                for param in data_decoded["parameters"]:
                    if param["name"] == "value":
                        token_value_raw = int(param["value"])

        transactions.append({
            "execution_date": tx.get("executionDate"),
            "value_wei": value_wei,
            "value_eth": value_wei / 1e18,
            "to": tx.get("to"),
            "method": method,
            "token_address": token_address,
            "token_value_raw": token_value_raw,
            "is_executed": True,
            "tx_hash": tx.get("transactionHash"),
        })

    return transactions


def build_price_map(balances: dict) -> dict:
    """Build a {token_address_lower: usd_per_unit} map from balance data.

    Uses None key for native ETH price.
    """
    prices = {}
    for token in balances["tokens"]:
        addr = token["address"]
        key = addr.lower() if addr else None
        if token["balance"] > 0:
            prices[key] = token["usd_value"] / token["balance"]
    return prices
