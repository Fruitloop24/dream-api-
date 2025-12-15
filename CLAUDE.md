# dream-api - Technical Reference

**Updated:** 2024-12-14 | **Status:** Working

## What This Is

API-as-a-Service platform. Devs pay $15/mo, get API keys, auth, billing, usage tracking, dashboard.

**Two business types (mutually exclusive per key):**
1. **SaaS** - Subscription tiers with usage limits, recurring billing
2. **Store** - One-off products with inventory, cart checkout

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend       │     │  front-auth-api │     │  oauth-api      │
│  (React/Clerk)  │────▶│  (dev auth/pay) │────▶│  (Stripe OAuth) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        api-multi                                 │
│  Customer-facing API that devs integrate into their apps        │
│  - Usage tracking     - Checkout      - Products                │
│  - Dashboard data     - Webhooks      - Customer portal         │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   [D1 Database]        [KV Store]           [R2 Bucket]
```

## Key Concepts

### publishableKey = Project
Each `publishableKey` IS a project. It determines:
- **Business type**: SaaS or Store (locked at creation)
- **Mode**: Test (`pk_test_`) or Live (`pk_live_`)
- **Tiers/Products**: Linked via `publishableKey` column
- **Customers**: Scoped to this key

### Two Clerk Apps
- `dream-api` - Platform devs who pay $15/mo
- `end-user-api` - Shared app for all devs' end customers

### Key Format
```
Test:  pk_test_xxx, sk_test_xxx
Live:  pk_live_xxx, sk_live_xxx
```
Both tied to same `platformId` (plt_xxx)

## Services

### frontend (React + Clerk)
- `/dashboard` - Metrics, customers, keys, tiers
- `/api-tier-config` - Create/edit products
- `/credentials` - Post-creation key display

### front-auth-api
Dev authentication and platform setup.
```
POST /generate-platform-id  - Creates plt_xxx on first login
POST /create-checkout       - $15/mo subscription checkout
GET  /get-credentials       - Returns test AND live keys
POST /upload-asset          - R2 image upload
GET  /projects              - List dev's projects
```

### oauth-api
Stripe Connect OAuth and product management. **Modular routes:**
```
routes/
  oauth.ts     - /authorize, /callback (Stripe Connect flow)
  products.ts  - /create-products (new project + keys)
  tiers.ts     - /tiers CRUD (edit without new keys)
  promote.ts   - /promote-to-live (test → live)
```

### api-multi
Customer-facing API that devs integrate.
```
POST /api/data            - Usage increment + limit check
GET  /api/usage           - Check current usage
POST /api/create-checkout - Subscription checkout
POST /api/cart/checkout   - One-off cart checkout
GET  /api/products        - List one-off products
GET  /api/dashboard       - Platform dashboard data
POST /api/customer-portal - Stripe billing portal
POST /webhook/stripe      - Stripe Connect webhook
```

## D1 Schema

```sql
platforms (
  platformId TEXT PRIMARY KEY,   -- plt_xxx
  clerkUserId TEXT,
  createdAt TEXT
)

api_keys (
  platformId TEXT,
  publishableKey TEXT,           -- pk_test_xxx or pk_live_xxx
  secretKeyHash TEXT,            -- SHA-256 hashed
  status TEXT,                   -- active/revoked
  mode TEXT,                     -- test/live
  projectType TEXT,              -- saas/store (LOCKED)
  name TEXT,                     -- Project display name
  createdAt TEXT
)

tiers (
  platformId TEXT,
  publishableKey TEXT,           -- Links tier to project
  projectType TEXT,              -- saas/store
  name TEXT,                     -- tier ID (free, pro, etc)
  displayName TEXT,
  price REAL,
  "limit" INTEGER,               -- NULL = unlimited
  priceId TEXT,                  -- Stripe price ID
  productId TEXT,                -- Stripe product ID
  features TEXT,                 -- JSON (for store: description, imageUrl)
  popular INTEGER,               -- 0/1
  inventory INTEGER,             -- Stock count (store only)
  soldOut INTEGER,               -- 0/1 (store only)
  mode TEXT,
  createdAt TEXT
)

end_users (
  platformId TEXT,
  publishableKey TEXT,
  clerkUserId TEXT,
  email TEXT,
  status TEXT,
  createdAt TEXT,
  updatedAt TEXT
)

