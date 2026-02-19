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
}

RULE_RECOMMENDATIONS = {
    "allocation_cap": "Rebalance by swapping a portion of the over-concentrated token into stablecoins or diversified assets.",
    "stablecoin_floor": "Increase stablecoin holdings by converting a portion of volatile assets. Target USDC or DAI for maximum liquidity.",
    "single_asset_cap": "Reduce position size in the over-cap asset. Consider dollar-cost averaging out over multiple transactions.",
    "max_tx_size": "Break large transfers into smaller batches. Consider implementing a multi-sig spending limit policy.",
    "inactivity_alert": "Verify signer access and confirm the treasury is actively governed. Schedule regular rebalancing transactions.",
}


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
