# dream-api

**Status:** Working MVP - Core API functional, ready for full flow test

**Last Updated:** Dec 7, 2025

---

## What This Is

A **$15/mo API** that gives indie devs auth + billing + usage tracking for their SaaS.

**You built:**
- API key authentication ✅
- Multi-tenant usage tracking ✅
- Stripe checkout (on dev's account) ✅
- Tier limit enforcement ✅
- Customer creation (shared Clerk app) ✅

**What devs get:**
```javascript
// That's it. Auth + billing handled.
const customer = await dream.customers.create({ email, plan: 'free' });
await dream.track(customer.id); // Enforces limits
const checkout = await dream.checkout(customer.id, 'pro'); // Their Stripe
```

---

## Current Status

### ✅ What Works (Tested Dec 7, 2025)

| Component | Status | Evidence |
|-----------|--------|----------|
| API key auth | ✅ Working | Curl test passed with `sk_live_da1...` |
| Usage tracking | ✅ Working | Count increments, limit enforced at 3 |
| Customer creation | ✅ Working | Created `user_36Wkl...` with `publishableKey` |
| Tier limits | ✅ Working | Blocked after 3 requests with "Please upgrade" |
| Checkout endpoint | ⚠️ Needs tierConfig | Uses dev's Stripe token from KV |
| Webhook | ⚠️ Configured | `whsec_sdxn...` set, not tested yet |

### 🔧 Known Issues

1. **Price IDs not displaying** - Frontend credentials page not showing products (they exist in KV at `user:{userId}:products`)
2. **Tier config missing from api-multi KV** - Need to re-run flow after oauth-api redeployment
3. **Free tier** - Should create $0 Stripe product for consistency

### 📋 Next Actions (In Order)

1. Clean up KV (you're doing this)
2. Test full flow: signup → pay → OAuth → tiers → keys
3. Verify price IDs appear in KV
4. Test checkout with real tier config
5. Build dashboard (D1 + webhooks)

---

## Architecture

### The Three Keys

```
platformId: plt_xxx
  ↓ Internal stable ID (never changes)
  ↓ Used for KV lookups, tier configs
  ↓
publishableKey: pk_live_xxx
  ↓ Public identifier (in end-user JWT)
  ↓ Isolates customers between devs
  ↓
secretKey: sk_live_xxx
  ↓ API authentication (SHA-256 hashed)
  ↓ Dev uses this to call your API
```

**Why three?** Key rotation. Dev can generate new `pk`/`sk` pairs without losing customer data (still linked to same `platformId`).

### Two Clerk Apps

| App | Purpose | JWT |
|-----|---------|-----|
| `dream-api` | YOUR devs who pay you | `{ plan: "paid" }` |
| `end-user-api` | THEIR customers (SHARED) | `{ publishableKey: "pk_live_xxx" }` |

**The magic:** All devs share ONE Clerk app for their customers. `publishableKey` in JWT keeps them isolated.

### Four Workers

| Worker | Port | Deployed | Purpose |
|--------|------|----------|---------|
| frontend | 5173 | ❌ | React dashboard |
| front-auth-api | 8788 | ✅ | Dev signup/payment |
| oauth-api | 8789 | ✅ | Stripe Connect |
| api-multi | 8787 | ✅ | Customer API |

### Four KV Namespaces

| Namespace | ID (last 4) | Used For |
|-----------|-------------|----------|
| front-auth-api TOKENS | `...ec7e` | Dev credentials, keys |
| front-auth-api USAGE | `...8df25` | Dev API usage |
| api-multi TOKENS | `...84208` | Tier configs (copied) |
| api-multi USAGE | `...aaa1f` | Customer usage |

---

## The Complete Flow

### 1. Developer Onboarding

```
Signup (Clerk) → platformId generated → Pay $15 → Stripe webhook
  → plan = "paid" → Connect Stripe → OAuth callback → Save token
  → Configure tiers → POST /create-products → Generate keys
  → Display credentials
```

**Keys written to:**
- front-auth-api: `user:{userId}:publishableKey`, `user:{userId}:secretKey`
- api-multi: `secretkey:{hash}:publishableKey`, `platform:{platformId}:tierConfig`

### 2. Developer Integration

```javascript
// Create customer
POST /api/customers
Authorization: Bearer sk_live_xxx
Body: { email, firstName, lastName, plan: "free", password }

// Response
{
  "customer": {
    "id": "user_xxx",
    "email": "customer@example.com",
    "publishableKey": "pk_live_xxx"
  }
}
```

**What happened:**
- User created in `end-user-api` Clerk
- `publicMetadata.publishableKey` set
- Customer JWT will have `{ publishableKey: "pk_live_xxx" }`

### 3. Usage Tracking

```javascript
// Track usage (enforces tier limits)
POST /api/data
Authorization: Bearer sk_live_xxx
X-User-Id: user_xxx
X-User-Plan: free

// Success response
{
  "success": true,
  "usage": { "count": 1, "limit": 100, "plan": "free" }
}

// At limit
{
  "error": "Tier limit reached",
  "message": "Please upgrade to unlock more requests"
}
```

### 4. Upgrade Flow

```javascript
// Create checkout session
POST /api/create-checkout
Authorization: Bearer sk_live_xxx
X-User-Id: user_xxx
Body: { tier: "pro" }

// Response
{ "url": "https://checkout.stripe.com/..." }

// Redirect customer → they pay on dev's Stripe → webhook updates plan
```

---

## API Endpoints (api-multi)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | None | Health check |
| `/api/tiers` | GET | None | List pricing tiers |
| `/api/customers` | POST | API key | Create customer in Clerk |
| `/api/customers/:id` | GET | API key | Get customer |
| `/api/customers/:id` | PATCH | API key | Update customer plan |
| `/api/data` | POST | API key | Track usage, enforce limits |
| `/api/usage` | GET | API key | Check current usage |
| `/api/create-checkout` | POST | API key | Stripe checkout (upgrade) |
| `/api/customer-portal` | POST | API key | Stripe billing portal |
| `/webhook/stripe` | POST | Signature | Connect webhook |

**Base URL:** `https://api-multi.k-c-sheffield012376.workers.dev`

---

## Environment Variables

### front-auth-api
```bash
CLERK_SECRET_KEY=sk_test_...        # dream-api Clerk app
CLERK_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...       # YOUR Stripe ($15 payment)
STRIPE_PRICE_ID=price_...           # $15/mo product
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

### oauth-api
```bash
STRIPE_CLIENT_ID=ca_...             # Stripe Connect app
STRIPE_CLIENT_SECRET=sk_test_...    # YOUR Stripe key
CLERK_SECRET_KEY=sk_test_...        # dream-api Clerk
CLERK_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
```

### api-multi
```bash
CLERK_SECRET_KEY=sk_test_...        # end-user-api Clerk
CLERK_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173

# NOTE: NO STRIPE_SECRET_KEY!
# Checkout uses dev's token from KV: platform:{platformId}:stripeToken
```

---

## Testing Guide

### Test 1: API Key Auth + Usage Tracking

```bash
# Track usage
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/data \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "X-User-Id: test_user_1" \
  -H "X-User-Plan: free"

# Expected: {"success":true,"usage":{"count":1,"limit":3}}

# Repeat until limit
# Expected: {"error":"Tier limit reached"}
```

### Test 2: Create Customer

```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customers \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "plan": "free",
    "password": "UniquePassword123xyz"
  }'

# Expected: {"success":true,"customer":{...,"publishableKey":"pk_live_xxx"}}
```

### Test 3: Verify in Clerk

Go to end-user-api Clerk dashboard → Users → Check metadata:
```json
{
  "publishableKey": "pk_live_xxx",
  "plan": "free"
}
```

---

## KV Structure (Complete Reference)

### front-auth-api TOKENS_KV
```
user:{userId}:platformId → plt_abc123
user:{userId}:publishableKey → pk_live_xyz
user:{userId}:secretKey → sk_live_abc (plaintext, one-time show)
user:{userId}:products → [{tier, priceId, productId}]
user:{userId}:stripeToken → {accessToken, stripeUserId}

platform:{platformId}:userId → userId
platform:{platformId}:stripeToken → {accessToken, stripeUserId}

publishablekey:{pk_live_xyz}:platformId → plt_abc123
secretkey:{sha256hash}:publishableKey → pk_live_xyz
```

### api-multi TOKENS_KV
```
platform:{platformId}:tierConfig → {tiers: [{name, limit, price, priceId, productId}]}
platform:{platformId}:stripeToken → {accessToken, stripeUserId}

publishablekey:{pk_live_xyz}:platformId → plt_abc123
secretkey:{sha256hash}:publishableKey → pk_live_xyz
```

### api-multi USAGE_KV
```
usage:{platformId}:{userId} → {usageCount, plan, periodStart, periodEnd}
ratelimit:{userId}:{minute} → count
```

---

## Common Issues & Fixes

### "Invalid API key"
**Cause:** `secretkey:{hash}:publishableKey` not in api-multi TOKENS_KV
**Fix:** oauth-api now writes to both namespaces (redeployed), re-generate keys

### "No price ID configured for tier: pro"
**Cause:** `platform:{platformId}:tierConfig` missing from api-multi TOKENS_KV
**Fix:** Re-run tier config flow (oauth-api now copies to api-multi)

### Price IDs not showing on credentials page
**Cause:** Frontend not reading `user:{userId}:products` from KV
**Fix:** Update Credentials.tsx to fetch and display products

### Clerk "Password has been found in an online data breach"
**Cause:** Clerk checks HaveIBeenPwned database
**Fix:** Use unique passwords: `xK9mNp2qRs5vWz8a` or similar

---

## What Makes This Special

**For devs:**
- No Clerk account (use YOUR shared app)
- No Stripe platform fees (Connect Standard)
- No server (API handles everything)
- $15/mo flat (no per-user costs)

**For you:**
- 200 customers = $3,000 MRR
- Cloudflare = ~$5/mo at this scale
- No support burden (devs own Stripe)
- Scalable (one Clerk app, millions of users)

**The innovation:**
- Multi-tenancy via JWT claims (`publishableKey`)
- Three-key system for rotation without data loss
- Stripe Connect lets devs keep 100% of revenue
- Shared Clerk app = zero per-user costs

---

## Roadmap

### MVP (This Week)
- [x] API key auth
- [x] Usage tracking
- [x] Customer creation
- [x] Tier enforcement
- [ ] Fix price ID display
- [ ] Test full flow

### Phase 2: Dashboard
- [ ] D1 schema
- [ ] Clerk webhook → D1
- [ ] Stripe webhook → D1
- [ ] Dashboard UI (customers, MRR)

### Phase 3: Developer Experience
- [ ] SDK (`npm install dream-api`)
- [ ] Better errors
- [ ] Usage webhooks

### Phase 4: Scale
- [ ] Key rotation
- [ ] Multiple keys (prod/staging)
- [ ] Custom domains
- [ ] SSO

---

## Files to Understand

| File | What It Does |
|------|--------------|
| `CLAUDE.md` | Detailed session notes, architecture decisions |
| `api-multi/src/middleware/apiKey.ts` | API key verification (returns platformId + publishableKey) |
| `api-multi/src/routes/customers.ts` | Customer creation in end-user-api Clerk |
| `api-multi/src/routes/usage.ts` | Usage tracking, tier enforcement |
| `api-multi/src/routes/checkout.ts` | Stripe checkout (uses dev's token from KV) |
| `oauth-api/src/index.ts` | Product creation, key generation, KV writes |
| `frontend/src/pages/Credentials.tsx` | Displays keys (needs fix for price IDs) |

---

## Success Criteria

You'll know it works when:
1. ✅ Signup → credentials page shows `pk_live_xxx` and `sk_live_xxx`
2. ✅ Curl with `sk_live_xxx` → usage tracked
3. ✅ Hit limit → blocked with "Please upgrade"
4. ✅ Create customer → appears in end-user-api Clerk with `publishableKey`
5. ⏳ Checkout → redirects to dev's Stripe, webhook updates plan

**Current score:** 4/5 ✅

---

## License

MIT
