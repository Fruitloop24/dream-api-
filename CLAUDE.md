# dream-api

**API-as-a-Service Platform** - Devs pay $15/mo, get API keys, we handle billing/auth/usage.

## Quick Deploy
```bash
cd front-auth-api && npm run deploy
cd oauth-api && npm run deploy
cd api-multi && npm run deploy
# Or just: git push (auto-deploys frontend via Cloudflare Pages)
```

## Core Concept

**publishableKey = Project**. One key tells you everything:
- `pk_test_xxx` / `pk_live_xxx` = mode
- Links to tiers, customers, usage
- Project type (saas/store) locked at creation

## Architecture

```
Frontend (React) → front-auth-api (Dev Auth) → oauth-api (Stripe Connect)
                            ↓
                    D1 + KV + R2
                            ↓
                    api-multi ← Dev's App (SDK calls)
```

## Workers

| Worker | Purpose |
|--------|---------|
| `front-auth-api` | Dev auth, platform ID, credentials, project delete/regen |
| `oauth-api` | Stripe Connect OAuth, create/edit products & tiers |
| `api-multi` | Customer API - usage tracking, checkouts, webhooks, dashboard |

## API Endpoints Reference

### api-multi (Main API for devs to integrate)

Base URL: `https://api-multi.k-c-sheffield012376.workers.dev`

**All requests require:** `Authorization: Bearer sk_xxx`

#### POST /api/customers - Create end-user
```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customers \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "plan": "free"
  }'
```
Response: `{ "success": true, "customer": { "id": "user_xxx", "email": "...", "plan": "free" } }`

#### POST /api/data - Track usage + enforce limits
**Requires:** SK + End-user JWT
```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/data \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Clerk-Token: eyJhbG..."
```
Success: `{ "success": true, "usage": { "count": 1, "limit": 100, "plan": "free" } }`
Limit hit (403): `{ "error": "Tier limit reached", "usageCount": 100, "limit": 100 }`

#### GET /api/usage - Check current usage
**Requires:** SK + End-user JWT
```bash
curl -X GET https://api-multi.k-c-sheffield012376.workers.dev/api/usage \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Clerk-Token: eyJhbG..."
```

#### POST /api/create-checkout - Subscription upgrade
**Requires:** SK + End-user JWT
```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/create-checkout \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Clerk-Token: eyJhbG..." \
  -H "Content-Type: application/json" \
  -H "Origin: https://yourapp.com" \
  -d '{"tier": "pro"}'
```
Or with priceId: `-d '{"priceId": "price_xxx"}'`
Response: `{ "url": "https://checkout.stripe.com/..." }`

#### POST /api/customer-portal - Billing portal
**Requires:** SK + End-user JWT
```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customer-portal \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Clerk-Token: eyJhbG..." \
  -H "Origin: https://yourapp.com"
```

#### GET /api/products - List store products
```bash
curl -X GET https://api-multi.k-c-sheffield012376.workers.dev/api/products \
  -H "Authorization: Bearer sk_test_xxx"
```

#### POST /api/cart/checkout - Store cart checkout
```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/cart/checkout \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "Content-Type: application/json" \
  -H "Origin: https://yourapp.com" \
  -d '{
    "email": "buyer@example.com",
    "items": [{"priceId": "price_xxx", "quantity": 1}],
    "successUrl": "https://yourapp.com/success",
    "cancelUrl": "https://yourapp.com/cancel"
  }'
```

#### GET /api/dashboard - Platform metrics
```bash
curl -X GET https://api-multi.k-c-sheffield012376.workers.dev/api/dashboard \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Publishable-Key: pk_test_xxx"
```

### front-auth-api (Dev Management)
```
POST /generate-platform-id     Create plt_xxx
GET  /get-credentials          Get test + live keys
GET  /projects                 List all projects
POST /projects/delete          DELETE ENTIRE PROJECT
POST /projects/regenerate-secret  New secret key
```

### oauth-api (Stripe Connect)
```
GET  /authorize                Start Stripe OAuth
POST /create-products          Create project + Stripe products
PUT  /tiers                    Edit tier (price, limit)
POST /promote-to-live          Test → Live
```

## D1 Tables

