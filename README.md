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
- Sign-up worker: OAuth + email/password with metadata

### Known Issues
- End-users must sign in again at dev's app after signup (cross-domain limitation)
- Clerk CAPTCHA required for email signup

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

Handles end-user registration with multi-tenant metadata. Supports OAuth (Google) and email/password.

**With SDK:**
```typescript
const signupUrl = api.auth.getSignUpUrl({ redirect: '/dashboard' });
// Redirect new users to signupUrl
```

**Direct URL:**
```
https://sign-up.k-c-sheffield012376.workers.dev/signup?pk=pk_test_xxx&redirect=https://yourapp.com
```

After signup, users must sign in at your app (cross-domain = separate session).

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
- [ ] Publish SDK to npm (`npm publish`)
- [ ] Auto-sign-in after signup (requires SDK in dev's app)
- [ ] Totals view (aggregate live revenue)
- [ ] CSV export
- [ ] Framework-specific guides (React, Next.js, Vue)
