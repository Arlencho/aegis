"""Deterministic policy validator — the core IP of AEGIS."""


def validate_policy(balances: dict, rules: list[dict]) -> dict:
    """Compare live Safe state against policy rules.

    Returns a compliance report with pass/fail per rule.
    """
    results = []
    total_usd = balances["total_usd"]

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
            # Transaction size is checked against recent txs, not balances
            # Placeholder — requires transaction history API
            results.append({
                "rule": "max_tx_size",
                "passed": True,
                "current_value": "N/A (requires tx history)",
                "threshold": f"${params.get('max_usd', 0):,.0f}",
                "severity": severity,
                "detail": "Transaction size monitoring not yet implemented — requires Safe tx history polling",
            })
        elif rule_type == "inactivity_alert":
            # Inactivity requires last tx timestamp
            # Placeholder — requires transaction history API
            results.append({
                "rule": "inactivity_alert",
                "passed": True,
                "current_value": "N/A (requires tx history)",
                "threshold": f"{params.get('threshold_hours', 0)}h",
                "severity": severity,
                "detail": "Inactivity monitoring not yet implemented — requires Safe tx history polling",
            })

    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)

    return {
        "safe_address": balances["address"],
        "total_usd": total_usd,
        "overall_status": "COMPLIANT" if passed_count == total_count else "NON-COMPLIANT",
        "passed": passed_count,
        "failed": total_count - passed_count,
        "total_rules": total_count,
        "results": results,
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

    breaches = [
        t for t in balances["tokens"] if t["usd_value"] > max_usd
    ]

    if breaches:
        detail = ", ".join(
            f"{t['symbol']}: ${t['usd_value']:,.0f}" for t in breaches
        )
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
