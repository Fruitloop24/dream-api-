# Dream API

**API-as-a-Service for SaaS and E-commerce.** Auth, billing, usage tracking via API keys.

> **Live at:** [dream.panacea-tech.net](https://dream.panacea-tech.net) (coming soon)
> **By:** Panacea Tech, LLC · PO Box 4811, Eastman, GA 31023
> **Contact:** kc@panacea-tech.net

## What It Is

Dream API is the backend. You build your frontend, we handle:
- **Authentication** (Clerk)
- **Billing** (Stripe Connect)
- **Usage tracking** (metered billing)
- **Multi-tenancy** (data isolation by API key)

**Business model:** You use our API. Templates are free tools to get started faster.

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| **Trial** | Free | 14 days, full access, credit card required |
| **Pro** | $19/month | SaaS: 2,000 end-users / Store: unlimited guest checkout |
| **Overage** | $0.03/user | SaaS only, after 2,000 users |

Plus Stripe's standard transaction fees (2.9% + $0.30). Funds go directly to your Stripe account.

## Three Project Types

### SaaS
Usage-metered subscriptions. Track API calls, tokens, or any billable action.

```typescript
await api.usage.track();  // Count usage
await api.usage.check();  // Get remaining
await api.billing.createCheckout({ tier: 'pro' });  // Upgrade
```

### Store
E-commerce with products, inventory, guest checkout. No Clerk users = no overage.

```typescript
await api.products.list();  // Get products
await api.products.cartCheckout({  // Guest checkout
  items: [{ priceId: 'price_xxx', quantity: 1 }],
  customerEmail: 'buyer@email.com',
});
```

### Membership
Content gating with paywalls. Optional trial periods, auto-checkout flow.

```typescript
const plan = user?.plan || 'free';
const hasPaidAccess = plan !== 'free';

// Gate content based on plan
{hasPaidAccess ? <PremiumContent /> : <UpgradePrompt />}
```

## Quick Start

```bash
npm install @dream-api/sdk
```

```typescript
import { DreamAPI } from '@dream-api/sdk';

// Frontend (publishable key only)
const api = new DreamAPI({
  publishableKey: 'pk_test_xxx',
});

// Backend (both keys)
const api = new DreamAPI({
  publishableKey: 'pk_test_xxx',
  secretKey: 'sk_test_xxx',
});
```

## Test/Live Mode

Projects start in **test mode** by default. Test locally, then promote when ready.

```
1. Connect Stripe (one-time OAuth)
2. Create project → TEST mode → pk_test_/sk_test_ keys
3. Test on localhost
4. Click "Promote to Live" → LIVE mode → pk_live_/sk_live_ keys
5. Deploy with LIVE keys
```

Test products go to your Stripe test dashboard. Live products go to your real Stripe.

## Dashboard

Manage everything from the dashboard:
- **Projects** - Create SaaS or Store projects, get API keys
- **Tiers** - Set prices, usage limits, features (synced to Stripe)
- **Products** - Add products with images, inventory, prices
- **Customers** - View users, plans, usage, status
- **Metrics** - MRR, active subs, usage this period
- **Webhooks** - Monitor Stripe events
- **Keys** - Rotate secret key without breaking frontend

## Templates

Free templates with AI-assisted setup (both React and Next.js versions):

| Template | Type | Features |
|----------|------|----------|
| `dream-saas-basic` / `dream-saas-next` | SaaS | Auth, usage tracking, billing, dashboard |
| `dream-store-basic` / `dream-store-next` | Store | Products, cart, guest checkout |
| `dream-membership-basic` / `dream-membership-next` | Membership | Content gating, paywalls, auto-checkout |

All templates have `/setup` command for Claude Code, Cursor, or Windsurf.

Clone from GitHub, open in your AI editor, run `/setup`.

Templates are available after signup.

## Infrastructure

Built on Cloudflare Workers:

| Feature | How |
|---------|-----|
| Edge latency | <50ms worldwide |
| DDoS protection | Cloudflare automatic |
| Database | D1 (SQLite at edge) |
| Cache | KV (sub-ms reads) |
| Storage | R2 (product images) |
| Rate limiting | Per-user, KV-based |

## Security

| Layer | Protection |
|-------|------------|
| Keys | PK (public) / SK (secret) separation |
| Identity | JWT verified every request |
| Plans | Stored in JWT, set by webhooks only |
| Data | Isolated by publishableKey |
| SQL | Parameterized queries |
| Webhooks | Stripe signatures verified |
| Subscription | API access blocked when subscription expires |

## Subscription Enforcement

API access is gated by subscription status. When a developer's subscription lapses:

| Timeline | Dashboard | API Access | Data |
|----------|-----------|------------|------|
| Active/Trialing | ✅ Full access | ✅ Full access | ✅ Retained |
| Past Due | ✅ Full access | ✅ Full access | ✅ Retained |
| Canceled (grace: 7d) | ❌ Locked | ✅ Still works | ✅ Retained |
| Canceled (expired) | ❌ Locked | ❌ **Blocked** | ✅ Retained |
| Canceled (30d+) | ❌ Locked | ❌ Blocked | 🗑️ **Deleted** |

**How it works:**
1. Stripe webhook fires on subscription change
2. `front-auth-api` updates D1 + caches status in KV
3. `api-multi` checks KV cache on every API call (~1ms)
4. Blocked requests return: `"Subscription expired. Please renew at dashboard."`
5. Daily cron cleans up data for subscriptions canceled 30+ days

**Grace period:** 7 days after subscription ends. Allows time to fix payment issues.

**Data retention:** 30 days after cancellation. After that, all data is permanently deleted.

## Project Structure

```
dream-api/
├── dream-sdk/              # @dream-api/sdk (npm published)
├── frontend/               # Developer dashboard (React + Vite)
├── api-multi/              # Main API - usage, billing, products
├── oauth-api/              # Stripe Connect OAuth + tier management
├── front-auth-api/         # Dev auth, $19/mo billing, usage metering
├── sign-up/                # End-user signup (Clerk → metadata → D1)
├── admin-dashboard/        # Internal metrics (CF Access protected)
├── docs/                   # SDK, API, Architecture docs
└── [templates]/            # Separate GitHub repos, gitignored:
    ├── dream-saas-basic/       # React SaaS
    ├── dream-saas-next/        # Next.js SaaS
    ├── dream-store-basic/      # React Store
    ├── dream-store-next/       # Next.js Store
    ├── dream-membership-basic/ # React Membership
    └── dream-membership-next/  # Next.js Membership
```

### Workers Detail

| Worker | URL | Purpose |
|--------|-----|---------|
| `api-multi` | api-multi.k-c-sheffield012376.workers.dev | Main customer-facing API |
| `oauth-api` | oauth-api.k-c-sheffield012376.workers.dev | Stripe Connect, tiers |
| `front-auth-api` | front-auth-api.k-c-sheffield012376.workers.dev | Dev auth, platform billing |
| `sign-up` | sign-up.k-c-sheffield012376.workers.dev | End-user signup flow |
| `admin-dashboard` | admin-dashboard.k-c-sheffield012376.workers.dev | Internal admin |

## Documentation

| Doc | Purpose |
|-----|---------|
| `docs/SDK-GUIDE.md` | SDK methods and usage |
| `docs/API-REFERENCE.md` | Endpoints, params, responses |
| `docs/ARCHITECTURE.md` | Technical deep dive |
| `docs/SIGN-UP-FLOW.md` | End-user sign-up flow (critical for debugging) |
| `docs/D1-SCHEMA.md` | Database schema reference |
| `docs/LIMITATIONS.md` | Constraints and considerations |
| `docs/HYPE.md` | Marketing pitch |

## Current State

**Production Ready:**
- SaaS flow: signup → usage → limits → checkout → subscription
- Store flow: products → cart → checkout → inventory updates
- Membership flow: signup → auto-checkout → content gating
- Dashboard: projects, tiers, products, customers, metrics
- Templates: SaaS, Store, and Membership (React + Next.js) with `/setup` commands; React/Vite templates also include `/pwa`.
- SDK: Published on npm (`@dream-api/sdk`), handles auth/refresh automatically
- Sign-up worker: Clerk hosted signup → metadata → D1 sync → cross-domain ticket
- Subscription enforcement: API blocked when dev subscription expires (7-day grace)
- Landing page with demo videos, live demos, pricing
- Legal pages: Privacy, Terms, SLA
- Open source backend: [plug-saas](https://github.com/Fruitloop24/plug-saas)

**Planned:**
- Vue/Nuxt variants of templates
- `/deploy` command for one-click deployment

## Local Dev

```bash
cd frontend && npm run dev        # Dashboard :5173
cd api-multi && npm run dev       # Main API :8787
cd front-auth-api && npm run dev  # Dev auth :8788
cd oauth-api && npm run dev       # Stripe OAuth :8789
```

## Deploy

```bash
cd api-multi && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd front-auth-api && npx wrangler deploy
cd sign-up && npx wrangler deploy
cd admin-dashboard && npx wrangler deploy
# Frontend: Cloudflare Pages auto-deploy
```

## License

MIT
