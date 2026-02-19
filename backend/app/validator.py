"""Deterministic policy validator — the core IP of AEGIS."""

from __future__ import annotations

from datetime import datetime, timezone

from .safe_reader import build_price_map


RULE_METADATA = {
    "allocation_cap": {
        "name": "Single-Token Concentration Cap",
        "description": "No single token should exceed a set percentage of total portfolio value.",
        "rationale": "Most treasury frameworks cap single-token allocation at 25-35% to prevent catastrophic loss from a single asset crash.",
    },
    "stablecoin_floor": {
        "name": "Stablecoin Minimum Floor",
        "description": "Stablecoins must represent at least a minimum percentage of the portfolio.",
        "rationale": "Maintaining 15-25% in stablecoins ensures 3-6 months of operating runway without forced liquidation during market downturns.",
    },
    "single_asset_cap": {
        "name": "Absolute Asset Value Cap",
        "description": "No single asset should exceed an absolute USD value threshold.",
        "rationale": "Absolute caps prevent over-exposure even when percentage-based rules pass. Limits maximum loss from a single token collapse.",
    },
    "max_tx_size": {
        "name": "Transaction Size Limit",
        "description": "No single transaction should exceed a USD value threshold.",
        "rationale": "Spending guardrails prevent unauthorized or accidental large transfers. Most treasuries set this at 5-15% of total holdings.",
    },
    "inactivity_alert": {
        "name": "Activity Monitor",
        "description": "The treasury must show transaction activity within a time window.",
        "rationale": "Inactive treasuries may indicate lost keys, abandoned governance, or compromised signers. 7 days balances operational cadence with security.",
    },
    "min_diversification": {
        "name": "Minimum Diversification",
        "description": "The portfolio must hold at least a minimum number of distinct tokens.",
        "rationale": "EU MiCA and MAS Singapore guidelines require diversified holdings to reduce systemic risk. Standard financial practice across all jurisdictions.",
    },
    "volatile_exposure": {
        "name": "Volatile Asset Exposure Cap",
        "description": "Non-stablecoin (volatile) assets cannot exceed a maximum percentage of the portfolio.",
        "rationale": "Limits exposure to market volatility. Aligned with EU AIFMD reserve frameworks and prudential requirements across European and Asian regulators.",
    },
    "min_treasury_value": {
        "name": "Minimum Treasury Threshold",
        "description": "Total portfolio value must remain above a minimum USD floor.",
        "rationale": "Ensures operational solvency. Basel III-inspired capital adequacy principles adopted by regulators including Japan FSA and Finansinspektionen (Sweden).",
    },
    "large_tx_ratio": {
        "name": "Relative Transaction Cap",
        "description": "No single transaction should exceed a percentage of total portfolio value.",
        "rationale": "AML/CFT compliance requires monitoring transactions relative to portfolio size. Required by FinCEN (US), FCA (UK), and FATF member regulators globally.",
    },
    "concentration_hhi": {
        "name": "Portfolio Concentration Index",
        "description": "The Herfindahl-Hirschman Index (HHI) of portfolio allocation must stay below a threshold.",
        "rationale": "HHI is the standard financial metric for measuring market/portfolio concentration. Used by SEC, European Commission, and BaFin for competitive and risk analysis.",
    },
}

RULE_RECOMMENDATIONS = {
    "allocation_cap": "Rebalance by swapping a portion of the over-concentrated token into stablecoins or diversified assets.",
    "stablecoin_floor": "Increase stablecoin holdings by converting a portion of volatile assets. Target USDC or DAI for maximum liquidity.",
    "single_asset_cap": "Reduce position size in the over-cap asset. Consider dollar-cost averaging out over multiple transactions.",
    "max_tx_size": "Break large transfers into smaller batches. Consider implementing a multi-sig spending limit policy.",
    "inactivity_alert": "Verify signer access and confirm the treasury is actively governed. Schedule regular rebalancing transactions.",
    "min_diversification": "Add new token positions to diversify the portfolio. Consider allocating to uncorrelated assets across DeFi, stablecoins, and L1 tokens.",
    "volatile_exposure": "Reduce volatile asset exposure by converting a portion into stablecoins. This improves resilience during market downturns.",
    "min_treasury_value": "Treasury value has fallen below the minimum threshold. Consider fundraising, reducing burn rate, or reallocating to higher-yield stablecoins.",
    "large_tx_ratio": "Recent transactions are disproportionately large relative to total holdings. Consider imposing tighter per-transaction limits or requiring multi-sig for large transfers.",
    "concentration_hhi": "Portfolio concentration is too high. Distribute holdings more evenly across multiple tokens to reduce the HHI score below the threshold.",
}


