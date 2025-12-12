# dream-api

**$15/mo API** - Auth + billing + usage tracking for indie SaaS devs.

**Status:** MVP Working | **Updated:** Dec 11, 2025

---

## What Devs Get

```javascript
// Create customer (in YOUR shared Clerk app)
const customer = await fetch('/api/customers', {
  headers: { 'Authorization': 'Bearer sk_live_xxx' },
  body: JSON.stringify({ email: 'user@example.com', plan: 'free', password: 'SecurePass123' })
});

// Track usage (enforces tier limits)
await fetch('/api/data', {
  headers: {
    'Authorization': 'Bearer sk_live_xxx',
    'X-User-Id': customer.id,
    'X-User-Plan': 'free'
  }
});
// Returns: { usage: { count: 1, limit: 100 } }
// At limit: { error: "Tier limit reached", message: "Please upgrade" }

// Upgrade via Stripe checkout (on THEIR Stripe account)
const checkout = await fetch('/api/create-checkout', {
  headers: { 'Authorization': 'Bearer sk_live_xxx', 'X-User-Id': customer.id },
  body: JSON.stringify({ tier: 'pro', successUrl: 'https://their-app.com/success' })
});
// Returns: { url: "https://checkout.stripe.com/..." }
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR PLATFORM                            │
├─────────────────────────────────────────────────────────────────┤
│  frontend (5173)     → React dashboard                          │
│  front-auth-api (8788) → Dev signup, $15 payment               │
│  oauth-api (8789)    → Stripe Connect, tier config, key gen    │
│  api-multi (8787)    → Customer API (what devs integrate)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      TWO CLERK APPS                             │
├─────────────────────────────────────────────────────────────────┤
│  dream-api       → YOUR devs (who pay $15/mo)                  │
│  end-user-api    → THEIR customers (shared, multi-tenant)      │
│                    Isolated by: publicMetadata.publishableKey   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     THREE KEY SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│  platformId (plt_xxx)     → Internal ID, never changes         │
│  publishableKey (pk_live) → In end-user JWT, isolates data     │
│  secretKey (sk_live)      → API auth, SHA-256 hashed           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tested Flow (Dec 9, 2025)

```bash
# 1. Create customer
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customers \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"email": "sharon@example.com", "firstName": "Sharon", "lastName": "Sheffield", "password": "UniquePass123xyz", "plan": "free"}'
# → {"success":true,"customer":{"id":"user_xxx","plan":"free"}}

# 2. Check usage
curl https://api-multi.k-c-sheffield012376.workers.dev/api/usage \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "X-User-Id: user_xxx" \
  -H "X-User-Plan: free"
# → {"usageCount":0,"limit":2,"remaining":2}

# 3. Track usage (repeat until limit)
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/data \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "X-User-Id: user_xxx" \
  -H "X-User-Plan: free"
# → {"success":true,"usage":{"count":1,"limit":2}}
# → {"success":true,"usage":{"count":2,"limit":2}}
# → {"error":"Tier limit reached","message":"Please upgrade"}

# 4. Create checkout to upgrade
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/create-checkout \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "X-User-Id: user_xxx" \
  -H "Content-Type: application/json" \
  -d '{"tier": "pro"}'
# → {"url":"https://checkout.stripe.com/..."}
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/customers` | POST | Create customer in shared Clerk |
| `/api/customers/:id` | GET | Get customer |
| `/api/customers/:id` | PATCH | Update plan |
| `/api/data` | POST | Track usage, enforce limits |
| `/api/usage` | GET | Check current usage |
| `/api/create-checkout` | POST | Stripe checkout (upgrade) |
| `/api/customer-portal` | POST | Stripe billing portal |
| `/webhook/stripe` | POST | Connect webhook |
| `/api/tiers` | GET | List pricing tiers |
| `/api/dashboard` | GET | Platform snapshot (customers, usage, tiers, metrics, events) |
| `/health` | GET | Health check |

**Base:** `https://api-multi.k-c-sheffield012376.workers.dev`

**All protected endpoints require:** `Authorization: Bearer sk_live_xxx`

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Checkout redirect URL | Needs fix | Falls back to old `app.panacea-tech.net` domain; allow override via body |
| Graceful cancel | TODO | Keep access until period end; currently downgrades when Stripe sends `customer.subscription.deleted` |
| successUrl/cancelUrl | TODO | Let devs pass their own redirect URLs |
| Tier config priceIds | Ensure KV hydrated | Checkout needs priceIds; tiers now stored in D1 and loaded first (KV is cache) |

---

## Deployment

```
Frontend:  https://dream-frontend-dyn.pages.dev
Platform:  https://front-auth-api.k-c-sheffield012376.workers.dev
OAuth:     https://oauth-api.k-c-sheffield012376.workers.dev
API:       https://api-multi.k-c-sheffield012376.workers.dev
```

---

## Local Dev

```bash
cd frontend && npm run dev        # :5173
cd front-auth-api && npm run dev  # :8788
cd oauth-api && npm run dev       # :8789
cd api-multi && npm run dev       # :8787
```

### Quick Tests (curl)

```bash
# Create customer (free)
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customers \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User","password":"S3cure!Pass#2025$zY","plan":"free"}'

# Usage check
curl https://api-multi.k-c-sheffield012376.workers.dev/api/usage \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "X-User-Id: user_xxx" \
  -H "X-User-Plan: free"

# Track usage
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/data \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "X-User-Id: user_xxx" \
  -H "X-User-Plan: free"

# Create checkout (upgrade)
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/create-checkout \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_xxx" \
  -d '{"tier": "pro", "successUrl": "https://example.com/success", "cancelUrl": "https://example.com/cancel"}'

# Customer portal (cancel at period end)
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customer-portal \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_xxx"
```

---

## Next Steps

1. **Checkout redirect override** - allow success/cancel overrides everywhere
2. **Hydrate tier config** - Ensure D1/KV have priceIds (used by checkout)
3. **Dashboard polish** - Per-customer actions (portal/checkout/plan change), key management UI
4. **SDK** - `npm install dream-api` for easy integration
5. **AI Integration Helper** - Generate framework-specific code

---

See `CLAUDE.md` for technical deep-dive (KV structure, JWT templates, architecture decisions).
