#!/usr/bin/env python3
"""AEGIS CLI — Validate a Gnosis Safe against a policy file.

Usage:
    python validate.py --safe 0x... --policy policy.yaml
"""

import argparse
import asyncio
import json
import sys

import yaml

from backend.app.safe_reader import fetch_safe_balances, fetch_safe_transactions
from backend.app.validator import validate_policy


async def main():
    parser = argparse.ArgumentParser(description="AEGIS Policy Validator")
    parser.add_argument("--safe", required=True, help="Gnosis Safe address (0x...)")
    parser.add_argument("--policy", required=True, help="Path to policy YAML file")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args = parser.parse_args()

    # Load policy
    with open(args.policy) as f:
        policy = yaml.safe_load(f)

    if "rules" not in policy:
        print("Error: Policy file must contain 'rules' key", file=sys.stderr)
        sys.exit(1)

    # Fetch balances
    print(f"Fetching balances for {args.safe}...", file=sys.stderr)
    balances = await fetch_safe_balances(args.safe)

    if balances is None:
        print(f"Error: Could not fetch balances for {args.safe}", file=sys.stderr)
        sys.exit(1)

    print(f"Portfolio: ${balances['total_usd']:,.2f} across {len(balances['tokens'])} tokens", file=sys.stderr)

    # Fetch transaction history
    print(f"Fetching transaction history...", file=sys.stderr)
    transactions = await fetch_safe_transactions(args.safe, limit=20)

    if transactions is None:
        print("Warning: Could not fetch transaction history. Some rules will be skipped.", file=sys.stderr)
    else:
        print(f"Transactions: {len(transactions)} recent executed transactions", file=sys.stderr)

    # Validate
    report = validate_policy(balances, policy["rules"], transactions=transactions)

    # Output
    indent = 2 if args.pretty else None
    print(json.dumps(report, indent=indent))

    # Exit code: 0 = compliant, 1 = violations found
    sys.exit(0 if report["overall_status"] == "COMPLIANT" else 1)


if __name__ == "__main__":
    asyncio.run(main())
