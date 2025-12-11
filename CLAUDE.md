# dream-api - Technical Reference

**Updated:** Dec 11, 2025 | **Status:** MVP Working (redirect override + grace cancel TODO)

---

## Quick Context

API-as-a-Service: Devs pay $15/mo → get white-label auth + billing API for their customers.

**Two Clerk apps:**
- `dream-api` - Platform devs (pay you)
- `end-user-api` - Their customers (shared multi-tenant, isolated by `publishableKey`)

**Three keys:**
- `platformId` (plt_xxx) - Internal, never changes, KV only
- `publishableKey` (pk_live_xxx) - In end-user JWT, isolates data
- `secretKey` (sk_live_xxx) - API auth, SHA-256 hashed

---

## KV Structure

### front-auth-api TOKENS_KV (`d09d8bf4e63a47c495384e9ed9b4ec7e`)
```
user:{userId}:platformId         → plt_abc123
user:{userId}:publishableKey     → pk_live_xyz
user:{userId}:secretKey          → sk_live_abc (plaintext)
user:{userId}:products           → [{tier, priceId, productId}]
user:{userId}:stripeToken        → {accessToken, stripeUserId}
platform:{platformId}:userId     → userId
platform:{platformId}:stripeToken → {accessToken, stripeUserId}
publishablekey:{pk}:platformId   → plt_abc123
secretkey:{sha256}:publishableKey → pk_live_xyz
```

### api-multi TOKENS_KV (`a9f3331b0c8b48d58c32896482484208`)
```
platform:{platformId}:tierConfig  → {tiers: [{name, limit, price, priceId}]}
platform:{platformId}:stripeToken → {accessToken, stripeUserId}
publishablekey:{pk}:platformId    → plt_abc123
secretkey:{sha256}:publishableKey → pk_live_xyz
```

### api-multi USAGE_KV (`10cc8b9f46f54a6e8d89448f978aaa1f`)
```
usage:{platformId}:{userId}      → {usageCount, plan, periodStart, periodEnd}
ratelimit:{userId}:{minute}      → count
webhook:stripe:{eventId}         → timestamp (idempotency, 30-day TTL)
```

---

## JWT Templates

### dream-api (platform devs)
```json
{ "plan": "{{user.public_metadata.plan}}" }
```

### end-user-api (shared multi-tenant)
```json
{ "publishableKey": "{{user.public_metadata.publishableKey}}" }
```

---

## Key Files

| File | Purpose |
|------|---------|
| `api-multi/src/index.ts` | Main router, auth flow |
| `api-multi/src/middleware/apiKey.ts` | SK verification → platformId + publishableKey |
| `api-multi/src/routes/customers.ts` | Create/get/update customers in end-user-api |
| `api-multi/src/routes/usage.ts` | Track usage, enforce tier limits |
| `api-multi/src/routes/checkout.ts` | Stripe checkout on dev's account |
| `api-multi/src/stripe-webhook.ts` | Handle Connect webhooks, update Clerk plan |
| `oauth-api/src/index.ts` | Stripe Connect OAuth, product creation, key gen |

---

## Current Issues (Dec 9, 2025)

### 1. Checkout Redirect URL
**Problem:** Falls back to `app.panacea-tech.net` (old domain)
**Location:** `api-multi/src/routes/checkout.ts`
```typescript
const frontendUrl = origin || 'https://app.panacea-tech.net';  // ← needs update
```
**Fix options:**
- Update fallback to `dream-frontend-dyn.pages.dev`
- Let devs pass `successUrl`/`cancelUrl` in request body (preferred)

### 2. Graceful cancel
**Problem:** Currently plan downgrades on `customer.subscription.deleted` (at period end). If deleted event is missed, plan could stay pro.
**Next:** Store `current_period_end` from `customer.subscription.updated (cancel_at_period_end)` and downgrade after that if deleted is missed; optionally downgrade immediately when status becomes `canceled`.

**Location:** `api-multi/src/stripe-webhook.ts`

### 3. Checkout auth pattern (Standard Connect)
**Now:** Prefer connected account OAuth `accessToken` (no `Stripe-Account`). Fallback: platform `STRIPE_SECRET_KEY` + `Stripe-Account` header if access token missing.

---

## Test Customer (Dec 9, 2025)

```
Name: Sharon Sheffield
Email: sharon.sheffield@example.com
ID: user_36cd84eF3m4MI8hDhgMnA63FxxS
Plan: free (should be pro after payment)
publishableKey: pk_live_xxx (check KV for actual value)
```

---

## Environment Variables

### api-multi/.dev.vars
```bash
CLERK_SECRET_KEY=sk_test_...      # end-user-api Clerk
CLERK_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...     # YOUR platform Stripe (for Connect)
STRIPE_WEBHOOK_SECRET=whsec_...   # Connect webhook signing secret
FRONTEND_URL=http://localhost:5173
```

### oauth-api/.dev.vars
```bash
STRIPE_CLIENT_ID=ca_...           # Stripe Connect app ID
STRIPE_CLIENT_SECRET=sk_test_...  # YOUR platform Stripe
CLERK_SECRET_KEY=sk_test_...      # dream-api Clerk
FRONTEND_URL=http://localhost:5173
```

### front-auth-api/.dev.vars
```bash
CLERK_SECRET_KEY=sk_test_...      # dream-api Clerk
STRIPE_SECRET_KEY=sk_test_...     # YOUR platform Stripe
STRIPE_PRICE_ID=price_...         # $15/mo product
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
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

## Architecture Decisions

**Why 3 keys?** Key rotation without data migration. New pk/sk linked to same platformId.

**Why duplicate KV?** api-multi needs fast tier lookups. Cross-namespace = +30ms per call.

**Why shared Clerk?** One app for all devs' customers. Isolation via publishableKey in JWT.

**Why Stripe Connect Standard?** Devs keep 100% revenue. No platform fees. They own the customer relationship.

---

## Next Phase

1. Fix checkout redirect (quick)
2. Debug webhook (medium - need logs)
3. D1 database for analytics
4. Dashboard UI (customers, MRR, usage charts)
5. SDK: `npm install dream-api`
6. AI integration helper (generate framework-specific code)

---

## Useful Commands

```bash
# Check Sharon's plan
curl -X GET "https://api-multi.k-c-sheffield012376.workers.dev/api/customers/user_36cd84eF3m4MI8hDhgMnA63FxxS" \
  -H "Authorization: Bearer sk_live_xxx"

# Check usage
curl https://api-multi.k-c-sheffield012376.workers.dev/api/usage \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "X-User-Id: user_36cd84eF3m4MI8hDhgMnA63FxxS" \
  -H "X-User-Plan: free"

# View worker logs
wrangler tail api-multi
```
