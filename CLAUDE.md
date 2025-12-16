# dream-api

**API-as-a-Service Platform**

Devs pay $15/mo → get API keys, auth, billing, usage tracking, dashboard.
They integrate our SDK into their app. Their customers subscribe/buy through Stripe.
We handle everything. No webhooks for devs to manage.

## Quick Start (For Claude)

```bash
# Deploy all workers
cd front-auth-api && npm run deploy
cd oauth-api && npm run deploy
cd api-multi && npm run deploy

# Deploy frontend
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=dream-frontend-dyn
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DREAM-API PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Frontend   │────▶│ front-auth   │────▶│   oauth-api  │                │
│  │  (React)     │     │   -api       │     │              │                │
│  │              │     │              │     │  Stripe      │                │
│  │  Dashboard   │     │  Dev Auth    │     │  Connect     │                │
│  │  Project Mgmt│     │  Platform ID │     │  Product CRUD│                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         │                    ▼                    ▼                         │
│         │              ┌──────────────────────────────┐                     │
│         │              │           D1 + KV            │                     │
│         │              │   (Source of Truth + Cache)  │                     │
│         │              └──────────────────────────────┘                     │
│         │                           │                                       │
│         │                           ▼                                       │
│         │              ┌──────────────────────────────┐                     │
│         └─────────────▶│         api-multi            │◀── Dev's App       │
│                        │                              │    (SDK calls)      │
│                        │  • Usage tracking            │                     │
│                        │  • Checkout creation         │                     │
│                        │  • Webhook handling          │                     │
│                        │  • Dashboard data            │                     │
│                        └──────────────────────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Complete File Tree

```
dream-api/
│
├── frontend/                          # React + Vite + Clerk
│   ├── src/
│   │   ├── main.tsx                   # Entry point, Clerk provider
│   │   ├── App.tsx                    # Router setup
│   │   └── pages/
│   │       ├── LandingNew.tsx         # Marketing landing page
│   │       ├── DashboardNew.tsx       # Main dashboard (project selector, metrics)
│   │       ├── ApiTierConfig.tsx      # Create/edit tiers and products
│   │       └── Credentials.tsx        # Post-creation key display (one-time view)
│   ├── .env.local                     # VITE_FRONT_AUTH_API_URL, VITE_OAUTH_API_URL
│   └── vite.config.ts
│
├── front-auth-api/                    # Dev authentication & platform setup
│   └── src/
│       ├── index.ts                   # Main router - all dev-facing endpoints
│       ├── webhook.ts                 # Stripe webhook for $15/mo dev payments
│       ├── types.ts                   # Env type definitions
│       └── lib/
│           ├── auth.ts                # Clerk JWT verification
│           ├── keys.ts                # Key generation utilities
│           ├── keyRotation.ts         # Key rotation logic
│           ├── projects.ts            # Project listing from D1
│           ├── projectsRoute.ts       # /projects route handler
│           └── schema.ts              # D1 table schemas
│
├── oauth-api/                         # Stripe Connect OAuth + product management
│   └── src/
│       ├── index.ts                   # Main router
│       ├── types.ts                   # Env type definitions
│       ├── routes/
│       │   ├── oauth.ts               # /authorize, /callback (Stripe Connect flow)
│       │   ├── products.ts            # /create-products (new project + keys)
│       │   ├── tiers.ts               # /tiers CRUD (edit without regenerating keys)
│       │   └── promote.ts             # /promote-to-live (test → live)
│       └── lib/
│           ├── keys.ts                # Key generation (pk_xxx, sk_xxx)
│           ├── projects.ts            # Project helpers
│           ├── schema.ts              # D1 schemas
│           ├── stripe.ts              # Stripe API helpers
│           └── tiers.ts               # Tier validation/helpers
│
├── api-multi/                         # Customer-facing API (what devs integrate)
│   └── src/
│       ├── index.ts                   # Main router + middleware chain
│       ├── stripe-webhook.ts          # Webhook handler (subscriptions, inventory)
│       ├── types.ts                   # Env type definitions
│       ├── utils.ts                   # Shared utilities
│       ├── config/
│       │   ├── config.ts              # Environment config
│       │   ├── configLoader.ts        # Load tier config from D1/KV
│       │   └── tiers.ts               # Default tier definitions, rate limits
│       ├── middleware/
│       │   ├── apiKey.ts              # Secret key verification (hash → platformId)
│       │   ├── cors.ts                # CORS handling
│       │   ├── rateLimit.ts           # Per-user rate limiting via KV
│       │   └── security.ts            # Security headers
│       ├── routes/
│       │   ├── usage.ts               # POST /api/data (track usage, enforce limits)
│       │   ├── checkout.ts            # POST /api/create-checkout, /api/cart/checkout
│       │   ├── dashboard.ts           # GET /api/dashboard (metrics for dev)
│       │   ├── products.ts            # GET /api/products (store inventory)
│       │   ├── customers.ts           # Customer management, portal
│       │   └── assets.ts              # R2 asset serving
│       └── services/
│           ├── d1.ts                  # D1 database operations (source of truth)
│           └── kv.ts                  # KV cache operations
│
└── CLAUDE.md                          # This file
```

## Core Concept

**publishableKey = Project**

Each `pk_test_xxx` or `pk_live_xxx` IS a project. No separate projectId.
- Identifies the project in all API calls
- Determines business type (saas/store) - LOCKED at creation
- Links to tiers, customers, usage data
- Mode embedded in prefix: `pk_test_` vs `pk_live_`

## Business Types (Mutually Exclusive)

**SaaS** - Subscription tiers with usage limits
- Tiers: free, pro, enterprise (configurable)
- Usage tracking per billing period
- Limits enforced, checkout for upgrades

**Store** - One-off products with inventory
- Products with prices, images, descriptions
- Cart checkout (multiple items)
- Inventory tracking, sold-out status

## The Flow

### 1. Dev Signs Up
```
Landing → Clerk sign-in → Dashboard
         → Generate platformId (plt_xxx)
         → Redirect to $15/mo checkout
         → Webhook updates Clerk metadata (plan: 'paid')
         → Dashboard shows "Connect Stripe"
