# dream-api

API-as-a-Service Platform. Devs get API keys, we handle auth/billing/usage.

## Architecture

```
Frontend (React) → front-auth-api (Dev Auth) → oauth-api (Stripe Connect)
                            ↓
                    D1 + KV + R2
                            ↓
                    api-multi ← Dev's App (via SDK or direct)
                            ↓
                    sign-up ← End-user signup
```

## SDK

```bash
npm install @dream-api/sdk
```

```typescript
import { DreamAPI } from '@dream-api/sdk';

// Frontend (PK only - safe for browsers)
const api = new DreamAPI({
  publishableKey: 'pk_test_xxx',
});
await api.products.list();           // Works with PK only
await api.products.listTiers();      // Works with PK only
await api.products.cartCheckout({}); // Guest checkout works

// After user signs in
await api.auth.init();               // Auto-sets JWT
await api.usage.track();             // Now has JWT
await api.billing.createCheckout({ tier: 'pro' });
await api.account.delete();          // Self-service account deletion

// Backend (SK - full admin access)
const api = new DreamAPI({
  secretKey: 'sk_test_xxx',
  publishableKey: 'pk_test_xxx',
});
await api.customers.create({ email: 'user@example.com' });
await api.customers.delete(userId);
await api.dashboard.get();

// Auth URLs
api.auth.getSignUpUrl({ redirect: '/dashboard' });
```

See `dream-sdk/README.md` for full documentation.

## Workers

| Worker | URL | Purpose |
|--------|-----|---------|
| `front-auth-api` | front-auth-api.k-c-sheffield012376.workers.dev | Dev auth, credentials, project management |
| `oauth-api` | oauth-api.k-c-sheffield012376.workers.dev | Stripe Connect OAuth, products/tiers |
| `api-multi` | api-multi.k-c-sheffield012376.workers.dev | Main API - usage, checkouts, webhooks, dashboard |
| `sign-up` | sign-up.k-c-sheffield012376.workers.dev | End-user signup with metadata |

## D1 Schema

```sql
-- platforms: dev accounts
platformId TEXT PRIMARY KEY, clerkUserId TEXT, stripeAccountId TEXT, createdAt TEXT

-- api_keys: project credentials
publishableKey TEXT PRIMARY KEY, platformId TEXT, secretKeyHash TEXT, mode TEXT, projectType TEXT, name TEXT

-- tiers: subscription/product tiers
publishableKey TEXT, name TEXT, price REAL, requestLimit INTEGER, priceId TEXT, productId TEXT, inventory INTEGER
PRIMARY KEY (publishableKey, name)

-- subscriptions: user subscriptions
publishableKey TEXT, platformId TEXT, userId TEXT, plan TEXT, status TEXT, stripeCustomerId TEXT, subscriptionId TEXT

-- usage_counts: monthly usage tracking
platformId TEXT, publishableKey TEXT, userId TEXT, plan TEXT, periodStart TEXT, periodEnd TEXT, usageCount INTEGER, updatedAt TEXT
PRIMARY KEY (platformId, userId)

-- end_users: users per project
platformId TEXT, publishableKey TEXT, clerkUserId TEXT, email TEXT, createdAt TEXT
PRIMARY KEY (platformId, publishableKey, clerkUserId)

-- events: webhook idempotency
eventId TEXT PRIMARY KEY, type TEXT, payload_json TEXT, createdAt TEXT
```

## KV Keys

```
secretkey:{sha256hash}:publishableKey → pk_xxx
publishablekey:{pk}:platformId → plt_xxx
user:{clerkUserId}:secretKey:live → sk_live_xxx
user:{clerkUserId}:secretKey:test → sk_test_xxx
```

## R2 Buckets

- `dream-api-assets` - Product images, uploads

## Two Clerk Apps

1. **dream-api** - Platform devs (our customers)
2. **end-user-api** - All devs' end customers, isolated by `publishableKey` in metadata

## API Auth Model

