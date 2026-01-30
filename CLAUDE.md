# dream-api

API-as-a-Service Platform. Developers get API keys, we handle auth/billing/usage.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ PLATFORM (Dev pays us $19/mo)                               │
│                                                              │
│ Frontend → front-auth-api → oauth-api (Stripe Connect)      │
│                   ↓                                          │
│          front-auth-api ← Stripe Webhooks                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ END-USER (End-user pays dev via Stripe Connect)             │
│                                                              │
│ Dev's App → @dream-api/sdk → api-multi                      │
│                                   ↓                          │
│                              sign-up worker                 │
│                                   ↓                          │
│                           D1 + KV + R2                      │
└─────────────────────────────────────────────────────────────┘
```

## Test/Live Mode

Projects **start in TEST**, promote to LIVE when ready.

| Key Prefix | Stripe | Clerk | Where It Works |
|------------|--------|-------|----------------|
| `pk_test_` | Test cards only | Test Clerk | localhost + deployed |
| `pk_live_` | Real payments | Live Clerk | **Deployed sites only** |

**CRITICAL: Live keys don't work on localhost** - Clerk security feature.

## SDK Mode Detection (v0.1.31+)

The SDK detects mode from the publishable key prefix and selects the correct Clerk instance:

```typescript
// SDK auto-detects mode from pk prefix
const pk = client.getPublishableKey();
const mode = pk?.startsWith('pk_test_') ? 'test' : 'live';

// Selects corresponding Clerk keys
const CLERK_TEST_KEY = 'pk_test_...'; // composed-blowfish-76.clerk.accounts.dev
const CLERK_LIVE_KEY = 'pk_live_...'; // users.panacea-tech.net
```

**No domain detection needed** - the key itself tells us which Clerk instance to use.

## Sign-Up Worker - All Auth Flows

**URL:** `https://sign-up.k-c-sheffield012376.workers.dev`

All auth URLs route through the sign-up worker for consistent Clerk key selection:

| SDK Method | Route | Purpose |
|------------|-------|---------|
| `getSignUpUrl()` | `/signup?pk=xxx&redirect=url` | New user signup |
| `getSignInUrl()` | `/signin?pk=xxx&redirect=url` | Returning user signin |
| `getCustomerPortalUrl()` | `/account?pk=xxx&redirect=url` | Account settings |

The worker reads the pk prefix and uses the matching Clerk keys (TEST or LIVE).

### Sign-Up Flow

```
1. Dev's app → /signup?pk=xxx&redirect=/dashboard
2. Worker validates PK, sets cookie, serves embedded Clerk signup
3. User signs up (email or OAuth)
4. POST /oauth/complete → set metadata {publishableKey, plan: 'free'}
5. Redirect with __clerk_ticket → SDK consumes → user signed in
```

## Workers

| Worker | Purpose | Key Secrets |
|--------|---------|-------------|
| `api-multi` | Main API - usage, billing, products | `CLERK_SECRET_KEY`, `CLERK_SECRET_KEY_TEST` |
| `oauth-api` | Stripe Connect, tier management | `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE` |
| `front-auth-api` | Dev auth, $19/mo billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `sign-up` | End-user auth (signup/signin/account) | `CLERK_SECRET_KEY`, `CLERK_SECRET_KEY_TEST`, `CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY_TEST` |

## Auth Model

| Key | Where | Access |
|-----|-------|--------|
| `pk_xxx` | Frontend | Public data + user ops with JWT |
| `sk_xxx` | Backend only | Full admin access |
| JWT | From Clerk | User identity + plan (unspoofable) |

## Quick Reference

```bash
npm install @dream-api/sdk
```

```typescript
// Frontend
const api = new DreamAPI({ publishableKey: 'pk_test_xxx' });
await api.auth.init();
await api.usage.track();

// Auth URLs (all go through sign-up worker)
api.auth.getSignUpUrl({ redirect: '/dashboard' })
api.auth.getSignInUrl({ redirect: '/dashboard' })
api.auth.getCustomerPortalUrl({ returnUrl: '/dashboard' })

// Backend
const api = new DreamAPI({
  secretKey: 'sk_test_xxx',
  publishableKey: 'pk_test_xxx',
});
await api.customers.create({ email: 'user@example.com' });
```

## Documentation

| Doc | Purpose |
|-----|---------|
| `docs/SDK-GUIDE.md` | Complete SDK reference |
| `docs/SIGN-UP-FLOW.md` | End-user auth flow details |
| `docs/OAUTH-FLOW.md` | Stripe Connect + Test/Live |
| `docs/D1-SCHEMA.md` | Database schema |
| `docs/API-REFERENCE.md` | Endpoints and types |
| `docs/ARCHITECTURE.md` | System design |

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| Trial | Free | 14 days, full access |
| Pro | $19/mo | 2,000 end-users (SaaS) |
| Overage | $0.03/user | After 2,000 live users |

## Templates

Free starter templates (separate repos, gitignored):

| Template | Type | GitHub |
|----------|------|--------|
| `dream-saas-basic` | SaaS (React) | Fruitloop24/dream-saas-basic |
| `dream-saas-next` | SaaS (Next.js) | Fruitloop24/dream-saas-next |
| `dream-store-basic` | Store (React) | Fruitloop24/dream-store-basic |
| `dream-store-next` | Store (Next.js) | Fruitloop24/dream-store-next |

## Deploy

```bash
cd api-multi && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd front-auth-api && npx wrangler deploy
cd sign-up && npx wrangler deploy
```

## Security

- PK/SK key separation
- JWT verified every request (plan from webhook, unspoofable)
- Parameterized SQL, Stripe webhook signatures
- Multi-tenant isolation by publishableKey
- Subscription enforcement (API blocked when dev doesn't pay)
