# dream-api - Technical Reference

**Last Updated:** 2025-12-07 (MVP Complete)

---

## System Overview

API-as-a-Service platform. Developers pay $15/mo to get white-label auth + billing API for their customers.

**Two Clerk apps:**
1. **dream-api** - Platform developers (who pay us)
2. **end-user-api** - Their customers (shared multi-tenant app)

**Three key identifiers:**
- `platformId` (plt_xxx) - Internal stable ID, never changes, stored in KV only
- `publishableKey` (pk_live_xxx) - Public identifier in end-user JWT, isolates data
- `secretKey` (sk_live_xxx) - Server-side API auth, SHA-256 hashed in KV

---

## Key System

### platformId (plt_xxx)
- Generated IMMEDIATELY after first login
- Stable internal ID that NEVER changes
- Stored in KV only (NEVER in JWT, NEVER exposed to client)
- Allows multiple key pairs per developer (prod/staging/test)

### publishableKey (pk_live_xxx)
- Generated AFTER tier configuration
- Lives in end-user-api JWT (NOT dream-api JWT)
- Isolates end-user data between developers
- All developers share ONE Clerk app (end-user-api), filtered by publishableKey

### secretKey (sk_live_xxx)
- Generated with publishableKey
- SHA-256 hashed before storing in KV
- Used in API calls: `Authorization: Bearer sk_live_xxx`
- Plaintext shown ONCE on /credentials page

---

## Data Flow

**Signup → Credentials:**
1. Developer signs up (Clerk dream-api)
2. platformId generated → saved to KV
3. Stripe payment ($15/mo)
4. Stripe Connect OAuth (dev connects their Stripe account)
5. Tier configuration UI (free/pro/enterprise)
6. oauth-api creates Stripe products on dev's account
7. publishableKey + secretKey generated
8. Keys displayed on /credentials page

**Developer Integration:**
```bash
POST /api/customers
Authorization: Bearer sk_live_xxx
Body: {email, name, plan: "free"}
```

**api-multi flow:**
1. Hash secretKey → lookup publishableKey
2. Lookup platformId from publishableKey
3. Create user in end-user-api Clerk app
4. Set metadata: `publicMetadata.publishableKey = pk_live_xxx`
5. Track usage in KV
6. Return customer object

**End-user JWT:**
```json
{
  "publishableKey": "pk_live_xxx"
}
```

---

## KV Namespace Mappings

### front-auth-api TOKENS_KV - `d09d8bf4e63a47c495384e9ed9b4ec7e`
```
user:{userId}:platformId → plt_abc123
platform:{platformId}:userId → userId
user:{userId}:stripeToken → {accessToken, stripeUserId}
platform:{platformId}:stripeToken → {accessToken, stripeUserId}
user:{userId}:publishableKey → pk_live_xyz789
user:{userId}:secretKey → sk_live_abc123  # PLAINTEXT
user:{userId}:products → [{tier, priceId, productId}]
publishablekey:{pk_live_xyz}:platformId → plt_abc123
secretkey:{sha256hash}:publishableKey → pk_live_xyz789
```

### front-auth-api USAGE_KV - `6a3c39a8ee9b46859dc237136048df25`
```
usage:{userId} → {usageCount, plan, lastUpdated, periodStart, periodEnd}
ratelimit:{userId}:{minute} → count
```

### api-multi TOKENS_KV - `a9f3331b0c8b48d58c32896482484208`
```
platform:{platformId}:tierConfig → {tiers: [{name, limit, priceId, productId, price, features}]}
publishablekey:{pk_live_xyz}:platformId → plt_abc123
secretkey:{sha256hash}:publishableKey → pk_live_xyz789
```

### api-multi USAGE_KV - `10cc8b9f46f54a6e8d89448f978aaa1f`
```
usage:{publishableKey}:{userId} → {usageCount, plan, lastUpdated}
ratelimit:{userId}:{minute} → count
```

**Why duplicate data:** api-multi needs fast tier limit lookups without cross-namespace queries.

---

## JWT Templates

### dream-api (platform developers)
```json
{
  "plan": "{{user.public_metadata.plan}}"
}
```
No publishableKey in JWT - not needed for platform access.

### end-user-api (shared multi-tenant app)
```json
{
  "publishableKey": "{{user.public_metadata.publishableKey}}"
}
```
publishableKey isolates data between developers' customers.

---

## Architecture Decisions

### Why separate platformId and publishableKey?
Key rotation without data migration. Developer can generate new keys linked to same platformId without updating customer metadata.

### Why duplicate tierConfig in api-multi namespace?
Performance. Every API call needs tier limits. Copying to api-multi avoids cross-namespace queries (saves 20-30ms per call).

### Why shared end-user-api Clerk app?
Simpler than creating/deleting Clerk apps per developer. Data isolation via publishableKey in JWT.

---

## Current Status (Dec 7, 2025)

### Working Features:
- ✅ Full signup → credentials flow
- ✅ API key authentication (SHA-256 hashed)
- ✅ Customer management (POST /api/customers)
- ✅ Usage tracking & tier limits
- ✅ Stripe checkout (POST /api/checkout)
- ✅ Webhook handling (checkout.session.completed, customer.subscription.*)

### Next Phase:
- D1 database for analytics (customers, usage_logs, revenue tables)
- Dashboard API endpoints (GET /api/analytics/*)
- Dashboard UI (customer list, usage charts, MRR metrics)

---

## Local Development

**Start services:**
```bash
cd frontend && npm run dev        # :5173
cd front-auth-api && npm run dev  # :8788
cd oauth-api && npm run dev       # :8789
cd api-multi && npm run dev       # :8787
```

**Environment variables:**

front-auth-api/.dev.vars:
```bash
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

oauth-api/.dev.vars:
```bash
STRIPE_CLIENT_ID=ca_...
STRIPE_CLIENT_SECRET=sk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
```

api-multi/.dev.vars:
```bash
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Deployment URLs

```
Frontend:  https://dream-frontend-dyn.pages.dev
Platform:  https://front-auth-api.k-c-sheffield012376.workers.dev
OAuth:     https://oauth-api.k-c-sheffield012376.workers.dev
API:       https://api-multi.k-c-sheffield012376.workers.dev
```

---

## Security

- API key hashing (SHA-256)
- Webhook signature verification
- CORS origin validation
- JWT-based data isolation
- No credentials in logs
- Idempotent webhook handling
- Rate limiting (100 req/min)
- Tier limit enforcement

---

*Last updated: Dec 7, 2025 - MVP working end-to-end*
