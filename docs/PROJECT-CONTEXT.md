# Project Context

## What This Is

API-as-a-Service for indie devs. Auth + billing + usage tracking in one SDK, one publishable key.

## Target Market

- AI wrapper builders (need usage tracking for tokens/generations)
- SaaS indie hackers (need billing without building it)
- Side project devs (want to ship fast, not build infrastructure)
- E-commerce (simple guest checkout stores)

## Business Model

| Plan | Price | Details |
|------|-------|---------|
| Trial | Free | 14 days, full access, CC required |
| Pro | $19/mo | SaaS: 2,000 end-users included / Store: unlimited |
| Overage | $0.03/user | SaaS only, after 2,000 users |

Revenue scales with customer success. Low entry price, grows with them.

## Current State

**Done:**
- 5 Cloudflare Workers (api-multi, oauth-api, front-auth-api, sign-up, admin-dashboard)
- SDK on npm (@dream-api/sdk)
- 6 React templates (saas, store, membership - each with basic + next.js)
- Theme system (light/dark toggle)
- /setup commands for AI-assisted config (React/Vite templates also include /pwa)
- Docs (SDK guide, API reference, architecture)

**Not Done:**
- Landing page needs redo (link demos, OSS repos)
- Framework variants (Next.js, Vue)
- Demo videos
- Product Hunt launch

**Customers:** Pre-launch. No paying customers yet.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Compute | Cloudflare Workers | Edge speed (<50ms), no cold starts, cheap at scale |
| Database | D1 (SQLite) | Simple, fast, integrated with Workers |
| Cache | KV | Rate limiting, session data |
| Storage | R2 | Product images |
| Auth | Clerk | Don't rebuild auth, just use it |
| Payments | Stripe Connect | Devs keep money directly, we don't touch funds |
| Frontend | React + Tailwind | Fast to build, AI can modify easily |

## Key Decisions

1. **Cloudflare over Vercel/AWS** - Edge-first, zero cold starts, predictable pricing
2. **Clerk for auth** - Battle-tested, we just wrap it with our metadata
3. **Stripe Connect** - Funds go direct to dev's Stripe, not through us
4. **PK/SK split** - Same model as Stripe, devs understand it
5. **Plan in JWT** - Can't be spoofed, set by webhooks only
6. **Templates are free** - Onboarding tool, not the product

## Success Metrics

- **Year 1 target:** 300 paying customers
- **Churn target:** <5%/month
- **Conversion:** Free trial → paid
- **Channel:** Product Hunt, indie hacker communities, AI Twitter

## Known Limitations

- D1 has row limits at very high scale (not a problem until thousands of customers)
- No team/org features (single dev focus for now)
- Templates are React only (Next.js, Vue planned)
- No self-hosted option (SaaS only)

## Competitive Landscape

| Competitor | Difference |
|------------|------------|
| Supabase | We're narrower: just auth+billing+usage, not full backend |
| Clerk | They're auth only, we add billing + usage |
| Stripe | They're payments only, we add auth + usage |
| Firebase | We're simpler, focused on billing SaaS specifically |

**Our angle:** All-in-one for the specific use case of "I want to charge users based on usage."

## Repository Structure

```
dream-api/
├── api-multi/          # Main API worker
├── oauth-api/          # Stripe Connect + tier management
├── front-auth-api/     # Developer authentication + platform billing
├── sign-up/            # End-user signup with metadata
├── admin-dashboard/    # Internal admin metrics (CF Access protected)
├── dream-sdk/          # @dream-api/sdk npm package
├── frontend/           # Developer dashboard (React)
└── docs/               # Documentation
```

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