```

### 2. Dev Connects Stripe
```
Connect Stripe → OAuth flow (/authorize)
             → Stripe redirects to /callback
             → Store access token in KV + D1
             → Dashboard shows "Create Project"
```

### 3. Dev Creates Project
```
+ New Project → Choose type (SaaS or Store)
             → Configure tiers/products
             → POST /create-products
             → Creates Stripe products on THEIR account
             → Generates pk_test_xxx / sk_test_xxx
             → Stores in D1 (api_keys, tiers)
             → Returns keys (ONLY TIME they see sk)
             → Dashboard shows project
```

### 4. Dev Integrates SDK
```javascript
// In dev's app - track usage (SaaS)
const res = await fetch('https://api-multi.../api/data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'customer_123',
    'X-User-Plan': 'pro'
  }
});
// → { allowed: true, usage: { count: 5, limit: 1000 } }
// → { allowed: false, error: "Tier limit reached" } at limit

// Create checkout for upgrade (SaaS)
const checkout = await fetch('https://api-multi.../api/create-checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'customer_123'
  },
  body: JSON.stringify({
    tier: 'pro',
    successUrl: 'https://myapp.com/success',
    cancelUrl: 'https://myapp.com/cancel'
  })
});
// → { url: "https://checkout.stripe.com/..." }

// Cart checkout (Store)
const cart = await fetch('https://api-multi.../api/cart/checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'customer_123'
  },
  body: JSON.stringify({
    items: [
      { priceId: 'price_xxx', quantity: 2 },
      { priceId: 'price_yyy', quantity: 1 }
    ],
    successUrl: 'https://myapp.com/success',
    cancelUrl: 'https://myapp.com/cancel'
  })
});
// → { url: "https://checkout.stripe.com/..." }
```

### 5. Customer Subscribes/Purchases
```
Checkout → Stripe payment
        → Webhook to /webhook/stripe (api-multi)
        → Updates subscriptions table (SaaS)
        → Decrements inventory (Store)
        → Dev sees customer in dashboard
```

## D1 Schema (Source of Truth)

```sql
-- Dev's platform identity
platforms (
  platformId TEXT PRIMARY KEY,  -- plt_xxx
  clerkUserId TEXT,             -- From dream-api Clerk app
  createdAt TEXT
)

-- API Keys = Projects
api_keys (
  platformId TEXT,
  publishableKey TEXT PRIMARY KEY,  -- pk_test_xxx or pk_live_xxx
  secretKeyHash TEXT,               -- SHA-256 (never store plain)
  status TEXT,                      -- active/revoked
  mode TEXT,                        -- test/live
  projectType TEXT,                 -- saas/store (LOCKED)
  name TEXT,                        -- Project display name
  createdAt TEXT
)

