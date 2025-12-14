# dream-api

**$15/mo API** - Auth, billing, usage tracking for indie devs.

**Status:** Working | **Updated:** Dec 2024

---

## What Devs Get

```javascript
// Track usage (enforces tier limits)
const res = await fetch('https://api-multi.../api/data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'user_123',
    'X-User-Plan': 'free'
  }
});
// → { allowed: true, usage: { count: 1, limit: 100 } }
// At limit → { error: "Tier limit reached" }

// Upgrade via Stripe checkout
const checkout = await fetch('https://api-multi.../api/create-checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'user_123'
  },
  body: JSON.stringify({ tier: 'pro', successUrl: '...' })
});
// → { url: "https://checkout.stripe.com/..." }

// One-off cart checkout
const cart = await fetch('https://api-multi.../api/cart/checkout', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer sk_test_xxx' },
  body: JSON.stringify({
    email: 'buyer@example.com',
    items: [{ priceId: 'price_xxx', quantity: 1 }]
  })
});
// → { url: "https://checkout.stripe.com/..." }
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR PLATFORM                            │
├─────────────────────────────────────────────────────────────────┤
│  frontend (5173)       → React dashboard                        │
│  front-auth-api (8788) → Dev signup, $15 payment               │
│  oauth-api (8789)      → Stripe Connect, tier config           │
│  api-multi (8787)      → Customer API (what devs integrate)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     KEY SYSTEM                                   │
├─────────────────────────────────────────────────────────────────┤
│  platformId (plt_xxx)      → Internal ID, never changes         │
│  publishableKey (pk_test)  → Mode-specific, in end-user JWT     │
│  secretKey (sk_test)       → API auth, SHA-256 hashed           │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/customers` | POST | Create customer |
| `/api/customers/:id` | GET | Get customer |
| `/api/customers/:id` | PATCH | Update plan |
| `/api/data` | POST | Track usage |
| `/api/usage` | GET | Check usage |
| `/api/create-checkout` | POST | Subscription checkout |
| `/api/customer-portal` | POST | Billing portal |
| `/api/products` | GET | One-off products |
| `/api/cart/checkout` | POST | Cart checkout |
| `/api/dashboard` | GET | Platform data |
| `/webhook/stripe` | POST | Stripe webhook |

**Base:** `https://api-multi.k-c-sheffield012376.workers.dev`

**Auth:** `Authorization: Bearer sk_test_xxx` or `sk_live_xxx`

---

## Test vs Live Mode

- **Test keys**: `pk_test_xxx`, `sk_test_xxx` - sandbox testing
- **Live keys**: `pk_live_xxx`, `sk_live_xxx` - real payments
- Same platformId, separate products/customers per mode
- Dashboard toggle switches view between modes

---

## UI

**Dashboard** (`/dashboard`)
- Dark theme
- Tabs: SaaS | Store
- Mode toggle: Test (amber) | Live (green)
- Keys: Both shown side-by-side
- Actions: Edit Tiers, + New Project

**Config** (`/api-tier-config`)
- Create mode: New project, generates keys
- Edit mode: Update tiers, keeps existing keys
- Forms: SaaS (price/limit) | Store (price/inventory/image)

---

## Quick Test

```bash
# Check usage
curl https://api-multi.k-c-sheffield012376.workers.dev/api/usage \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_123" \
  -H "X-User-Plan: free"

# Track usage
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/data \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_123" \
  -H "X-User-Plan: free"

# Create checkout
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/create-checkout \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_123" \
  -H "Content-Type: application/json" \
  -d '{"tier":"pro","successUrl":"https://example.com/success"}'
```

---

## Local Dev

```bash
cd frontend && npm run dev        # :5173
cd front-auth-api && npm run dev  # :8788
cd oauth-api && npm run dev       # :8789
cd api-multi && npm run dev       # :8787
```

---

## Deployment

```bash
# Auto-deploy via GitHub/Cloudflare connector
git add -A && git commit -m "message" && git push
```

**URLs:**
- Frontend: https://dream-frontend-dyn.pages.dev
- API: https://api-multi.k-c-sheffield012376.workers.dev

---

See `CLAUDE.md` for technical deep-dive.