DEFAULT_RULES = [
    {"type": "allocation_cap", "params": {"max_percent": 30}, "severity": "breach"},
    {"type": "stablecoin_floor", "params": {"min_percent": 20}, "severity": "breach"},
    {"type": "single_asset_cap", "params": {"max_usd": 500000}, "severity": "warning"},
    {"type": "max_tx_size", "params": {"max_usd": 100000}, "severity": "warning"},
    {"type": "inactivity_alert", "params": {"threshold_hours": 168}, "severity": "warning"},
    {"type": "min_diversification", "params": {"min_tokens": 3}, "severity": "warning"},
    {"type": "volatile_exposure", "params": {"max_percent": 80}, "severity": "breach"},
    {"type": "min_treasury_value", "params": {"min_usd": 100000}, "severity": "warning"},
    {"type": "large_tx_ratio", "params": {"max_percent": 15}, "severity": "warning"},
    {"type": "concentration_hhi", "params": {"max_hhi": 3000}, "severity": "warning"},
]


def _enrich_result(result: dict) -> dict:
    """Add metadata (name, description, rationale) to a rule result."""
    meta = RULE_METADATA.get(result["rule"], {})
    result["name"] = meta.get("name", result["rule"])
    result["description"] = meta.get("description", "")
    result["rationale"] = meta.get("rationale", "")
    return result


def _generate_recommendation(result: dict) -> dict:
    """Generate a deterministic recommendation for a failed rule."""
    return {
        "rule": result["rule"],
        "action": RULE_RECOMMENDATIONS.get(result["rule"], "Review this rule's configuration and current portfolio state."),
        "severity": result["severity"],
    }


def validate_policy(balances: dict, rules: list[dict], transactions: list[dict] | None = None) -> dict:
    """Compare live Safe state against policy rules.

    Returns a compliance report with pass/fail per rule.
    """
    results = []

    for rule in rules:
        rule_type = rule["type"]
        params = rule.get("params", {})
        severity = rule.get("severity", "warning")

        if rule_type == "allocation_cap":
            results.extend(_check_allocation_cap(balances, params, severity))
        elif rule_type == "stablecoin_floor":
            results.append(_check_stablecoin_floor(balances, params, severity))
        elif rule_type == "single_asset_cap":
            results.append(_check_single_asset_cap(balances, params, severity))
        elif rule_type == "max_tx_size":
            results.append(_check_max_tx_size(transactions, balances, params, severity))
        elif rule_type == "inactivity_alert":
            results.append(_check_inactivity_alert(transactions, params, severity))
        elif rule_type == "min_diversification":
            results.append(_check_min_diversification(balances, params, severity))
        elif rule_type == "volatile_exposure":
            results.append(_check_volatile_exposure(balances, params, severity))
        elif rule_type == "min_treasury_value":
            results.append(_check_min_treasury_value(balances, params, severity))
        elif rule_type == "large_tx_ratio":
            results.append(_check_large_tx_ratio(transactions, balances, params, severity))
        elif rule_type == "concentration_hhi":
            results.append(_check_concentration_hhi(balances, params, severity))

    results = [_enrich_result(r) for r in results]
    recommendations = [_generate_recommendation(r) for r in results if not r["passed"]]

    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)

    return {
        "safe_address": balances["address"],
        "total_usd": balances["total_usd"],
        "overall_status": "COMPLIANT" if passed_count == total_count else "NON-COMPLIANT",
        "passed": passed_count,
        "failed": total_count - passed_count,
        "total_rules": total_count,
        "results": results,
        "recommendations": recommendations,
    }