| Endpoint | Auth | Notes |
|----------|------|-------|
| `GET /api/products` | PK | Public product catalog |
| `GET /api/tiers` | PK | Public pricing tiers |
| `POST /api/cart/checkout` | PK | Guest checkout (stores) |
| `POST /api/data` | PK + JWT | Track usage |
| `GET /api/usage` | PK + JWT | Check usage |
| `POST /api/create-checkout` | PK + JWT | Subscription upgrade |
| `POST /api/customer-portal` | PK + JWT | Billing portal |
| `DELETE /api/me` | PK + JWT | Self-delete account |
| `POST /api/customers` | SK | Create customer |
| `GET /api/customers/:id` | SK | Get customer |
| `PATCH /api/customers/:id` | SK | Update customer plan |
| `DELETE /api/customers/:id` | SK | Delete customer + cleanup D1 |
| `GET /api/dashboard` | SK | Dev metrics |

PK = `X-Publishable-Key: pk_xxx` (safe for frontend)
SK = `Authorization: Bearer sk_xxx` (backend only)
JWT = `X-Clerk-Token: eyJ...` (end-user token with publishableKey + plan in metadata)

## Security Model

- **PK/SK split** - Same model as Stripe (publishable key public, secret key backend-only)
- **JWT verification** - All user operations verify Clerk JWT server-side
- **Plan in metadata** - Cannot be spoofed (set by webhooks, not user input)
- **Token auto-refresh** - SDK refreshes JWT before expiry
- **Multi-tenant isolation** - publishableKey in JWT must match header
- **OAuth `/authorize`** requires Clerk JWT - userId extracted from verified token
- **Sign-up `/oauth/complete`** requires session token in Authorization header
- **Stripe webhooks** verified via signature when `STRIPE_WEBHOOK_SECRET` set
- **D1 queries** parameterized via `.bind()` (SQL injection protected)

## Sign-Up Worker

Frictionless signup using Clerk hosted pages. Users sign up, get metadata set automatically, and land in the app logged in.

**URL:** `https://sign-up.k-c-sheffield012376.workers.dev`

**SDK Usage:**
```typescript
const signupUrl = api.auth.getSignUpUrl({ redirect: '/dashboard' });
// → https://sign-up.../signup?pk=pk_xxx&redirect=...
```

**Routes:**
- `GET /signup?pk=xxx&redirect=url` - Validate pk, set cookie, redirect to Clerk hosted signup
- `GET /callback` - Return from Clerk, load SDK, call /oauth/complete, redirect
- `POST /oauth/complete` - Verify token with Clerk API, set metadata, sync D1

**Flow:**
1. Dev's app links to `/signup?pk=xxx&redirect=/dashboard`
2. We set cookie, redirect to Clerk hosted signup
3. User signs up (email OR Google - Clerk handles all auth)
4. Clerk redirects to `/callback`
5. Callback page loads Clerk SDK, gets token, calls `/oauth/complete`
6. We verify token, set metadata, sync D1
7. Redirect to dev's app - user is logged in!

**Security:**
- Token verified server-side with Clerk Backend API
- UserId extracted from verified token, not user input
- PublishableKey validated against D1
- No project hopping (rejects if user has different pk)

**See:** `sign-up/oauth.md` for full implementation details.

## Deploy

```bash
cd front-auth-api && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd api-multi && npx wrangler deploy
cd sign-up && npx wrangler deploy
```

## Debugging

| Problem | Fix |
|---------|-----|
| Invalid API key | Check D1 `api_keys.secretKeyHash`, clear KV cache |
| User not in dashboard | Check `end_users.publishableKey` matches |
| Usage wrong mode | Filter by `publishableKey` not `platformId` |
| Limit always 0 | Check tier name matches `tiers` table |
| Signup no metadata | Check sign-up worker logs, verify Clerk settings |

## Key Concepts

- `publishableKey` = Project identifier (pk_test_xxx / pk_live_xxx)
- Always filter queries by `publishableKey` for test/live isolation
- User metadata: `{ publishableKey, plan }` - set by sign-up worker
- Plan in JWT cannot be spoofed - set by system during subscription

## Templates

| Template | Repo | Purpose |
|----------|------|---------|
| `dream-saas-basic` | github.com/Fruitloop24/dream-saas-basic | SaaS starter (auth, billing, usage) |
| `dream-store-basic` | github.com/Fruitloop24/dream-store-basic | Store starter (products, cart, checkout) |

Each has `/setup` slash command for AI-assisted configuration. Just set `VITE_DREAM_PUBLISHABLE_KEY` and customize branding.