| Table | Key Fields |
|-------|------------|
| `platforms` | platformId, clerkUserId |
| `api_keys` | publishableKey (PK), secretKeyHash, mode, projectType, name |
| `tiers` | publishableKey, name, price, limit, priceId, productId, inventory |
| `subscriptions` | publishableKey, userId, plan, status, amount, subscriptionId |
| `usage_counts` | publishableKey, userId, plan, usageCount, periodStart/End |
| `end_users` | publishableKey, clerkUserId, email |
| `events` | eventId (unique), type, payload_json |

**CRITICAL:** Always filter by `publishableKey` to separate test/live data.

## KV Keys

```
# Auth lookups (api-multi)
secretkey:{sha256hash}:publishableKey → pk_xxx
publishablekey:{pk}:platformId → plt_xxx

# Dashboard credentials (front-auth-api)
user:{clerkUserId}:secretKey:live → sk_live_xxx
user:{clerkUserId}:secretKey:test → sk_test_xxx
```

## Two Clerk Apps

1. **dream-api** - Platform devs ($15/mo customers)
2. **end-user-api** - Shared app for ALL devs' end customers, isolated by `publishableKey` in metadata

## Key Management

**Regenerate Secret** - New `sk_xxx`, same `pk_xxx`. Old key dies instantly. Updates:
- D1: `api_keys.secretKeyHash`
- KV: `secretkey:{hash}:publishableKey`
- KV: `user:{userId}:secretKey:{mode}`

**Delete Project** - Nukes EVERYTHING for that project name:
- Both test + live keys
- All tiers, subscriptions, usage, events, end_users
- R2 assets
- KV cache entries

## URLs

- Frontend: https://dream-frontend-dyn.pages.dev
- front-auth-api: https://front-auth-api.k-c-sheffield012376.workers.dev
- oauth-api: https://oauth-api.k-c-sheffield012376.workers.dev
- api-multi: https://api-multi.k-c-sheffield012376.workers.dev

## Debugging

| Problem | Fix |
|---------|-----|
| "Invalid API key" | Hash sk with SHA-256, check D1 `api_keys.secretKeyHash`, clear KV cache |
| Dashboard shows old secret | Regen updates KV `user:{id}:secretKey:{mode}` |
| User not in dashboard | Check `end_users.publishableKey` matches project |
| Usage wrong test/live | Filter queries by `publishableKey` not just `platformId` |
| Limit always 0 | Check `X-User-Plan` header matches tier name in `tiers` table |

## Authentication Model (api-multi)

Two-layer auth model for security:

| Endpoint | Auth Required | Why |
|----------|---------------|-----|
| `POST /api/customers` | SK only | Dev creating customer - no user exists yet |
| `GET /api/customers/:id` | SK only | Dev fetching customer info |
| `PATCH /api/customers/:id` | SK only | Dev updating customer |
| `GET /api/products` | SK only | Public product catalog |
| `POST /api/cart/checkout` | SK only | Guest checkout (email in body) |
| `GET /api/dashboard` | SK only | Dev viewing their own metrics |
| `POST /api/assets` | SK only | Dev uploading assets |
| `POST /api/data` | SK + JWT | Usage tracking - must verify real user identity |
| `GET /api/usage` | SK + JWT | Usage check - must verify real user identity |
| `POST /api/create-checkout` | SK + JWT | Subscription upgrade - must verify who's upgrading |
| `POST /api/customer-portal` | SK + JWT | Billing portal - must verify who's managing |

**Security notes:**
- SK (secret key) = "I am developer X" - proves dev identity
- JWT (end-user token) = "I am end-user Y on dev X's platform" - proves user identity + plan
- Plan is in JWT's `publicMetadata.plan` - set by system during subscription, cannot be spoofed
- `publishableKey` in JWT must match the SK's project (prevents cross-project attacks)
- Clerk quotas can block new user creation (`user quota exceeded`); clear old test users or raise quota to test.

## What's Working (Dec 2025)

- [x] SaaS flow: signup → usage tracking → limits → checkout → subscription
- [x] Store flow: products → cart → checkout → inventory decrement
- [x] Project management: create, edit tiers, promote to live, delete, regen secret
- [x] Dashboard: metrics, customers, tiers with priceId/productId
- [x] Webhooks: subscription create/update, inventory decrement, idempotent
- [x] Stripe account ID shown in dashboard with link
- [x] Sold out badge computed from inventory (not stored flag)

## TODO

- [ ] Totals view - aggregate live revenue only
- [ ] Refresh button on dashboard
- [ ] SDK wrapper for devs
- [ ] PWA for mobile
- [ ] CSV export for transactions/customers
