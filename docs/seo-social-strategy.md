# AEGIS SEO & Social Media Strategy

Created: 2026-02-21

## SEO Audit Findings

### What was in place
- Root metadata (title, description, keywords, OG, Twitter card)
- Basic SoftwareApplication structured data
- robots.txt blocking /dashboard/ and /api/
- OG image at /og-image.png
- Vercel Analytics

### Issues found & fixed
1. **Sitemap incomplete** — only 4 pages, no lastmod → Added all pages + lastmod dates
2. **No per-page metadata on auth pages** → Created layout.tsx wrappers with title/description/noindex
3. **No Twitter handle in metadata** → Added creator/site fields (@aegistreasury)
4. **No social links on site** → Added X and LinkedIn icons to footer
5. **Thin structured data** → Added Organization, WebSite, FAQPage schemas
6. **Hero copy said "Ethereum or Solana"** → Updated to mention all 6 chains
7. **CTAFooter stale "building" language** → Updated to reflect current product/pricing
8. **One-pager missing social metadata** → Added OG + Twitter card metadata
9. **No canonical URLs on subpages** → Added via layout.tsx wrappers

### Still needed (content pages)
- `/learn/treasury-compliance` — target "crypto treasury compliance"
- `/learn/mica-compliance` — target "mica compliance crypto"
- `/learn/how-to-audit` — target "audit dao treasury"
- `/learn/glossary` — target long-tail terms (HHI, concentration risk, etc.)

---

## Social Media Strategy

### Tier 1 — Must have (start now)

#### Twitter/X (@aegistreasury)
- **Why:** Entire target market lives here — DAO contributors, treasury managers, DeFi teams
- **Content types:** Public treasury audit breakdowns, compliance tips, regulatory news, product updates
- **Frequency:** 3-5x/week
- **Key tactic:** Audit well-known DAO treasuries (Uniswap, Aave, Lido) and post thread breakdowns

#### LinkedIn (/company/aegistreasury)
- **Why:** Institutional credibility — fund managers, compliance officers, crypto advisors
- **Content types:** Regulatory analysis, engineering posts, case studies
- **Frequency:** 2-3x/week
- **Key tactic:** Arlen posts as thought leader in crypto treasury compliance (personal > company page)

### Tier 2 — High value (start within 30 days)

#### Farcaster
- **Why:** Most engaged DeFi/DAO community, high signal-to-noise
- **Channels:** /defi, /daos, /governance
- **Key tactic:** Share audit results, offer free audits to Farcaster-native projects

#### GitHub (/aegistreasury)
- **Why:** Developer credibility in crypto
- **Consider:** Open-source the validator rules or publish a treasury compliance spec

### Tier 3 — Later (with traction)
- **YouTube/Loom** — Tutorial content, product demos
- **Telegram** — Community channel for paying users
- **Mirror.xyz** — Long-form crypto-native blog

---

## Content SEO — Long-Tail Keyword Capture

### Target pages

| Page | Primary Keywords | URL | Status |
|------|-----------------|-----|--------|
| What is Treasury Compliance? | crypto treasury compliance, dao treasury management | /learn/treasury-compliance | Planned |
| MiCA Compliance Guide | mica compliance crypto, eu crypto regulation | /learn/mica-compliance | Planned |
| How to Audit a DAO Treasury | audit dao treasury, treasury risk assessment | /learn/how-to-audit | Planned |
| Treasury Risk Glossary | HHI index crypto, concentration risk defi | /learn/glossary | Planned |
| Ethereum vs Solana Treasury | ethereum treasury, solana treasury management | /learn/ethereum-vs-solana | Planned |

### Content strategy
- Each page is ~1500 words, educational tone
- Every page links to #demo as CTA ("Try a free audit now")
- Pages are static (server-rendered) for maximum SEO value
- Added to sitemap as created

---

## Repeatable Content Engine

### The "Public DAO Audit" Playbook
1. Pick a public DAO treasury (Uniswap, Aave, Lido, MakerDAO, etc.)
2. Run audit through AEGIS
3. Screenshot results
4. Write X thread (8-12 tweets): hook → findings → AI analysis → CTA
5. Repurpose as LinkedIn post (condensed version)
6. Use findings in /learn content pages as real examples

This is the highest-ROI content play — demonstrates the product with real data, generates engagement, and is inherently shareable.

---

## Tracking

### GitHub Issues
All SEO and marketing work is tracked as GitHub issues with labels:
- `claude-solo` — Technical fixes Claude can do autonomously
- `arlen-solo` — Account creation and manual tasks only Arlen can do
- `together` — Collaborative content creation
- `seo` — SEO improvements
- `marketing` — Social media and marketing
- `content` — Content pages and copy
