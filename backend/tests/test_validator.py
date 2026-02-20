"""Tests for the AEGIS policy validator — all 10 treasury rules."""

from app.validator import validate_policy, DEFAULT_RULES


# --- allocation_cap ---

def test_allocation_cap_pass(compliant_balances):
    """Balanced portfolio: each token is 25% — passes 30% cap."""
    report = validate_policy(compliant_balances, [{"type": "allocation_cap", "params": {"max_percent": 30}, "severity": "breach"}])
    assert report["overall_status"] == "COMPLIANT"


def test_allocation_cap_fail(concentrated_balances):
    """Single token at 100% — fails 30% cap."""
    report = validate_policy(concentrated_balances, [{"type": "allocation_cap", "params": {"max_percent": 30}, "severity": "breach"}])
    assert report["overall_status"] == "NON-COMPLIANT"
    assert any(not r["passed"] for r in report["results"])


def test_allocation_cap_empty(empty_balances):
    """Empty portfolio passes allocation cap."""
    report = validate_policy(empty_balances, [{"type": "allocation_cap", "params": {"max_percent": 30}, "severity": "breach"}])
    assert report["overall_status"] == "COMPLIANT"


# --- stablecoin_floor ---

def test_stablecoin_floor_pass(compliant_balances):
    """50% stablecoins — passes 20% floor."""
    report = validate_policy(compliant_balances, [{"type": "stablecoin_floor", "params": {"min_percent": 20}, "severity": "breach"}])
    assert report["overall_status"] == "COMPLIANT"


def test_stablecoin_floor_fail(concentrated_balances):
    """0% stablecoins — fails 20% floor."""
    report = validate_policy(concentrated_balances, [{"type": "stablecoin_floor", "params": {"min_percent": 20}, "severity": "breach"}])
    assert report["overall_status"] == "NON-COMPLIANT"


# --- single_asset_cap ---

def test_single_asset_cap_pass(compliant_balances):
    """All tokens at $250K — passes $500K cap."""
    report = validate_policy(compliant_balances, [{"type": "single_asset_cap", "params": {"max_usd": 500000}, "severity": "warning"}])
    assert report["overall_status"] == "COMPLIANT"


def test_single_asset_cap_fail(concentrated_balances):
    """Single token at $500K — fails $400K cap."""
    report = validate_policy(concentrated_balances, [{"type": "single_asset_cap", "params": {"max_usd": 400000}, "severity": "warning"}])
    assert report["overall_status"] == "NON-COMPLIANT"


# --- max_tx_size ---

def test_max_tx_size_pass(compliant_balances, recent_transactions):
    """1 ETH tx ($2,500) — passes $100K cap."""
    report = validate_policy(
        compliant_balances,
        [{"type": "max_tx_size", "params": {"max_usd": 100000}, "severity": "warning"}],
        transactions=recent_transactions,
    )
    assert report["overall_status"] == "COMPLIANT"


def test_max_tx_size_fail(compliant_balances, large_transactions):
    """40 ETH tx ($100K) — fails $50K cap."""
    report = validate_policy(
        compliant_balances,
        [{"type": "max_tx_size", "params": {"max_usd": 50000}, "severity": "warning"}],
        transactions=large_transactions,
    )
    assert report["overall_status"] == "NON-COMPLIANT"


def test_max_tx_size_no_transactions(compliant_balances):
    """No transaction data — passes (skipped)."""
    report = validate_policy(
        compliant_balances,
        [{"type": "max_tx_size", "params": {"max_usd": 100000}, "severity": "warning"}],
        transactions=None,
    )
    assert report["overall_status"] == "COMPLIANT"


# --- inactivity_alert ---

def test_inactivity_pass(compliant_balances, recent_transactions):
    """Recent transaction within 168h — passes."""
    report = validate_policy(
        compliant_balances,
        [{"type": "inactivity_alert", "params": {"threshold_hours": 168}, "severity": "warning"}],
        transactions=recent_transactions,
    )
    assert report["overall_status"] == "COMPLIANT"


def test_inactivity_fail(compliant_balances, stale_transactions):
    """Transaction 240h ago — fails 168h threshold."""
    report = validate_policy(
        compliant_balances,
        [{"type": "inactivity_alert", "params": {"threshold_hours": 168}, "severity": "warning"}],
        transactions=stale_transactions,
    )
    assert report["overall_status"] == "NON-COMPLIANT"


def test_inactivity_no_transactions(compliant_balances):
    """Empty transaction list — fails."""
    report = validate_policy(
        compliant_balances,
        [{"type": "inactivity_alert", "params": {"threshold_hours": 168}, "severity": "warning"}],
        transactions=[],
    )
    assert report["overall_status"] == "NON-COMPLIANT"


# --- min_diversification ---

def test_diversification_pass(compliant_balances):
    """4 tokens — passes minimum of 3."""
    report = validate_policy(compliant_balances, [{"type": "min_diversification", "params": {"min_tokens": 3}, "severity": "warning"}])
    assert report["overall_status"] == "COMPLIANT"


