"""Gnosis Safe balance reader using Safe Transaction Service API + CoinGecko pricing."""

import httpx

SAFE_API = "https://safe-transaction-mainnet.safe.global/api/v1"
COINGECKO_API = "https://api.coingecko.com/api/v3"

# Common stablecoins by contract address (Ethereum mainnet)
STABLECOINS = {
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
}


async def fetch_safe_balances(safe_address: str) -> dict | None:
    """Fetch token balances and USD values for a Gnosis Safe address.

    Returns:
        {
            "address": "0x...",
            "total_usd": 1234567.89,
            "tokens": [
                {"symbol": "ETH", "balance": 100.5, "usd_value": 350000.0, "is_stablecoin": False, "address": None},
                ...
            ]
        }
    """
    async with httpx.AsyncClient(timeout=30) as client:
        # Fetch balances from Safe API
        try:
            resp = await client.get(f"{SAFE_API}/safes/{safe_address}/balances/usd/")
            resp.raise_for_status()
        except httpx.HTTPError:
            return None

        raw_balances = resp.json()

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

        # Calculate balance from raw wei value
        balance_raw = int(item.get("balance", "0"))
        balance = balance_raw / (10**decimals)

        # USD value from Safe API
        usd_value = float(item.get("fiatBalance", "0"))
        total_usd += usd_value

        is_stablecoin = (
            token_address is not None
            and token_address.lower() in STABLECOINS
        )

        tokens.append({
            "symbol": symbol,
            "balance": balance,
            "usd_value": usd_value,
            "is_stablecoin": is_stablecoin,
            "address": token_address,
        })

    return {
        "address": safe_address,
        "total_usd": total_usd,
        "tokens": tokens,
    }
