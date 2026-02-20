# AEGIS

Treasury risk audit tool for crypto wallets (Ethereum + Solana).

## Stack

- **Backend**: Python FastAPI on Railway (`aegis-production-acdc.up.railway.app`)
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4 on Vercel (`aegistreasury.com`)
- **Database**: PostgreSQL on Railway via asyncpg
- **Auth**: NextAuth.js v5 (frontend) + PyJWT (backend), shared HS256 secret
- **Email**: SendGrid (transactional emails — password reset)
- **AI**: Anthropic Claude (audit analysis)

## Project Structure

```
backend/
  app/
    main.py           # FastAPI app, 40+ endpoints
    validator.py       # 10 treasury compliance rules
    eth_reader.py      # Ethereum wallet reader (Etherscan V2)
    solana_reader.py   # Solana wallet reader + CoinGecko pricing
    safe_reader.py     # Gnosis Safe reader
    ai_analysis.py     # Claude-powered audit analysis
    database.py        # asyncpg pool, all DB queries
    auth.py            # JWT decode + FastAPI dependencies
    alerts.py          # SendGrid + Telegram notifications
    scheduler.py       # Scheduled audit jobs
    notifications.py   # In-app notification queries
    webhooks.py        # Webhook dispatch
  tests/
    conftest.py        # Shared fixtures
    test_validator.py  # 26 rule tests
    test_auth.py       # 12 auth tests
  requirements.txt

frontend/
  src/
    auth.ts            # NextAuth config + JWT signing
    middleware.ts       # Route protection
    lib/api.ts         # API client with auth headers
    app/
      page.tsx         # Landing page
      layout.tsx       # Root layout + SEO metadata
      login/           # Login page
      signup/          # Signup page
      forgot-password/ # Password reset request
      reset-password/  # Password reset form
      one-pager/       # Marketing one-pager
      dashboard/       # Authenticated dashboard
        wallets/       # Wallet management
        clients/       # Client management
        history/       # Audit history
        audits/        # Audit detail + compare
        notifications/ # Notification center
        settings/      # User settings
        team/          # Org/team management
      components/
        types.ts       # Shared TypeScript types
        constants.ts   # API URL, chain configs, rules
        utils.tsx      # PDF generation (JSX, not .ts)
        landing/       # 8 landing page sections
        demo/          # 3 demo components
        report/        # 5 report components
  public/
    robots.txt
    sitemap.xml
    og-image.png
```

## Commands

```bash
# Backend
cd backend && pip install -r requirements.txt
cd backend && uvicorn app.main:app --reload          # local dev
cd backend && python -m pytest tests/ -v             # run tests
cd backend && railway up                             # deploy

# Frontend
cd frontend && npm install
cd frontend && npm run dev                           # local dev
cd frontend && npm run build                         # check build
cd frontend && npx vercel --prod                     # deploy
```

## Environment Variables

### Railway (Backend)
- `DATABASE_URL` — PostgreSQL connection string
- `ETHERSCAN_API_KEY` — Etherscan V2 API
- `ANTHROPIC_API_KEY` — Claude AI analysis
- `NEXTAUTH_SECRET` — Shared JWT secret
- `SENDGRID_API_KEY` — Email delivery
- `FRONTEND_URL` — `https://aegistreasury.com`
- `ALLOWED_ORIGINS` — CORS origins

### Vercel (Frontend)
- `NEXT_PUBLIC_API_URL` — Backend URL
- `NEXTAUTH_SECRET` — Shared JWT secret
- `NEXTAUTH_URL` — `https://aegistreasury.com`

## Key Gotchas

- **Etherscan V2**: Use `/v2/api?chainid=1&...` — V1 is deprecated
- **utils.tsx not utils.ts**: Contains JSX for PDF generation
- **Python 3.9 locally, 3.12 in prod**: Use `from __future__ import annotations` in all backend files
- **FastAPI Request param**: Use `req: Request = None` NOT `req: Request | None = None` (breaks DI)
- **reset-password page**: Needs `<Suspense>` wrapper for `useSearchParams()`
- **recharts Tooltip**: Don't add type annotations to formatter (causes TS errors)
- **Railway CLI**: `railway up` can hang on build logs — upload still succeeds
- **Rate limiter in tests**: Clear `_rate_buckets` in fixtures to avoid 429s

## Database Tables

`users`, `wallets`, `clients`, `organizations`, `org_members`, `audit_history`, `notifications`, `waitlist`
