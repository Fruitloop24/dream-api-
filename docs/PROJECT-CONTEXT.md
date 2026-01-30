# Project Context

## What This Is

API-as-a-Service for indie devs. Auth + billing + usage tracking in one SDK, one publishable key.

**The pitch:** "Stop building auth and billing. Start shipping features."

---

## Target Market

- **AI wrapper builders** - Need usage tracking for tokens/generations
- **SaaS indie hackers** - Need billing without building it
- **Side project devs** - Want to ship fast, not build infrastructure
- **E-commerce** - Simple guest checkout stores

---

## Business Model

| Plan | Price | Details |
|------|-------|---------|
| Trial | Free | 14 days, full access, CC required |
| Pro | $19/mo | SaaS: 2,000 end-users included / Store: unlimited |
| Overage | $0.03/user | SaaS only, after 2,000 users |

Revenue scales with customer success. Low entry price, grows with them.

---

## Test/Live Mode Flow

Developers always start in TEST mode:

```
1. Sign up → Pay $19/mo (14-day trial)
2. Connect Stripe (TEST OAuth)
3. Create TEST project → pk_test_/sk_test_ keys
4. Build & test on localhost (no time limit!)
5. Ready? Click "Promote to Live"
6. Connect Stripe (LIVE OAuth)
7. Get pk_live_/sk_live_ keys
8. Deploy to Vercel/CF Pages
```

**Key points:**
- Test mode is free and unlimited duration
- Live keys only work on deployed domains (Clerk security)
- Test data deleted on promote (clean production slate)

---

## Current State

**Done:**
- 5 Cloudflare Workers (api-multi, oauth-api, front-auth-api, sign-up, admin-dashboard)
- SDK on npm (@dream-api/sdk)
- 6 React templates (saas, store, membership - basic + Next.js variants)
- Theme system (light/dark toggle, accent colors)
- /setup commands for AI-assisted config
- Comprehensive docs (SDK guide, API reference, security audit)
- Two-part OAuth flow (test + live)
- Subscription enforcement (API gating)

**In Progress:**
- Live production testing
- Template refinements

**Planned:**
- Vue/Nuxt templates
- /deploy command for one-click deployment
- Demo videos
- Product Hunt launch

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Compute | Cloudflare Workers | Edge speed (<50ms), no cold starts, cheap at scale |
| Database | D1 (SQLite) | Simple, fast, integrated with Workers |
| Cache | KV | Rate limiting, token lookups, tier config cache |
| Storage | R2 | Product images |
| Auth | Clerk | Battle-tested, we wrap it with our metadata |
| Payments | Stripe Connect | Devs keep money directly, we don't touch funds |
| Frontend | React + Tailwind | Fast to build, AI can modify easily |

---

## Key Architecture Decisions

1. **Two Clerk instances** - Test (dev) and Live (prod) for clean separation
2. **Mode from pk prefix** - SDK and sign-up worker detect test/live from pk_test_/pk_live_
3. **All auth through sign-up worker** - Ensures correct Clerk key selection for cross-domain auth
4. **Platform keys + Stripe-Account header** - Single pattern for test/live API calls
5. **PK/SK split** - Same model as Stripe, devs understand it
6. **Plan in JWT** - Can't be spoofed, set by webhooks only
7. **Delete test data on promote** - Clean production slate
8. **Templates are free** - Onboarding tool, not the product

---

## Repository Structure

```
dream-api/
├── api-multi/          # Main API worker (usage, billing, products)
├── oauth-api/          # Stripe Connect OAuth + product creation
├── front-auth-api/     # Developer auth + platform billing
├── sign-up/            # End-user signup with metadata
├── admin-dashboard/    # Internal admin metrics (CF Access protected)
├── dream-sdk/          # @dream-api/sdk npm package
├── frontend/           # Developer dashboard (React)
├── docs/               # Documentation
└── test-saas-next/     # Live deployment testing
```

---

## Documentation Index

| Doc | Purpose |
|-----|---------|
| `OAUTH-FLOW.md` | Stripe OAuth + test/live promotion flow |
| `SECURITY.md` | Security features and audit |
| `SDK-GUIDE.md` | Complete SDK reference |
| `API-REFERENCE.md` | Endpoints and data types |
| `ARCHITECTURE.md` | Technical deep dive |
| `SIGN-UP-FLOW.md` | End-user sign-up flow |
| `D1-SCHEMA.md` | Database schema reference |
| `LIMITATIONS.md` | Constraints and considerations |

---

## Competitive Position

| Competitor | Our Difference |
|------------|----------------|
| Supabase | We're narrower: just auth+billing+usage, not full backend |
| Clerk | They're auth only, we add billing + usage |
| Stripe | They're payments only, we add auth + usage |
| Firebase | We're simpler, focused on billing SaaS specifically |

**Our angle:** All-in-one for "I want to charge users based on usage."

---

## Success Metrics

- **Year 1 target:** 300 paying customers
- **Churn target:** <5%/month
- **Conversion:** Free trial → paid
- **Channel:** Product Hunt, indie hacker communities, AI Twitter

---

## What Would Make This Fail

- Not launching (overbuilding)
- Landing page stays weak
- No Product Hunt push
- Trying to add too many features before getting users

## What Will Make This Work

- AI wrapper market is growing fast and needs this
- DX is genuinely good (one key, one SDK)
- Price is right ($19/mo is nothing for a working billing system)
- Templates reduce time-to-value to minutes
- Security is solid (see SECURITY.md)
