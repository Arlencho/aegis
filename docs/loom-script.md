# AEGIS Loom Demo Script

**Total runtime:** ~4 minutes
**Format:** Screen share with voiceover, face cam optional

---

## 0:00–0:30 — Hook

**Screen:** Title slide or AEGIS frontend homepage

> "Most DAOs have a risk policy. It lives in a governance forum post or a Google Doc somewhere. The problem? Nobody enforces it in real-time.
>
> A multisig signer can breach your allocation limits right now, and you won't know about it until the next quarterly review — if there even is one.
>
> AEGIS fixes that. Let me show you how."

---

## 0:30–1:30 — Policy File Walkthrough

**Screen:** Show `policy.yaml` in a code editor (VS Code, dark theme)

> "Everything starts with a YAML policy file. If you've ever written a config file, you already know how this works."

Walk through each rule type:

> "**allocation_cap** — No single token should exceed 30% of your total portfolio. This prevents concentration risk.
>
> **stablecoin_floor** — Stablecoins must stay above 20% of holdings. This guarantees operational runway.
>
> **single_asset_cap** — Hard dollar cap on any single asset. Here it's set to $500K.
>
> **max_tx_size** — No single transaction above $100K without a flag. Catches unauthorized large transfers.
>
> **inactivity_alert** — If your Safe goes quiet for 7 days, something might be wrong. Could be a compromised key, could be a stale multisig."

Pause briefly.

> "Five rules. Plain YAML. Any contributor can read it, any governance process can modify it. That's the whole policy."

---

## 1:30–2:30 — Live Demo

**Screen:** Switch to AEGIS frontend at `aegis-demo.vercel.app`

> "Now let's run this against a real treasury."

1. Paste a real Gnosis Safe address into the input field
2. Click "Run Audit"

> "I'm pasting in [DAO name]'s main treasury Safe. This is a real address with real funds."

Wait for results to load (~2-3 seconds).

> "And here's the compliance report."

Walk through the results:

> "We can see the portfolio breakdown — every token, its USD value, its percentage of the treasury.
>
> And here are the rule evaluations. Green checks for rules that pass, red flags for breaches.
>
> [Point to a specific result] This Safe has [X]% in a single token, which breaches the 30% allocation cap we set. That's a live policy violation happening right now."

---

## 2:30–3:15 — Telegram Alerts

**Screen:** Split view — frontend on left, Telegram on right (or switch to phone/Telegram desktop)

> "Reports are great, but you don't want to manually check a dashboard every day. AEGIS sends Telegram alerts automatically when a breach is detected."

Show the Telegram bot/channel with a real alert message.

> "Here's what it looks like. The alert fires in real-time — it includes the rule that was violated, the current value, and the threshold. Your risk committee sees this instantly."

> "You can route alerts to a private channel, a group chat, or directly to multisig signers. Whatever fits your governance flow."

---

## 3:15–3:45 — Positioning & Pricing

**Screen:** Switch to one-pager or a clean slide

> "AEGIS is advisory-first. We're not asking you to change your multisig setup or deploy new contracts. We monitor what you already have and tell you when something's wrong.
>
> Pricing starts at $500 a month for a single Safe with reports and alerts. For teams managing multiple treasuries, the Executor tier at $2K covers up to five Safes with custom rules and API access.
>
> But honestly — start with the free audit. That's the best way to see the value."

---

## 3:45–4:00 — CTA

**Screen:** Frontend with input field visible, or a closing slide with contact info

> "Here's my ask: send me your Safe address. I'll run a compliance audit against your treasury's actual holdings — takes 30 seconds, completely free, no strings attached.
>
> DM me on Twitter or just paste your address into the demo right now. Link is in the description.
>
> Thanks for watching."

---

## Production Notes

- Record at 1080p minimum, 1440p preferred
- Use dark mode everything (editor, browser, terminal)
- Have a real Safe address ready that produces at least one breach for dramatic effect
- Test the demo flow 2-3 times before recording to ensure backend responds quickly
- Keep energy conversational, not salesy — you're showing a tool, not pitching investors
