# Dream API

**API-as-a-Service for SaaS and E-commerce.** Auth, billing, usage tracking via API keys.

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

## Two Modes

### SaaS Mode
Usage-metered subscriptions. Track API calls, tokens, or any billable action.

```typescript
await api.usage.track();  // Count usage
await api.usage.check();  // Get remaining
await api.billing.createCheckout({ tier: 'pro' });  // Upgrade
```

### Store Mode
E-commerce with products, inventory, guest checkout.

```typescript
await api.products.list();  // Get products
await api.products.cartCheckout({  // Guest checkout
  items: [{ priceId: 'price_xxx', quantity: 1 }],
  customerEmail: 'buyer@email.com',
});
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

Free React templates with AI-assisted setup:

| Template | Type | Features |
|----------|------|----------|
| `dream-saas-basic` | SaaS | Auth, usage tracking, billing, dashboard |
| `dream-store-basic` | Store | Products, cart, guest checkout |

Both have `/setup` command for Claude Code, Cursor, or Windsurf.

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
├── dream-sdk/         # @dream-api/sdk (npm published)
├── frontend/          # Developer dashboard (React)
├── api-multi/         # Main API worker
├── oauth-api/         # Stripe Connect OAuth
├── front-auth-api/    # Dev authentication
├── sign-up/           # End-user signup worker
├── admin-dashboard/   # Internal admin (CF Access protected)
├── dream-saas-basic/  # SaaS template (separate repo)
└── dream-store-basic/ # Store template (separate repo)
```

## Documentation

| Doc | Purpose |
|-----|---------|
| `docs/SDK-GUIDE.md` | SDK methods and usage |
| `docs/API-REFERENCE.md` | Endpoints, params, responses |
| `docs/ARCHITECTURE.md` | Technical deep dive |
| `docs/HYPE.md` | Marketing pitch |

## Current State

**Working:**
- SaaS flow: signup → usage → limits → checkout → subscription
- Store flow: products → cart → checkout → inventory updates
- Dashboard: projects, tiers, products, customers, metrics
- Templates: SaaS and Store with `/setup` command
- SDK: Published on npm, handles auth/refresh automatically

**Planned:**
- `/pwa` command for installable apps
- More templates (gated content, courses)
- Framework variants (Next.js, Vue)

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