def _check_allocation_cap(balances: dict, params: dict, severity: str) -> list[dict]:
    """Check that no single token exceeds max_percent of total portfolio."""
    max_pct = params.get("max_percent", 30)
    total = balances["total_usd"]
    results = []

    if total == 0:
        return [{
            "rule": "allocation_cap",
            "passed": True,
            "current_value": "0%",
            "threshold": f"{max_pct}%",
            "severity": severity,
            "detail": "Portfolio is empty",
        }]

    for token in balances["tokens"]:
        pct = (token["usd_value"] / total) * 100
        if pct > max_pct:
            results.append({
                "rule": "allocation_cap",
                "passed": False,
                "current_value": f"{pct:.1f}%",
                "threshold": f"{max_pct}%",
                "severity": severity,
                "detail": f"{token['symbol']} is {pct:.1f}% of portfolio (${token['usd_value']:,.0f}) — exceeds {max_pct}% cap",
            })

    if not results:
        results.append({
            "rule": "allocation_cap",
            "passed": True,
            "current_value": "all within cap",
            "threshold": f"{max_pct}%",
            "severity": severity,
            "detail": "No single token exceeds allocation cap",
        })

    return results


def _check_stablecoin_floor(balances: dict, params: dict, severity: str) -> dict:
    """Check that stablecoins are at least min_percent of portfolio."""
    min_pct = params.get("min_percent", 20)
    total = balances["total_usd"]

    if total == 0:
        return {
            "rule": "stablecoin_floor",
            "passed": True,
            "current_value": "0%",
            "threshold": f"{min_pct}%",
            "severity": severity,
            "detail": "Portfolio is empty",
        }

    stable_usd = sum(t["usd_value"] for t in balances["tokens"] if t["is_stablecoin"])
    stable_pct = (stable_usd / total) * 100

    return {
        "rule": "stablecoin_floor",
        "passed": stable_pct >= min_pct,
        "current_value": f"{stable_pct:.1f}%",
        "threshold": f"{min_pct}%",
        "severity": severity,
        "detail": f"Stablecoins: ${stable_usd:,.0f} ({stable_pct:.1f}% of portfolio)"
        + ("" if stable_pct >= min_pct else f" — below {min_pct}% floor"),
    }


def _check_single_asset_cap(balances: dict, params: dict, severity: str) -> dict:
    """Check that no single asset exceeds max_usd absolute value."""
    max_usd = params.get("max_usd", 500000)

    breaches = [t for t in balances["tokens"] if t["usd_value"] > max_usd]

    if breaches:
        detail = ", ".join(f"{t['symbol']}: ${t['usd_value']:,.0f}" for t in breaches)
        return {
            "rule": "single_asset_cap",
            "passed": False,
            "current_value": f"{len(breaches)} asset(s) over cap",
            "threshold": f"${max_usd:,.0f}",
            "severity": severity,
            "detail": f"Over cap: {detail}",
        }

    return {
        "rule": "single_asset_cap",
        "passed": True,
        "current_value": "all within cap",
        "threshold": f"${max_usd:,.0f}",
        "severity": severity,
        "detail": "No single asset exceeds absolute USD cap",
    }


def _check_max_tx_size(transactions: list[dict] | None, balances: dict, params: dict, severity: str) -> dict:
    """Check that no recent transaction exceeds max_usd threshold."""
    max_usd = params.get("max_usd", 100000)

    if transactions is None:
        return {
            "rule": "max_tx_size",
            "passed": True,
            "current_value": "N/A",
            "threshold": f"${max_usd:,.0f}",
            "severity": severity,
            "detail": "No transaction data available — skipped",
        }

    if not transactions:
        return {
            "rule": "max_tx_size",
            "passed": True,
            "current_value": "no recent transactions",
            "threshold": f"${max_usd:,.0f}",
            "severity": severity,
            "detail": "No executed transactions found",
        }

    prices = build_price_map(balances)

    breaches = []
    for tx in transactions:
        estimated_usd = _estimate_tx_usd(tx, balances, prices)
        if estimated_usd > max_usd:
            breaches.append({
                "tx_hash": tx["tx_hash"],
                "estimated_usd": estimated_usd,
                "date": tx["execution_date"],
            })

    if breaches:
        worst = max(breaches, key=lambda b: b["estimated_usd"])
        return {
            "rule": "max_tx_size",
            "passed": False,
            "current_value": f"${worst['estimated_usd']:,.0f}",
            "threshold": f"${max_usd:,.0f}",
            "severity": severity,
            "detail": f"{len(breaches)} transaction(s) exceed ${max_usd:,.0f} cap. "
                      f"Largest: ${worst['estimated_usd']:,.0f} on {worst['date']}",
        }

    return {
        "rule": "max_tx_size",
        "passed": True,
        "current_value": f"{len(transactions)} recent txs checked",
        "threshold": f"${max_usd:,.0f}",
        "severity": severity,
        "detail": f"All {len(transactions)} recent transactions within ${max_usd:,.0f} cap",
    }


