# AEGIS — Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USERS / BROWSERS                            │
│  aegistreasury.com (landing, login, signup, dashboard, public)      │
└──────────────┬──────────────────────────────────────┬───────────────┘
               │ HTTPS                                │ HTTPS
               ▼                                      ▼
┌──────────────────────────┐         ┌────────────────────────────────┐
│    VERCEL (Frontend)     │         │     RAILWAY (Backend API)      │
│                          │         │                                │
│  Next.js 16 + React 19  │  fetch  │  FastAPI (Python)              │
│  Tailwind CSS 4          │────────▶│  aegis-production-acdc.up.     │
│  NextAuth.js v5 (auth)   │         │  railway.app                   │
│  @react-pdf/renderer     │         │                                │
│  recharts                │         │  Endpoints:                    │
│                          │         │  ├── /validate/json (free)     │
│  Pages:                  │         │  ├── /wallets/* (CRUD + audit) │
│  ├── / (landing)         │         │  ├── /clients/* (CRUD)         │
│  ├── /login, /signup     │         │  ├── /audits/* (history/share) │
│  ├── /dashboard/*        │         │  ├── /auth/* (signup/verify)   │
│  ├── /public/audit/[tok] │         │  ├── /users/* (profile)        │
│  └── /one-pager          │         │  ├── /orgs/* (teams)           │
│                          │         │  └── /public/audit/* (shared)  │
└──────────────────────────┘         └───────┬──────┬──────┬──────────┘
                                             │      │      │
                              ┌──────────────┘      │      └──────────────┐
                              ▼                     ▼                     ▼
                 ┌─────────────────────┐ ┌──────────────────┐ ┌──────────────────┐
                 │  PostgreSQL (Rail)  │ │  Etherscan V2    │ │  Anthropic API   │
                 │                     │ │  API             │ │                  │
                 │  Tables:            │ │                  │ │  Claude Haiku    │
                 │  ├── users          │ │  Chains:         │ │  (free audit)    │
                 │  ├── clients        │ │  ├── Ethereum    │ │                  │
                 │  ├── wallets        │ │  ├── Arbitrum    │ │  Claude Sonnet   │
                 │  ├── audit_history  │ │  └── Polygon     │ │  (dashboard)     │
                 │  ├── organizations  │ │                  │ │                  │
                 │  ├── org_members    │ │  Also:           │ │  AI Analysis:    │
                 │  └── waitlist       │ │  ├── Safe API    │ │  ├── Risk level  │
                 │                     │ │  └── Solana RPC  │ │  ├── Summary     │
                 └─────────────────────┘ └──────────────────┘ │  ├── Stress test │
                                                              │  ├── Benchmarks  │
                                                              │  └── Suggestions │
                                                              └──────────────────┘
```

## Authentication Flow

```
Browser                    Vercel (NextAuth)              Railway (FastAPI)
  │                              │                              │
  │  1. POST /api/auth/signin    │                              │
  │─────────────────────────────▶│                              │
  │                              │  2. POST /auth/verify        │
  │                              │─────────────────────────────▶│
  │                              │     { email, password }      │
  │                              │                              │
  │                              │  3. { id, email, name }      │
  │                              │◀─────────────────────────────│
  │                              │                              │
  │                              │  4. Sign JWT (jose, HS256)   │
  │                              │     payload: { sub, email }  │
  │                              │     secret: NEXTAUTH_SECRET  │
  │                              │                              │
  │  5. Set session cookie +     │                              │
  │     accessToken in session   │                              │
  │◀─────────────────────────────│                              │
  │                              │                              │
  │  6. GET /wallets             │                              │
  │  Authorization: Bearer <jwt> │                              │
  │─────────────────────────────────────────────────────────────▶
  │                              │     7. Decode JWT (PyJWT)    │
  │                              │        same NEXTAUTH_SECRET  │
  │  8. { wallets: [...] }       │                              │
  │◀─────────────────────────────────────────────────────────────
```

## Audit Pipeline

```
User clicks "Run Audit"
        │
        ▼
┌─────────────────────┐
│  Fetch Balances +   │  asyncio.gather() — parallel
│  Fetch Transactions │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  validate_policy()  │  10 deterministic rules:
│                     │  ├── allocation_cap (single-token %)
│  validator.py       │  ├── stablecoin_floor (min stablecoin %)
│                     │  ├── single_asset_cap (absolute USD cap)
│                     │  ├── max_tx_size (tx USD limit)
│                     │  ├── inactivity_alert (last tx age)
│                     │  ├── min_diversification (token count)
│                     │  ├── volatile_exposure (non-stable %)
│                     │  ├── min_treasury_value (total USD floor)
│                     │  ├── large_tx_ratio (tx % of portfolio)
│                     │  └── concentration_hhi (Herfindahl index)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  AI Analysis        │  Haiku (free) / Sonnet (dashboard)
│  (Claude API)       │  → risk_level, summary, recommendations,
│                     │    stress_test, benchmarks, suggested_rules
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Save to DB +       │
│  Send Alerts        │  Telegram notifications for failures
└─────────────────────┘
```

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | Next.js 16 + React 19 | App router, Tailwind CSS 4 |
| **Auth** | NextAuth.js v5 (beta.30) | JWT (HS256) via `jose` + PyJWT |
| **Backend** | FastAPI (Python) | async, uvicorn |
| **Database** | PostgreSQL | asyncpg, Railway hosted |
| **AI** | Claude Haiku 4.5 / Sonnet 4 | Anthropic API |
| **Blockchain** | Etherscan V2 API | ETH, Arbitrum, Polygon |
| | Safe Transaction Service | Gnosis Safe multisigs |
| | Solana JSON-RPC | Native SOL + SPL tokens |
| **PDF** | @react-pdf/renderer | Client-side generation |
| **Charts** | recharts | Portfolio visualization |
| **Hosting** | Vercel (frontend) | aegistreasury.com |
| | Railway (backend + DB) | aegis-production-acdc.up.railway.app |

## Environment Variables

### Vercel (Frontend)
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | Frontend URL (for share links) |
| `NEXTAUTH_SECRET` | Shared JWT signing secret |
| `NEXTAUTH_URL` | NextAuth canonical URL |

### Railway (Backend)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ETHERSCAN_API_KEY` | Etherscan V2 API access |
| `ANTHROPIC_API_KEY` | Claude AI analysis |
| `ALLOWED_ORIGINS` | CORS whitelist (comma-separated) |
| `NEXTAUTH_SECRET` | Shared JWT verification secret |

## Database Schema

```sql
users (id, email, name, password_hash, provider, plan, stripe_customer_id)
clients (id, user_id, org_id, name, description)
wallets (id, client_id, address, chain, label, last_audit_at, last_risk_level,
         schedule_frequency, schedule_include_ai, next_audit_at)
audit_history (id, wallet_address, chain, total_usd, overall_status,
              passed, failed, total_rules, risk_level, report_json,
              client_id, trigger, share_token)
organizations (id, name, owner_id)
org_members (id, org_id, user_id, role)
waitlist (id, email, source)
```

## Deployment

```bash
# Frontend
cd frontend && npx vercel --prod

# Backend
cd backend && railway up
```

## Demo Accounts

| Email | Password | Persona | Clients | Wallets |
|-------|----------|---------|---------|---------|
| demo-dao@aegistreasury.com | AegisDem0! | Jordan Rivera (DAO Manager) | 1 | 3 (ETH, ARB, POLY) |
| demo-fund@aegistreasury.com | AegisDem0! | Alex Chen (Fund Manager) | 2 | 4 (ETH×2, ARB, SOL) |
| demo-advisory@aegistreasury.com | AegisDem0! | Sarah Park (Advisory) | 3 | 5 (ETH×3, ARB, SOL) |
