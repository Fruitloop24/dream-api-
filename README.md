# dream-api

**API-as-a-Service for indie devs.** $15/mo gets you auth, billing, usage tracking, and a dashboard.

## What You Get

- **API Keys** - Publishable + Secret key pair
- **Stripe Billing** - On YOUR Stripe account via Connect
- **Usage Tracking** - Limits enforced per tier
- **Dashboard** - Customers, MRR, usage metrics
- **No Webhooks** - We handle everything internally

## Two Modes

**SaaS** - Subscription tiers with usage limits
```js
// Track API usage
const res = await fetch('https://api-multi.../api/data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'user_123',
    'X-User-Plan': 'pro'
  }
});
// { allowed: true, usage: { count: 1, limit: 1000 } }
// At limit: { allowed: false, error: "Tier limit reached" }
```

**Store** - One-off products with cart checkout
```js
// Cart checkout
const res = await fetch('https://api-multi.../api/cart/checkout', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer sk_test_xxx' },
  body: JSON.stringify({
    email: 'buyer@example.com',
    items: [{ priceId: 'price_xxx', quantity: 1 }]
  })
});
// { url: "https://checkout.stripe.com/..." }
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/data` | POST | Track usage (enforces limits) |
| `/api/usage` | GET | Check current usage |
| `/api/create-checkout` | POST | Subscription checkout |
| `/api/cart/checkout` | POST | One-off cart checkout |
| `/api/products` | GET | List store products |
| `/api/customer-portal` | POST | Stripe billing portal |
| `/api/dashboard` | GET | Your platform data |

**Base URL:** `https://api-multi.k-c-sheffield012376.workers.dev`

**Auth:** `Authorization: Bearer sk_test_xxx` or `sk_live_xxx`

## Quick Start

1. Sign up at https://dream-frontend-dyn.pages.dev
2. Pay $15/mo
3. Connect Stripe
4. Choose: **SaaS** or **Store** (locked per project)
5. Configure tiers/products
6. Get your API keys
7. Integrate into your app

## Test vs Live

- `pk_test_` / `sk_test_` - Stripe sandbox
- `pk_live_` / `sk_live_` - Real payments

Create test first, then "Go Live" when ready.

## Local Dev

```bash
cd frontend && npm run dev        # :5173
cd front-auth-api && npm run dev  # :8788
cd oauth-api && npm run dev       # :8789
cd api-multi && npm run dev       # :8787
```

## Deploy

Auto-deploy via GitHub → Cloudflare:
```bash
git add -A && git commit -m "message" && git push
```

## Docs

See [CLAUDE.md](./CLAUDE.md) for full technical reference.
