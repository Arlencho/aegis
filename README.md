# AEGIS

**Automated Governance Infrastructure for Digital Treasuries**

Deterministic policy enforcement for DAO treasuries. Monitors Gnosis Safe wallets against your own governance rules and alerts you the moment you're out of compliance.

---

## The Problem

DAO treasuries and crypto-native funds managing $250k-$10M in digital assets have no deterministic governance layer. Policy lives in Discord threads and Notion docs. Execution happens via human signers who are slow, inconsistent, and error-prone. Governance failures at Rook, Mango, and similar protocols have made treasurers acutely aware of this gap.

## The Solution

A policy YAML file with 5 rule types. A validator that reads a Safe wallet address, checks current state against policy, and outputs a compliance report with pass/fail per rule. Telegram/email alerts when a rule is breached. Advisory mode only — zero autonomous execution in V1.

## Target Customer

Treasury manager or core contributor at a DAO or crypto-native fund. Treasury size: $250k-$10M. Already using Gnosis Safe. Already thinking about risk limits.

## Revenue Model

Flat monthly SaaS subscription per treasury:
- **Advisor** ($500/month) — read-only policy monitoring and alerts
- **Executor** ($2,000/month) — advisory + simulation-first autonomous execution
- **Institution** ($5,000/month) — multi-chain, custom policy schema, priority support

---

## Tech Stack

- **Backend**: Python (FastAPI) deployed on Railway
- **Wallet Data**: Safe Transaction Service API
- **Pricing**: CoinGecko free API
- **Alerts**: Telegram Bot API + SendGrid
- **Frontend**: Next.js on Vercel (demo page)
- **Payments**: Stripe

## MVP Features

1. **Policy Loader** — YAML file with 5 rule types (allocation %, stablecoin floor %, single asset cap %, max tx size, inactivity threshold)
2. **Safe Wallet Reader** — fetches token balances from Gnosis Safe on Ethereum mainnet
3. **Deterministic Validator** — compares live state to policy rules, outputs JSON compliance report
4. **Alert Dispatcher** — Telegram + email alerts on rule breaches
5. **Hosted Demo** — web form where prospects paste a Safe address + policy YAML and get a live report

## What NOT to Build (Week 1)

- Autonomous execution or transaction signing
- Multi-chain support
- Custom policy schema builder / drag-and-drop UI
- Admin dashboard
- Audit log export
- Mobile app
- Team access controls

---

## 7-Day Execution Plan

### Day 1 — Build Core Validator
Build and locally test the policy validator. Write YAML schema for 5 rule types. Build Safe API reader + deterministic comparator. Test against 3 real public DAO Safe addresses.

**Done when:** `python validate.py --safe 0x... --policy policy.yaml` outputs correct compliance reports against 2+ real Safe addresses.

### Day 2 — Deploy + Demo Page
Wire Telegram alerts and SendGrid email. Deploy FastAPI to Railway. Build minimal Next.js demo page on Vercel. End-to-end in a browser.

**Done when:** Browser form produces compliance report + Telegram alert within 30 seconds.

### Day 3 — Outreach Launch
Record 4-min Loom demo. Write one-page PDF. Draft 15 personalized cold DMs. Send first 5.

**Done when:** 5 DMs sent to named individuals at real DAO treasuries. 1+ reply or view.

### Day 4 — GO/NO-GO Checkpoint
Review outreach responses. If engaged: book calls. If zero engagement: pivot to governance forum posts.

**Done when:** 1 call booked OR 3 forum responses OR kill decision after 20 outreach attempts.

> **Go/No-Go:** If 20 targeted messages sent with zero replies, zero Loom views, and zero bookings — the distribution assumption is broken. Spend day 5 finding one warm intro. If no warm intro in 24 hours, kill or reframe as consulting first.

### Day 5 — Discovery Call
Don't pitch — ask about their treasury pain. Live demo against their actual Safe. Ask: "Would you pay $500/month?"

**Done when:** Prospect's answer to $500/month question recorded verbatim.

### Day 6 — Close or Pivot
Soft yes → send Stripe payment link. Post Loom publicly on Twitter/X with governance gap thread.

**Done when:** Payment link sent OR payment received. Twitter thread posted.

### Day 7 — Signal Collection + Decision
Document all signals. Write honest post-mortem. Decide: continue / pivot / kill.

**Done when:** Signal doc complete. Go/kill/pivot decision written with reasoning.

---

## Kill Criteria

| Trigger | Action |
|---------|--------|
| 20 outreach messages by day 4, zero replies, zero Loom views | Kill outreach approach. Pursue warm intro. If none in 24h, kill sprint. |
| 5 calls completed, all say <$200/month or free only | Kill pricing model. Move upmarket or pivot to B2B2B white-label. |
| Prospect needs legal review for autonomous actions | Kill execution feature. Relaunch as advisory-only compliance dashboard. |
| Day 7: zero payments, zero Stripe clicks | Kill sprint. Compile objections, rewrite ICP and pitch before next sprint. |

---

## Customer Playbook

**Pitch:** Most DAO treasuries have a risk policy written somewhere that nobody is actually enforcing in real time. Aegis monitors your Gnosis Safe continuously against your own policy rules and alerts you the moment you're out of compliance — no autonomous execution, just the enforcement layer your policy never had.

**Channels:**
1. Twitter/X DMs — practitioners who tweeted about DAO treasury/multisig/Safe wallet in last 30 days
2. DAO governance forums — Compound, Uniswap, Index Coop, Gitcoin, Bankless DAO
3. Telegram groups — DeFi treasury/ops groups, warm intros

**Demand Signal:** Prospect books a call AND shares their Safe address for a live demo. Anything less is noise.

---

## Project Structure

```
aegis/
  backend/           # FastAPI service
    app/
      main.py        # API entry point
      validator.py   # Policy validation engine
      safe_reader.py # Gnosis Safe API client
      alerts.py      # Telegram + SendGrid dispatcher
    policy.yaml      # Example policy file
    requirements.txt
    Dockerfile
  frontend/          # Next.js demo page
    ...
  docs/
    one-pager.pdf    # Sales collateral (Day 3)
```

---

*Generated by RIOS Operator Brain — Experiment ID: edf22f3f-18be-4cbb-8624-1d5ad1871f51*