subscriptions (
  platformId TEXT,
  userId TEXT,
  publishableKey TEXT,
  plan TEXT,
  priceId TEXT,
  productId TEXT,
  amount INTEGER,
  currency TEXT,
  status TEXT,
  currentPeriodEnd TEXT,
  canceledAt TEXT,
  cancelReason TEXT,
  subscriptionId TEXT,
  stripeCustomerId TEXT,
  updatedAt TEXT
)

usage_counts (
  platformId TEXT,
  userId TEXT,
  plan TEXT,
  periodStart TEXT,
  periodEnd TEXT,
  usageCount INTEGER,
  updatedAt TEXT
)

events (
  platformId TEXT,
  source TEXT,
  type TEXT,
  eventId TEXT UNIQUE,
  payload_json TEXT,
  createdAt TEXT
)
```

## KV Storage

### PLATFORM_TOKENS_KV (owner/dev data)
```
user:{userId}:platformId           → plt_xxx
user:{userId}:publishableKey:test  → pk_test_xxx
user:{userId}:secretKey:test       → sk_test_xxx
user:{userId}:publishableKey:live  → pk_live_xxx
user:{userId}:secretKey:live       → sk_live_xxx
user:{userId}:stripeToken          → { accessToken, stripeUserId }
publishablekey:{pk}:platformId     → platformId (reverse lookup)
secretkey:{hash}:publishableKey    → pk_xxx (reverse lookup)
```

### CUSTOMER_TOKENS_KV (api-multi data)
```
platform:{platformId}:tierConfig:test  → { tiers: [...] }
platform:{platformId}:tierConfig:live  → { tiers: [...] }
platform:{platformId}:stripeToken:test → { accessToken, stripeUserId }
publishablekey:{pk}:platformId         → platformId
secretkey:{hash}:publishableKey        → pk_xxx
```

## Frontend Flows

### New Project (Config Page)
1. User clicks "+ New Project" on dashboard
2. Config page shows "Choose Business Type" cards
3. User picks SaaS or Store → **LOCKED forever for this key**
4. Fill in tiers/products
5. Submit creates Stripe products + generates pk/sk
6. Redirect to dashboard with new keys

### Edit Project
1. User clicks "Edit Tiers" or "Edit Products"
2. Config page loads in edit mode (type badge, no tabs)
3. User modifies tiers/products
4. Submit updates D1/Stripe, **no new keys generated**

### Test → Live Promotion
1. User creates test products first
2. Clicks "Go Live" on dashboard
3. Creates live Stripe products + pk_live/sk_live keys
4. Both test and live exist in parallel

## API Examples

### SaaS: Track Usage
```js
const res = await fetch('https://api-multi.../api/data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'user_123',
    'X-User-Plan': 'pro'
  }
});
// → { allowed: true, usage: { count: 1, limit: 1000 } }
// At limit → { error: "Tier limit reached" }
```

### SaaS: Checkout
```js
const res = await fetch('https://api-multi.../api/create-checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'user_123'
  },
  body: JSON.stringify({
    tier: 'pro',
    successUrl: 'https://myapp.com/success',
    cancelUrl: 'https://myapp.com/cancel'
  })
});
// → { url: "https://checkout.stripe.com/..." }
```

### Store: Cart Checkout
```js
const res = await fetch('https://api-multi.../api/cart/checkout', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer sk_test_xxx' },
  body: JSON.stringify({
    email: 'buyer@example.com',
    items: [{ priceId: 'price_xxx', quantity: 1 }],
    successUrl: 'https://mystore.com/thanks',
    cancelUrl: 'https://mystore.com/cart'
  })
});
// → { url: "https://checkout.stripe.com/..." }
```

## Deployment

```bash
# Auto-deploy via GitHub/Cloudflare connector
git add -A && git commit -m "message" && git push

# Manual if needed:
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=dream-frontend-dyn
cd front-auth-api && npm run deploy
cd oauth-api && npm run deploy
cd api-multi && npm run deploy
```

## URLs
- Frontend: https://dream-frontend-dyn.pages.dev
- Platform API: https://front-auth-api.k-c-sheffield012376.workers.dev
- OAuth API: https://oauth-api.k-c-sheffield012376.workers.dev
- Customer API: https://api-multi.k-c-sheffield012376.workers.dev

## TODO
- [ ] Key rotation endpoint (rotate sk, keep products)
- [ ] Better onboarding (reduce redirects)
- [ ] SDK: `npm install dream-api`
- [ ] Live totals page (aggregate live-only metrics)
