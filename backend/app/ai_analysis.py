"""AI-powered treasury analysis using Anthropic Claude."""

from __future__ import annotations

import json
import logging
import os

import anthropic

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


def _build_prompt(balances: dict, report: dict) -> str:
    """Build the analysis prompt from treasury data and compliance report."""
    tokens_summary = []
    for t in balances["tokens"]:
        if t["usd_value"] > 0 or t["balance"] > 0:
            pct = (t["usd_value"] / balances["total_usd"] * 100) if balances["total_usd"] > 0 else 0
            label = f"- {t['symbol']}: {t['balance']:.4f} (${t['usd_value']:,.2f}, {pct:.1f}% of portfolio)"
            if t["is_stablecoin"]:
                label += " [stablecoin]"
            tokens_summary.append(label)

    rules_summary = []
    for r in report["results"]:
        status = "PASS" if r["passed"] else "FAIL"
        rules_summary.append(f"- [{status}] {r['rule']}: {r['detail']}")

    return f"""You are a treasury risk analyst for crypto-native organizations. Analyze this Safe wallet treasury and provide actionable insights.

## Treasury Data
- Safe Address: {balances['address']}
- Total Value: ${balances['total_usd']:,.2f}
- Number of tokens: {len(balances['tokens'])}

## Token Holdings
{chr(10).join(tokens_summary) if tokens_summary else "- No token data available"}

## Compliance Report
- Overall Status: {report['overall_status']}
- Rules Passed: {report['passed']}/{report['total_rules']}

{chr(10).join(rules_summary)}

## Instructions
Provide a JSON response with exactly these keys:
1. "summary": A 2-3 sentence plain-English summary of this treasury's risk posture. Be specific about what's good and what's concerning.
2. "risk_level": One of "low", "medium", "high" based on the overall picture.
3. "recommendations": An array of 2-4 specific, actionable recommendations. Each should be a string starting with an action verb. Prioritize the most impactful changes first. If compliant, suggest optimizations.
4. "stress_test": A brief analysis (2-3 sentences) of what would happen if ETH dropped 30% — would any rules be breached? What would the new allocations look like?
5. "benchmarks": 1-2 sentences comparing this treasury to typical crypto treasury best practices (e.g., "Similar-sized treasuries typically hold 20-30% stablecoins").
6. "suggested_rules": An array of 1-2 additional rules this treasury should consider that are NOT in the current policy. Each should be an object with "name" and "reason" keys.

Respond with ONLY valid JSON, no markdown formatting or code blocks."""


async def analyze_treasury(balances: dict, report: dict) -> dict | None:
    """Run AI analysis on treasury data. Returns analysis dict or None on failure."""
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — skipping AI analysis")
        return None

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = _build_prompt(balances, report)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text
        return json.loads(response_text)

    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        return None
    except json.JSONDecodeError:
        logger.error("Failed to parse AI response as JSON")
        return {
            "summary": response_text[:500] if "response_text" in dir() else "AI analysis unavailable.",
            "risk_level": "unknown",
            "recommendations": [],
            "stress_test": "",
            "benchmarks": "",
            "suggested_rules": [],
        }
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        return None