-- Tiers/Products (linked by publishableKey)
tiers (
  platformId TEXT,
  publishableKey TEXT,              -- Links to project
  projectType TEXT,                 -- saas/store
  name TEXT,                        -- Tier ID (free, pro, etc)
  displayName TEXT,
  price REAL,
  "limit" INTEGER,                  -- NULL = unlimited (SaaS only)
  priceId TEXT,                     -- Stripe price ID
  productId TEXT,                   -- Stripe product ID
  features TEXT,                    -- JSON (description, imageUrl for store)
  popular INTEGER,                  -- 0/1
  inventory INTEGER,                -- Stock count (store only)
  soldOut INTEGER,                  -- 0/1 (store only)
  mode TEXT,
  createdAt TEXT
)

-- Dev's customers (end users)
end_users (
  platformId TEXT,
  publishableKey TEXT,
  clerkUserId TEXT,                 -- From end-user-api Clerk app
  email TEXT,
  status TEXT,
  createdAt TEXT,
  updatedAt TEXT
)

-- Subscriptions (SaaS)
subscriptions (
  platformId TEXT,
  userId TEXT,
  publishableKey TEXT,
  plan TEXT,
  priceId TEXT,
  productId TEXT,
  amount INTEGER,
  currency TEXT,
  status TEXT,                      -- active/canceled/past_due
  currentPeriodEnd TEXT,
  canceledAt TEXT,
  cancelReason TEXT,
  subscriptionId TEXT,
  stripeCustomerId TEXT,
  updatedAt TEXT
)

-- Usage tracking per billing period (SaaS)
usage_counts (
  platformId TEXT,
  userId TEXT,
  publishableKey TEXT,
  plan TEXT,
  periodStart TEXT,
  periodEnd TEXT,
  usageCount INTEGER,
  updatedAt TEXT
)

-- Stripe tokens (Connect)
stripe_tokens (
  platformId TEXT,
  stripeUserId TEXT,                -- acct_xxx
  accessToken TEXT,
  refreshToken TEXT,
  scope TEXT,
  mode TEXT,
  createdAt TEXT
)

-- Webhook events (idempotency)
events (
  platformId TEXT,
  publishableKey TEXT,
  source TEXT,
  type TEXT,
  eventId TEXT UNIQUE,
  payload_json TEXT,
  createdAt TEXT
)
```

## KV Storage (Cache + Fast Lookups)

**PLATFORM_TOKENS_KV** (front-auth-api, oauth-api)
```
user:{userId}:platformId              → plt_xxx
user:{userId}:stripeToken             → { accessToken, stripeUserId }
user:{userId}:publishableKey:test     → pk_test_xxx
user:{userId}:secretKey:test          → sk_test_xxx (plain, for dashboard display)
user:{userId}:publishableKey:live     → pk_live_xxx
user:{userId}:secretKey:live          → sk_live_xxx
publishablekey:{pk}:platformId        → platformId (reverse lookup)
secretkey:{hash}:publishableKey       → pk_xxx (auth lookup)
```

**TOKENS_KV** (api-multi)
```
publishablekey:{pk}:platformId        → platformId
secretkey:{hash}:publishableKey       → pk_xxx (cached from D1)
```

**USAGE_KV** (api-multi)
```
ratelimit:{userId}:{minute}           → count (TTL: 120s)
```

## R2 Bucket (Images)

**dream_api_assets** - Product images for store type
```
Upload: POST /upload-asset (front-auth-api)
URL pattern: https://pub-xxx.r2.dev/{platformId}/{filename}
```

## Two Clerk Apps

1. **dream-api** - Platform devs who pay $15/mo
   - JWT template: `dream-api`
   - publicMetadata: `{ plan: 'paid', platformId: 'plt_xxx' }`

2. **end-user-api** - All devs' end customers (shared)
   - JWT template: `end-user-api`
   - Isolated by publishableKey in each request

## API Endpoints

### front-auth-api (Dev Auth)
```
POST /generate-platform-id  - Create plt_xxx for new dev
POST /create-checkout       - $15/mo subscription checkout
GET  /get-credentials       - Returns test + live keys for display
GET  /projects              - List all projects for this dev
POST /upload-asset          - R2 image upload
POST /webhook/stripe        - Dev payment webhook ($15/mo)
```

### oauth-api (Stripe Connect + Products)
```
GET  /authorize             - Start Stripe OAuth
GET  /callback              - OAuth completion, store tokens
POST /create-products       - Create Stripe products + generate new keys
GET  /tiers                 - List tiers for project (by publishableKey)
PUT  /tiers                 - Update existing tier
POST /tiers/add             - Add new tier to existing project
DELETE /tiers               - Delete tier
POST /promote-to-live       - Clone test → live
```

### api-multi (Customer API - What Devs Integrate)
```
POST /api/data              - Usage tracking + limit check (SaaS)
GET  /api/usage             - Check current usage without incrementing
POST /api/create-checkout   - Subscription checkout (SaaS)
POST /api/cart/checkout     - One-off cart checkout (Store)
GET  /api/products          - List products with inventory (Store)
GET  /api/dashboard         - Platform dashboard data (metrics)
POST /api/customer-portal   - Stripe billing portal URL
POST /webhook/stripe        - Customer payment webhook
```

## Security Model

1. **Secret keys hashed** - SHA-256, never stored plain (except in KV for dashboard display)
2. **Stripe handles PCI** - We never touch card numbers
3. **Clerk handles auth** - No password storage
4. **Workers isolated** - No shared state between requests
5. **HTTPS everywhere** - Cloudflare enforces
6. **Rate limiting** - Per-user, per-minute via KV

## KV Write Optimization

Rate limiting causes 1 KV write per request. This is by design for distributed rate limiting.
API key verification only writes on cache miss (2 writes to warm cache).

To reduce KV writes:
- Disable rate limiting if not needed
- Use Durable Objects for counters (more complex)
- Accept the cost as a feature

## Deployment

Auto-deploy via GitHub → Cloudflare (if configured):
```bash
git add -A && git commit -m "message" && git push
```

Manual deployment:
```bash
# Frontend (Cloudflare Pages)
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=dream-frontend-dyn

