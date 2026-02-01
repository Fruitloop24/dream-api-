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
| `pk_live_` | Real payments | Live Clerk | **localhost + deployed** |

**Live keys work EVERYWHERE** - auth happens on our worker domain, not the dev's domain.

## Sign-Up Worker - All Auth Flows

**URL:** `https://sign-up.k-c-sheffield012376.workers.dev`

All auth happens on this worker. Devs never touch Clerk. JWTs returned via URL params.

| SDK Method | Route | Purpose |
|------------|-------|---------|
| `getSignUpUrl()` | `/signup?pk=xxx&redirect=url` | New user signup |
| `getSignInUrl()` | `/signin?pk=xxx&redirect=url` | Returning user signin |
| `getCustomerPortalUrl()` | `/account?pk=xxx&redirect=url` | Account settings |
| `getRefreshUrl()` | `/refresh?pk=xxx&redirect=url` | **JWT refresh after plan upgrade** |

### Auth Flow (JWT-based)

```
1. Dev's app → /signup?pk=xxx&redirect=/choose-plan
2. Worker validates PK, serves embedded Clerk signup
3. User signs up (email or OAuth)
4. Worker sets metadata, gets JWT with skipCache: true
5. Redirect with __clerk_jwt → SDK stores in localStorage → user signed in
```

### /refresh Route (Critical for Upgrades)

After Stripe checkout, webhook updates Clerk metadata. But Stripe redirects BEFORE webhook fires.
The `/refresh` route solves this by **polling until plan updates**:

```
Stripe checkout complete
         ↓
/refresh (shows spinner)
         ↓
Poll loop: user.reload() → check plan → still 'free'? wait 1s, retry
         ↓
Plan changed to 'pro'
         ↓
Get JWT with skipCache: true (has correct plan)
         ↓
Redirect to dashboard with __clerk_jwt
```

**Usage in templates:**
```typescript
const refreshUrl = api.auth.getRefreshUrl({ redirect: '/dashboard?success=true' });
await api.billing.createCheckout({
  tier: 'pro',
  successUrl: refreshUrl,  // NOT /dashboard directly!
});
```

## Workers

| Worker | Purpose | Key Secrets |
|--------|---------|-------------|
| `api-multi` | Main API - usage, billing, products | `CLERK_SECRET_KEY`, `CLERK_SECRET_KEY_TEST` |
| `oauth-api` | Stripe Connect, tier management | `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE` |
| `front-auth-api` | Dev auth, $19/mo billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `sign-up` | End-user auth (all routes above) | `CLERK_SECRET_KEY`, `CLERK_SECRET_KEY_TEST`, `CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY_TEST` |

## Auth Model

| Key | Where | Access |
|-----|-------|--------|
| `pk_xxx` | Frontend | Public data + user ops with JWT |
| `sk_xxx` | Backend only | Full admin access |
| JWT | From sign-up worker | User identity + plan (unspoofable) |

## JWT Template (end-user-api)

Configure in Clerk Dashboard with these claims:
```json
{
  "email": "{{user.primary_email_address}}",
  "publishableKey": "{{user.public_metadata.publishableKey}}",
  "plan": "{{user.public_metadata.plan}}",
  "stripeCustomerId": "{{user.public_metadata.stripeCustomerId}}",
  "subscriptionId": "{{user.public_metadata.subscriptionId}}"
}
```

## Quick Reference

```bash
npm install @dream-api/sdk
```

```typescript
// Frontend
const api = new DreamAPI({ publishableKey: 'pk_live_xxx' }); // Works on localhost!
await api.auth.init();
await api.usage.track();

// Auth URLs (all go through sign-up worker)
api.auth.getSignUpUrl({ redirect: '/choose-plan' })
api.auth.getSignInUrl({ redirect: '/dashboard' })
api.auth.getCustomerPortalUrl({ returnUrl: '/dashboard' })
api.auth.getRefreshUrl({ redirect: '/dashboard' })  // For post-Stripe redirect

// Backend
const api = new DreamAPI({
  secretKey: 'sk_live_xxx',
  publishableKey: 'pk_live_xxx',
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
| `sign-up/README.md` | Sign-up worker details |

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
- All auth on our domain (no Clerk on dev domains)