def test_diversification_fail(concentrated_balances):
    """1 token — fails minimum of 3."""
    report = validate_policy(concentrated_balances, [{"type": "min_diversification", "params": {"min_tokens": 3}, "severity": "warning"}])
    assert report["overall_status"] == "NON-COMPLIANT"


# --- volatile_exposure ---

def test_volatile_exposure_pass(compliant_balances):
    """50% volatile — passes 80% cap."""
    report = validate_policy(compliant_balances, [{"type": "volatile_exposure", "params": {"max_percent": 80}, "severity": "breach"}])
    assert report["overall_status"] == "COMPLIANT"


def test_volatile_exposure_fail(concentrated_balances):
    """100% volatile — fails 80% cap."""
    report = validate_policy(concentrated_balances, [{"type": "volatile_exposure", "params": {"max_percent": 80}, "severity": "breach"}])
    assert report["overall_status"] == "NON-COMPLIANT"


# --- min_treasury_value ---

def test_min_treasury_pass(compliant_balances):
    """$1M portfolio — passes $100K minimum."""
    report = validate_policy(compliant_balances, [{"type": "min_treasury_value", "params": {"min_usd": 100000}, "severity": "warning"}])
    assert report["overall_status"] == "COMPLIANT"


def test_min_treasury_fail(small_balances):
    """$50K portfolio — fails $100K minimum."""
    report = validate_policy(small_balances, [{"type": "min_treasury_value", "params": {"min_usd": 100000}, "severity": "warning"}])
    assert report["overall_status"] == "NON-COMPLIANT"


# --- large_tx_ratio ---

def test_large_tx_ratio_pass(compliant_balances, recent_transactions):
    """1 ETH ($2,500) vs $1M portfolio = 0.25% — passes 15% cap."""
    report = validate_policy(
        compliant_balances,
        [{"type": "large_tx_ratio", "params": {"max_percent": 15}, "severity": "warning"}],
        transactions=recent_transactions,
    )
    assert report["overall_status"] == "COMPLIANT"


def test_large_tx_ratio_fail(compliant_balances, large_transactions):
    """40 ETH ($100K) vs $1M portfolio = 10% — fails 5% cap."""
    report = validate_policy(
        compliant_balances,
        [{"type": "large_tx_ratio", "params": {"max_percent": 5}, "severity": "warning"}],
        transactions=large_transactions,
    )
    assert report["overall_status"] == "NON-COMPLIANT"


# --- concentration_hhi ---

def test_hhi_pass(compliant_balances):
    """4 tokens at 25% each: HHI = 4 * 625 = 2500 — passes 3000."""
    report = validate_policy(compliant_balances, [{"type": "concentration_hhi", "params": {"max_hhi": 3000}, "severity": "warning"}])
    assert report["overall_status"] == "COMPLIANT"


def test_hhi_fail(concentrated_balances):
    """1 token at 100%: HHI = 10000 — fails 3000."""
    report = validate_policy(concentrated_balances, [{"type": "concentration_hhi", "params": {"max_hhi": 3000}, "severity": "warning"}])
    assert report["overall_status"] == "NON-COMPLIANT"
    result = [r for r in report["results"] if r["rule"] == "concentration_hhi"][0]
    assert "concentrated" in result["current_value"]


# --- Full report structure ---

def test_full_report_structure(compliant_balances, recent_transactions):
    """Validate the report dict shape with all default rules."""
    report = validate_policy(compliant_balances, DEFAULT_RULES, transactions=recent_transactions)

    assert "safe_address" in report
    assert "total_usd" in report
    assert "overall_status" in report
    assert report["overall_status"] in ("COMPLIANT", "NON-COMPLIANT")
    assert "passed" in report
    assert "failed" in report
    assert "total_rules" in report
    assert "results" in report
    assert "recommendations" in report
    assert isinstance(report["results"], list)
    assert isinstance(report["recommendations"], list)
    assert report["passed"] + report["failed"] == report["total_rules"]

    # Each result should have enriched metadata
    for r in report["results"]:
        assert "rule" in r
        assert "passed" in r
        assert "name" in r
        assert "description" in r
        assert "rationale" in r
        assert "severity" in r


def test_empty_portfolio_handles_gracefully(empty_balances):
    """Empty portfolio should not crash on any rule."""
    report = validate_policy(empty_balances, DEFAULT_RULES, transactions=[])
    assert report["total_rules"] > 0
    assert isinstance(report["results"], list)


def test_recommendations_only_for_failures(concentrated_balances, recent_transactions):
    """Recommendations should only be generated for failed rules."""
    report = validate_policy(concentrated_balances, DEFAULT_RULES, transactions=recent_transactions)
    failed_rules = {r["rule"] for r in report["results"] if not r["passed"]}
    rec_rules = {r["rule"] for r in report["recommendations"]}
    assert rec_rules.issubset(failed_rules)
