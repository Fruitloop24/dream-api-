# dream-api

API-as-a-Service platform built on Cloudflare Workers. Provides auth, billing, usage tracking via API keys.

## Quick Start (For Devs Using This API)

```bash
npm install @dream-api/sdk
```

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: process.env.DREAM_API_SECRET_KEY,
  publishableKey: process.env.DREAM_API_PUBLISHABLE_KEY,
});

// Track usage
api.setUserToken(clerkJWT);
await api.usage.track();

// Check limits
const usage = await api.usage.check();
if (usage.remaining <= 0) {
  const { url } = await api.billing.createCheckout({ tier: 'pro' });
  window.location.href = url;
}
```

See `dream-sdk/README.md` for full SDK documentation.

## Project Structure

```
dream-api/
├── dream-sdk/         # Official TypeScript SDK (@dream-api/sdk)
├── frontend/          # React dashboard for devs
├── front-auth-api/    # Dev authentication, credentials
├── oauth-api/         # Stripe Connect OAuth, products/tiers
├── api-multi/         # Main API - usage, checkouts, webhooks
├── sign-up/           # End-user signup worker
└── test-app/          # Local testing client
```

## What It Does

1. **Dev signs up** → Gets platformId, connects Stripe
2. **Creates project** → Gets pk/sk keys (test + live)
3. **Configures tiers** → Sets limits, prices in Stripe
4. **End-users sign up** → Via sign-up worker, metadata set automatically
5. **Dev's app calls API** → Usage tracked, limits enforced
6. **Users upgrade** → Checkout via Stripe, plan updated

## Current State (Dec 2025)

### Working
- SaaS flow: signup → usage → limits → checkout → subscription
- Store flow: products → cart → checkout → inventory
- Project management: create, edit, delete, regen keys
- Dashboard: metrics, customers, tiers
- Sign-up worker: Clerk hosted pages, frictionless (no double sign-in)
- OAuth flows secured with Clerk JWT verification
- Session token validation on signup completion

### Notes
- Auto-deploy via Cloudflare Pages (frontend) and Workers (API)

## API Endpoints

Base: `https://api-multi.k-c-sheffield012376.workers.dev`

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/customers` | SK | Create customer |
| `GET /api/customers/:id` | SK | Get customer |
| `PATCH /api/customers/:id` | SK | Update customer |
| `DELETE /api/customers/:id` | SK | Delete customer |
| `GET /api/tiers` | SK | List subscription tiers |
| `GET /api/products` | SK | List products (store) |
| `POST /api/cart/checkout` | SK | Cart checkout (store) |
| `GET /api/dashboard` | SK | Platform metrics |
| `POST /api/data` | SK + JWT | Track usage |
| `GET /api/usage` | SK + JWT | Check usage |
| `POST /api/create-checkout` | SK + JWT | Subscription upgrade |
| `POST /api/customer-portal` | SK + JWT | Billing portal |

## Sign-Up Worker

Frictionless signup using Clerk hosted pages. Users sign up (email or Google), get metadata set automatically, and land in your app logged in. No double sign-in required.

**With SDK:**
```typescript
const signupUrl = api.auth.getSignUpUrl({ redirect: '/dashboard' });
// Redirect new users to signupUrl
```

**Direct URL:**
```
https://sign-up.k-c-sheffield012376.workers.dev/signup?pk=pk_test_xxx&redirect=https://yourapp.com
```

See `sign-up/oauth.md` for implementation details.

## Local Dev

```bash
cd frontend && npm run dev        # :5173
cd front-auth-api && npm run dev  # :8788
cd oauth-api && npm run dev       # :8789
cd api-multi && npm run dev       # :8787
```

## Deploy

```bash
cd front-auth-api && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd api-multi && npx wrangler deploy
cd sign-up && npx wrangler deploy
# Frontend auto-deploys via Cloudflare Pages
```

## Technical Reference

See `CLAUDE.md` for schemas, bindings, debugging.

## TODO

- [x] SDK wrapper for devs (`dream-sdk/`)
- [x] Totals view (aggregate live revenue)
- [x] CSV export (customers, orders)
- [x] Delete customer endpoint
- [x] Publish SDK to npm (`@dream-api/sdk`)
- [x] OAuth flow security hardening (JWT verification)
- [x] Sign-up session token validation
- [x] Frictionless signup (no double sign-in required)
- [ ] Facebook OAuth (in addition to Google)
- [ ] Framework-specific guides (React, Next.js, Vue)
- [ ] Store template with SDK integration
- [ ] SaaS template with SDK integration