# Workers
cd front-auth-api && npm run deploy
cd oauth-api && npm run deploy
cd api-multi && npm run deploy
```

## URLs

- **Frontend**: https://dream-frontend-dyn.pages.dev
- **Dev API**: https://front-auth-api.k-c-sheffield012376.workers.dev
- **OAuth API**: https://oauth-api.k-c-sheffield012376.workers.dev
- **Customer API**: https://api-multi.k-c-sheffield012376.workers.dev

## Environment Variables

### frontend/.env.local
```
VITE_FRONT_AUTH_API_URL=https://front-auth-api.k-c-sheffield012376.workers.dev
VITE_OAUTH_API_URL=https://oauth-api.k-c-sheffield012376.workers.dev
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx
```

### Workers (wrangler.toml secrets)
```
STRIPE_SECRET_KEY          - Platform Stripe key
STRIPE_CONNECT_CLIENT_ID   - For OAuth flow
STRIPE_WEBHOOK_SECRET      - Webhook signature verification
CLERK_SECRET_KEY           - JWT verification
```

## Current Status (Dec 2025)

**Working:**
- Dev signup → payment → Stripe Connect → create products
- Dashboard with project selector, test/live modes
- SaaS: usage tracking, limits, checkout, subscriptions, cancel/undo
- Store: products, cart checkout, inventory decrement
- Edit tiers/products without regenerating keys
- Add new tiers/products to existing projects
- Webhook handling with idempotency
- Multi-item cart checkout

**Known Issues:**
- Rate limiting causes KV writes on every request (by design)
- Dashboard "Total Value" not aggregating real revenue yet
- Product images in dashboard need better display

**TODO:**
- [ ] SDK package (`npm install dream-api`)
- [ ] Key rotation endpoint (partial implementation exists)
- [ ] Dashboard: show product images, descriptions
- [ ] Dashboard: aggregate real revenue for Total Value
- [ ] Go Live flow (promote test → live)
- [ ] Better onboarding UX

## Common Debugging

**"Platform not found"**
- Check D1 `stripe_tokens` table has entry for platformId
- Verify publishableKey → platformId lookup works

**"Invalid API key"**
- Hash the secret key and check `api_keys.secretKeyHash` in D1
- Clear KV cache: `secretkey:{hash}:publishableKey`

**Webhook not processing**
- Check `events` table for duplicate eventId (idempotency)
- Verify webhook secret matches in wrangler.toml

**Tiers not loading**
- Query D1: `SELECT * FROM tiers WHERE publishableKey = ?`
- Check mode matches (test vs live)
