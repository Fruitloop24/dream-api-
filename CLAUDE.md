# dream-api

**API-as-a-Service Platform**

Devs pay $15/mo → get API keys, auth, billing, usage tracking, dashboard.
They integrate our SDK into their app. Their customers subscribe/buy through Stripe.
We handle everything. No webhooks for devs to manage.

## File Tree

```
dream-api/
├── frontend/                 # React + Clerk (dev dashboard)
│   └── src/pages/
│       ├── DashboardNew.tsx  # Main dashboard with project selector
│       ├── ApiTierConfig.tsx # Create/edit tiers and products
│       └── Credentials.tsx   # Post-creation key display
│
├── front-auth-api/           # Dev authentication & platform setup
│   └── src/
│       ├── index.ts          # Routes: /projects, /get-credentials, /create-checkout
│       ├── webhook.ts        # Stripe webhook for dev payments ($15/mo)
│       └── lib/
│           ├── projects.ts   # List projects from api_keys table
│           └── auth.ts       # Clerk JWT verification
│
├── oauth-api/                # Stripe Connect OAuth + product management
│   └── src/
│       ├── index.ts          # Main router
│       └── routes/
│           ├── oauth.ts      # /authorize, /callback (Stripe Connect)
│           ├── products.ts   # /create-products (new project + keys)
│           └── tiers.ts      # /tiers CRUD (edit without new keys)
│
├── api-multi/                # Customer-facing API (what devs integrate)
│   └── src/
│       ├── index.ts          # Main router
│       └── routes/
│           ├── data.ts       # POST /api/data (usage tracking)
│           ├── checkout.ts   # POST /api/create-checkout
│           ├── dashboard.ts  # GET /api/dashboard
│           └── products.ts   # GET /api/products
│
└── CLAUDE.md                 # This file
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
// In dev's app - track usage
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

// Create checkout for upgrade
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
```

### 5. Customer Subscribes
```
Checkout → Stripe payment
        → Webhook to /webhook/stripe (api-multi)
        → Updates subscriptions table
        → Updates end_users table
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

-- Subscriptions
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

-- Usage tracking per billing period
usage_counts (
  platformId TEXT,
  userId TEXT,
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
user:{userId}:secretKey:test          → sk_test_xxx (plain, for dashboard)
user:{userId}:publishableKey:live     → pk_live_xxx
user:{userId}:secretKey:live          → sk_live_xxx
publishablekey:{pk}:platformId        → platformId (reverse lookup)
secretkey:{hash}:publishableKey       → pk_xxx (auth lookup)
```

**CUSTOMER_TOKENS_KV** (api-multi)
```
platform:{platformId}:tierConfig:test → { tiers: [...] }
platform:{platformId}:tierConfig:live → { tiers: [...] }
platform:{platformId}:stripeToken:test→ { accessToken, stripeUserId }
publishablekey:{pk}:platformId        → platformId
secretkey:{hash}:publishableKey       → pk_xxx
usage:{platformId}:{oderId}:{period}  → count (fast increment)
```

## R2 Bucket (Images)

**ASSETS_BUCKET** - Product images for store type
```
Upload: POST /upload-asset (front-auth-api)
URL pattern: https://pub-xxx.r2.dev/{platformId}/{filename}
```

## Two Clerk Apps

1. **dream-api** - Platform devs who pay $15/mo
   - JWT template: `dream-api`
   - publicMetadata: `{ plan: 'paid', publishableKey: 'pk_xxx' }`

2. **end-user-api** - All devs' end customers (shared)
   - JWT template: `end-user-api`
   - Isolated by publishableKey in each request

## Endpoints

### front-auth-api (Dev Auth)
```
POST /generate-platform-id  - Create plt_xxx for new dev
POST /create-checkout       - $15/mo subscription checkout
GET  /get-credentials       - Returns test + live keys
GET  /projects              - List all projects (from api_keys)
POST /upload-asset          - R2 image upload
POST /webhook/stripe        - Dev payment webhook
```

### oauth-api (Stripe Connect + Products)
```
GET  /authorize             - Start Stripe OAuth
GET  /callback              - OAuth completion
POST /create-products       - Create Stripe products + generate keys
GET  /tiers                 - List tiers for project
PUT  /tiers                 - Update tier
POST /tiers/add             - Add new tier
DELETE /tiers               - Delete tier
POST /promote-to-live       - Clone test → live
```

### api-multi (Customer API)
```
POST /api/data              - Usage tracking + limit check
GET  /api/usage             - Check current usage
POST /api/create-checkout   - Subscription checkout
POST /api/cart/checkout     - One-off cart checkout
GET  /api/products          - List products (store)
GET  /api/dashboard         - Platform dashboard data
POST /api/customer-portal   - Stripe billing portal
POST /webhook/stripe        - Customer payment webhook
```

## Deployment

Auto-deploy via GitHub → Cloudflare:
```bash
git add -A && git commit -m "message" && git push
```

Manual if needed:
```bash
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=dream-frontend-dyn
cd front-auth-api && npm run deploy
cd oauth-api && npm run deploy
cd api-multi && npm run deploy
```

## URLs

- **Frontend**: https://dream-frontend-dyn.pages.dev
- **Dev API**: https://front-auth-api.k-c-sheffield012376.workers.dev
- **OAuth API**: https://oauth-api.k-c-sheffield012376.workers.dev
- **Customer API**: https://api-multi.k-c-sheffield012376.workers.dev

## Current Status (Dec 2024)

**Working:**
- Dev signup → payment → Stripe Connect → create products
- Dashboard with project selector, test/live modes
- SaaS: usage tracking, limits, checkout, subscriptions
- Store: products, cart checkout
- Webhook handling, idempotency

**TODO:**
- [ ] Key rotation endpoint
- [ ] SDK package (`npm install dream-api`)
- [ ] Better onboarding UX
- [ ] Totals view with real aggregated metrics
- [ ] Go Live (promote test → live)