def _check_inactivity_alert(transactions: list[dict] | None, params: dict, severity: str) -> dict:
    """Check that the Safe has had activity within threshold_hours."""
    threshold_hours = params.get("threshold_hours", 168)

    if transactions is None:
        return {
            "rule": "inactivity_alert",
            "passed": True,
            "current_value": "N/A",
            "threshold": f"{threshold_hours}h",
            "severity": severity,
            "detail": "No transaction data available — skipped",
        }

    if not transactions:
        return {
            "rule": "inactivity_alert",
            "passed": False,
            "current_value": "no transactions found",
            "threshold": f"{threshold_hours}h",
            "severity": severity,
            "detail": "No executed transactions found — Safe may be inactive or new",
        }

    # Find most recent execution date
    latest_date = None
    for tx in transactions:
        date_str = tx.get("execution_date")
        if date_str:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            if latest_date is None or dt > latest_date:
                latest_date = dt

    if latest_date is None:
        return {
            "rule": "inactivity_alert",
            "passed": False,
            "current_value": "unknown",
            "threshold": f"{threshold_hours}h",
            "severity": severity,
            "detail": "Could not determine last transaction date",
        }

    now = datetime.now(timezone.utc)
    hours_since = (now - latest_date).total_seconds() / 3600

    return {
        "rule": "inactivity_alert",
        "passed": hours_since <= threshold_hours,
        "current_value": f"{hours_since:.0f}h ago",
        "threshold": f"{threshold_hours}h",
        "severity": severity,
        "detail": f"Last transaction: {latest_date.strftime('%Y-%m-%d %H:%M UTC')} ({hours_since:.0f}h ago)"
        + ("" if hours_since <= threshold_hours else f" — exceeds {threshold_hours}h threshold"),
    }


def _check_min_diversification(balances: dict, params: dict, severity: str) -> dict:
    """Check that the portfolio holds at least min_tokens distinct tokens."""
    min_tokens = params.get("min_tokens", 3)
    # Count tokens with meaningful balance (> $100 to filter dust)
    meaningful = [t for t in balances["tokens"] if t["usd_value"] > 100 or t["balance"] > 0.01]
    count = len(meaningful)

    return {
        "rule": "min_diversification",
        "passed": count >= min_tokens,
        "current_value": f"{count} tokens",
        "threshold": f"{min_tokens} min",
        "severity": severity,
        "detail": f"Portfolio holds {count} distinct token(s)"
        + ("" if count >= min_tokens else f" — below {min_tokens} minimum for diversification"),
    }


def _check_volatile_exposure(balances: dict, params: dict, severity: str) -> dict:
    """Check that non-stablecoin assets don't exceed max_percent of portfolio."""
    max_pct = params.get("max_percent", 80)
    total = balances["total_usd"]

    if total == 0:
        return {
            "rule": "volatile_exposure",
            "passed": True,
            "current_value": "0%",
            "threshold": f"{max_pct}%",
            "severity": severity,
            "detail": "Portfolio is empty",
        }

    stable_usd = sum(t["usd_value"] for t in balances["tokens"] if t["is_stablecoin"])
    volatile_usd = total - stable_usd
    volatile_pct = (volatile_usd / total) * 100

    return {
        "rule": "volatile_exposure",
        "passed": volatile_pct <= max_pct,
        "current_value": f"{volatile_pct:.1f}%",
        "threshold": f"{max_pct}%",
        "severity": severity,
        "detail": f"Volatile assets: ${volatile_usd:,.0f} ({volatile_pct:.1f}% of portfolio)"
        + ("" if volatile_pct <= max_pct else f" — exceeds {max_pct}% cap"),
    }


def _check_min_treasury_value(balances: dict, params: dict, severity: str) -> dict:
    """Check that total portfolio value meets a minimum USD threshold."""
    min_usd = params.get("min_usd", 100000)
    total = balances["total_usd"]

    return {
        "rule": "min_treasury_value",
        "passed": total >= min_usd,
        "current_value": f"${total:,.0f}",
        "threshold": f"${min_usd:,.0f}",
        "severity": severity,
        "detail": f"Total portfolio value: ${total:,.0f}"
        + ("" if total >= min_usd else f" — below ${min_usd:,.0f} minimum threshold"),
    }


def _check_large_tx_ratio(
    transactions: list[dict] | None, balances: dict, params: dict, severity: str
) -> dict:
    """Check that no transaction exceeds max_percent of total portfolio value."""
    max_pct = params.get("max_percent", 15)
    total = balances["total_usd"]

    if transactions is None or total == 0:
        return {
            "rule": "large_tx_ratio",
            "passed": True,
            "current_value": "N/A",
            "threshold": f"{max_pct}%",
            "severity": severity,
            "detail": "No transaction data available — skipped",
        }

    if not transactions:
        return {
            "rule": "large_tx_ratio",
            "passed": True,
            "current_value": "no recent txs",
            "threshold": f"{max_pct}%",
            "severity": severity,
            "detail": "No executed transactions found",
        }

    prices = build_price_map(balances)
    max_usd = total * (max_pct / 100)

    breaches = []
    for tx in transactions:
        estimated = _estimate_tx_usd(tx, balances, prices)
        pct = (estimated / total) * 100 if total > 0 else 0
        if pct > max_pct:
            breaches.append({"pct": pct, "usd": estimated})

    if breaches:
        worst = max(breaches, key=lambda b: b["pct"])
        return {
            "rule": "large_tx_ratio",
            "passed": False,
            "current_value": f"{worst['pct']:.1f}%",
            "threshold": f"{max_pct}%",
            "severity": severity,
            "detail": f"{len(breaches)} transaction(s) exceed {max_pct}% of portfolio. "
                      f"Largest: {worst['pct']:.1f}% (${worst['usd']:,.0f})",
        }

    return {
        "rule": "large_tx_ratio",
        "passed": True,
        "current_value": f"{len(transactions)} txs checked",
        "threshold": f"{max_pct}%",
        "severity": severity,
        "detail": f"All {len(transactions)} recent transactions within {max_pct}% of portfolio",
    }


def _check_concentration_hhi(balances: dict, params: dict, severity: str) -> dict:
    """Check portfolio concentration using the Herfindahl-Hirschman Index.

    HHI = sum of (market_share_i)^2 for each token, scaled 0-10000.
    <1500 = diversified, 1500-2500 = moderate, >2500 = concentrated.
    """
    max_hhi = params.get("max_hhi", 3000)
    total = balances["total_usd"]

    if total == 0:
        return {
            "rule": "concentration_hhi",
            "passed": True,
            "current_value": "0",
            "threshold": f"{max_hhi}",
            "severity": severity,
            "detail": "Portfolio is empty",
        }

    hhi = 0.0
    for token in balances["tokens"]:
        share = (token["usd_value"] / total) * 100  # percentage
        hhi += share ** 2

    hhi = round(hhi)

    if hhi < 1500:
        label = "diversified"
    elif hhi < 2500:
        label = "moderate"
    else:
        label = "concentrated"

    return {
        "rule": "concentration_hhi",
        "passed": hhi <= max_hhi,
        "current_value": f"{hhi} ({label})",
        "threshold": f"{max_hhi}",
        "severity": severity,
        "detail": f"HHI score: {hhi} ({label})"
        + ("" if hhi <= max_hhi else f" — exceeds {max_hhi} threshold"),
    }


def _estimate_tx_usd(tx: dict, balances: dict, prices: dict) -> float:
    """Estimate USD value of a transaction using current token prices."""
    # Native ETH transfer
    if tx["value_wei"] > 0:
        eth_price = prices.get(None, 0)
        return tx["value_eth"] * eth_price

    # ERC-20 transfer
    if tx["token_address"] and tx["token_value_raw"]:
        token_addr = tx["token_address"].lower()
        decimals = 18
        for t in balances["tokens"]:
            if t["address"] and t["address"].lower() == token_addr:
                decimals = t.get("decimals", 18)
                break
        human_amount = tx["token_value_raw"] / (10 ** decimals)
        usd_per_unit = prices.get(token_addr, 0)
        return human_amount * usd_per_unit

    return 0.0
