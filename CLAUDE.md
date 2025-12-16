# dream-api

**API-as-a-Service Platform** - Production Ready (Dec 2025)

Devs pay $15/mo → get API keys, auth, billing, usage tracking, dashboard.
They integrate our SDK into their app. Their customers subscribe/buy through Stripe.
We handle everything. No webhooks for devs to manage.

## What Makes This Special

1. **publishableKey = Project** - No separate projectId. The key IS the project.
2. **Zero webhook management for devs** - We handle all Stripe webhooks internally.
3. **True multi-tenancy** - Each dev's customers pay THEM via Stripe Connect.
4. **SaaS + Store cleanly separated** - Pick one per project, no hybrid confusion.
5. **Edit without rekeying** - Change prices/limits without breaking integrations.
6. **JWT gate** - All API calls authenticated, no stolen sessions.

## Quick Start (For Claude)

```bash
# Deploy all workers
cd front-auth-api && npm run deploy
cd oauth-api && npm run deploy
cd api-multi && npm run deploy

# Deploy frontend
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=dream-frontend-dyn

# Or just push to GitHub (auto-deploys via Cloudflare)
git add -A && git commit -m "message" && git push
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
│         │              │        D1 + KV + R2          │                     │
│         │              │  (Source of Truth + Cache)   │                     │
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
│                        │  • Asset serving (R2)        │                     │
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
│   │       ├── ApiTierConfig.tsx      # Create/edit/promote tiers and products
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
│       │   └── promote.ts             # /promote-to-live (test → live with edits)
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
│       │   ├── checkout.ts            # POST /api/create-checkout (SaaS subscriptions)
│       │   ├── products.ts            # GET /api/products, POST /api/cart/checkout (Store)
│       │   ├── dashboard.ts           # GET /api/dashboard (metrics for dev)
│       │   ├── customers.ts           # Customer management, portal
│       │   └── assets.ts              # R2 asset serving
│       └── services/
│           ├── d1.ts                  # D1 database operations (source of truth)
│           └── kv.ts                  # KV cache operations
│
├── CLAUDE.md                          # This file
├── HYPE.md                            # Vision document
└── README.md                          # Public readme
```

## Core Concepts

### publishableKey = Project

Each `pk_test_xxx` or `pk_live_xxx` IS a project. No separate projectId needed.
- Identifies the project in all API calls
- Determines business type (saas/store) - **LOCKED at creation**
- Links to tiers, customers, usage data
- Mode embedded in prefix: `pk_test_` vs `pk_live_`

**Why this matters:** Simplifies the entire data model. One key tells you everything - project, mode, type.

### Business Types (Mutually Exclusive)

**SaaS** - Subscription tiers with usage limits
- Tiers: free, pro, enterprise (fully configurable)
- Usage tracking per billing period
- Limits enforced at API level
- Checkout creates Stripe subscription

**Store** - One-off products with inventory
- Products with prices, images, descriptions
- Multi-item cart checkout
- Inventory tracking with sold-out detection
- Checkout creates Stripe payment (not subscription)

**IMPORTANT:** Type is locked at project creation. Can't mix subscriptions and one-offs.

### Test vs Live Mode

- **Test mode:** `pk_test_xxx` / `sk_test_xxx` - Use Stripe test mode, test cards work
- **Live mode:** `pk_live_xxx` / `sk_live_xxx` - Real payments, real money

**Flow:** Create in test → Edit & verify → Promote to live

The "Edit & Go Live" flow:
1. Opens test tiers in edit mode
2. User can change names, prices, inventory (fresh start for live)
3. Creates NEW Stripe products on live mode
4. Generates NEW live keys
5. Test project remains unchanged

**IMPORTANT:** Once live keys exist for a project, "Edit & Go Live" is blocked. Use "Edit Tiers" on the live project instead.

## The Complete Flow

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

### 3. Dev Creates Project (Test Mode)
```
+ New Project → Choose type (SaaS or Store) - LOCKED FOREVER
             → Configure tiers/products
             → Upload images (R2)
             → POST /create-products
             → Creates Stripe products on THEIR account (test mode)
             → Generates pk_test_xxx / sk_test_xxx
             → Stores in D1 (api_keys, tiers)
             → Returns keys (ONLY TIME they see sk plaintext)
             → Dashboard shows project
```

### 4. Dev Tests Integration
```javascript
// Create a customer (optional for SaaS, not needed for Store)
const customer = await fetch('https://api-multi.../api/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'customer@example.com',
    password: 'SecurePass123',
    firstName: 'Test',
    lastName: 'Customer',
    plan: 'free'
  })
});
// → { success: true, customer: { id: 'user_xxx', ... } }

// Track usage (SaaS)
const usage = await fetch('https://api-multi.../api/data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'user_xxx',
    'X-User-Plan': 'free'
  }
});
// → { success: true, usage: { count: 1, limit: 100, plan: 'free' } }
// → { error: "Tier limit reached", ... } when at limit

// Create checkout for upgrade (SaaS)
const checkout = await fetch('https://api-multi.../api/create-checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'user_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tier: 'pro',
    successUrl: 'https://myapp.com/success',
    cancelUrl: 'https://myapp.com/cancel'
  })
});
// → { url: "https://checkout.stripe.com/..." }

// Cart checkout (Store) - NO AUTH REQUIRED for buyers
const cart = await fetch('https://api-multi.../api/cart/checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'buyer@example.com',  // Optional, Stripe collects if missing
    items: [
      { priceId: 'price_xxx', quantity: 2 },
      { priceId: 'price_yyy', quantity: 1 }
    ],
    successUrl: 'https://mystore.com/thanks',
    cancelUrl: 'https://mystore.com/cart'
  })
});
// → { url: "https://checkout.stripe.com/..." }
```

### 5. Dev Promotes to Live
```
Dashboard → Select test project
         → Click "Edit & Go Live"
         → Review/adjust tiers (can change everything)
         → Click "Create Live Products"
         → Creates Stripe products on THEIR account (live mode)
         → Generates pk_live_xxx / sk_live_xxx
         → Alert shows new keys (SAVE THEM!)
         → Dashboard shows live project
```

### 6. Customer Subscribes/Purchases
```
Checkout → Stripe payment (test card or real)
        → Webhook to /webhook/stripe (api-multi)
        → Updates subscriptions table (SaaS)
        → OR decrements inventory (Store)
        → Dev sees customer/sale in dashboard
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
  publishableKey TEXT,              -- Links to project (CRITICAL for filtering)
  projectType TEXT,                 -- saas/store
  name TEXT,                        -- Tier ID (free, pro, etc) - lowercase
  displayName TEXT,                 -- User-facing name
  price REAL,
  "limit" INTEGER,                  -- NULL = unlimited (SaaS only)
  priceId TEXT,                     -- Stripe price ID
  productId TEXT,                   -- Stripe product ID
  features TEXT,                    -- JSON: { billingMode, description, imageUrl, features[] }
  popular INTEGER,                  -- 0/1
  inventory INTEGER,                -- Stock count (store only)
  soldOut INTEGER,                  -- 0/1 (store only)
  mode TEXT,                        -- test/live
  createdAt TEXT
)

-- Dev's customers (end users)
end_users (
  platformId TEXT,
  publishableKey TEXT,              -- Links customer to specific project
  clerkUserId TEXT,                 -- From end-user-api Clerk app
  email TEXT,
  status TEXT,
  createdAt TEXT,
  updatedAt TEXT
)

-- Subscriptions (SaaS only)
subscriptions (
  platformId TEXT,
  userId TEXT,
  publishableKey TEXT,              -- CRITICAL: filters by project
  plan TEXT,
  priceId TEXT,
  productId TEXT,
  amount INTEGER,                   -- In cents
  currency TEXT,
  status TEXT,                      -- active/canceled/past_due
  currentPeriodEnd TEXT,
  canceledAt TEXT,
  cancelReason TEXT,
  subscriptionId TEXT,              -- Stripe sub_xxx
  stripeCustomerId TEXT,            -- Stripe cus_xxx
  updatedAt TEXT
)

-- Usage tracking per billing period (SaaS only)
usage_counts (
  platformId TEXT,
  userId TEXT,
  publishableKey TEXT,              -- CRITICAL: filters by project AND mode
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
  mode TEXT,                        -- test/live (Stripe tokens work for both usually)
  createdAt TEXT
)

-- Webhook events (idempotency)
events (
  platformId TEXT,
  publishableKey TEXT,
  source TEXT,
  type TEXT,                        -- checkout.session.completed, customer.subscription.created, etc
  eventId TEXT UNIQUE,              -- Stripe event ID for deduplication
  payload_json TEXT,                -- Full event payload (for revenue tracking)
  createdAt TEXT
)
```

### Key Filtering Decisions

**CRITICAL: All queries MUST filter by publishableKey to separate test/live data.**

```sql
-- Good: Filtered by publishableKey
SELECT * FROM tiers WHERE publishableKey = 'pk_test_xxx'
SELECT * FROM subscriptions WHERE publishableKey = 'pk_live_xxx'
SELECT * FROM usage_counts WHERE publishableKey = 'pk_test_xxx'

-- Bad: Only filtering by platformId (mixes test and live!)
SELECT * FROM tiers WHERE platformId = 'plt_xxx'  -- DON'T DO THIS
```

The publishableKey includes mode (test/live) in its prefix, so filtering by it automatically separates test and live data.

## KV Storage (Cache + Fast Lookups)

### PLATFORM_TOKENS_KV (front-auth-api, oauth-api)

Used for dev authentication and credential storage.

```
user:{clerkUserId}:platformId              → plt_xxx
user:{clerkUserId}:stripeToken             → { accessToken, stripeUserId }
user:{clerkUserId}:publishableKey:test     → pk_test_xxx
user:{clerkUserId}:secretKey:test          → sk_test_xxx (plain, for dashboard)
user:{clerkUserId}:publishableKey:live     → pk_live_xxx
user:{clerkUserId}:secretKey:live          → sk_live_xxx (plain, for dashboard)

# Reverse lookups
publishablekey:{pk}:platformId             → plt_xxx
secretkey:{sha256hash}:publishableKey      → pk_xxx
```

### TOKENS_KV (api-multi)

Used for API authentication caching.

```
# Auth cache (warmed on first request)
publishablekey:{pk}:platformId             → plt_xxx
secretkey:{sha256hash}:publishableKey      → pk_xxx

# Tier config cache
platform:{platformId}:tierConfig           → { tiers: [...] }
platform:{platformId}:tierConfig:live      → { tiers: [...] }
platform:{platformId}:tierConfig:test      → { tiers: [...] }
```

### KV Write Patterns

**API Key Verification:**
- Cache HIT: 0 KV writes
- Cache MISS: 2 KV writes (warm cache for next time)

**Rate Limiting:**
- 1 KV write per request (by design for distributed counters)
- Key: `ratelimit:{userId}:{minute}` with TTL: 120s

**To reduce KV writes:**
- Disable rate limiting if not needed
- Accept cost as feature (still cheap)
- Could use Durable Objects for counters (more complex)

## R2 Storage (Product Images)

**Bucket:** `dream_api_assets`

**Upload flow:**
1. Frontend calls `POST /upload-asset` (front-auth-api)
2. File uploaded to R2: `{platformId}/{timestamp}-{filename}`
3. Returns public URL

**Serving:**
- Assets served via `GET /api/assets/{platformId}/{filename}` (api-multi)
- Or direct R2 public URL if configured

**URL pattern:**
```
https://api-multi.k-c-sheffield012376.workers.dev/api/assets/plt_xxx/1234567890-image.png
```

## Two Clerk Apps

### 1. dream-api (Platform Devs)

Devs who pay $15/mo to use the platform.

```
JWT template: 'dream-api'
publicMetadata: {
  plan: 'paid' | 'free',
  platformId: 'plt_xxx'
}
```

### 2. end-user-api (Dev's Customers)

Shared Clerk app for ALL devs' end customers. Isolated by publishableKey.

```
JWT template: 'end-user-api'
publicMetadata: {
  publishableKey: 'pk_xxx',  // Which dev's project they belong to
  plan: 'free' | 'pro' | etc
}
```

**Multi-tenancy:** One Clerk app serves all devs' customers. Each customer has `publishableKey` in metadata linking them to their dev's project.

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
PUT  /tiers                 - Update existing tier (price, limit, etc)
POST /tiers/add             - Add new tier to existing project
DELETE /tiers               - Delete/archive tier
POST /promote-to-live       - Create live products from test (with edits)
```

### api-multi (Customer API - What Devs Integrate)
```
# SaaS
POST /api/data              - Track usage + enforce limits
GET  /api/usage             - Check usage without incrementing
POST /api/create-checkout   - Subscription checkout

# Store
GET  /api/products          - List products with inventory
POST /api/cart/checkout     - Multi-item cart checkout (guest OK)

# Both
POST /api/customers         - Create customer in end-user-api Clerk
GET  /api/dashboard         - Platform dashboard data (metrics)
POST /api/customer-portal   - Stripe billing portal URL
POST /webhook/stripe        - Customer payment webhook
GET  /api/assets/*          - Serve R2 images
```

## Dashboard Metrics

### SaaS Dashboard
```
- Active Subs: COUNT(subscriptions WHERE status='active' AND publishableKey=pk)
- Canceling: COUNT(subscriptions WHERE canceledAt IS NOT NULL AND publishableKey=pk)
- MRR: SUM(amount) for active subscriptions (in cents, display as dollars)
- Usage (Period): SUM(usageCount) for current billing period
```

### Store Dashboard
```
- Total Sales: COUNT(events WHERE type='checkout.session.completed' AND mode='payment')
- Revenue: SUM(amount_total) from checkout events payload (in cents)
- In Stock: SUM(inventory) from tiers
- Low Stock: COUNT(tiers WHERE inventory > 0 AND inventory <= 5)
```

**IMPORTANT:** Store metrics come from the `events` table by parsing `payload_json` for checkout.session.completed events with `mode='payment'`.

## Security Model

1. **Secret keys hashed** - SHA-256 in D1, plain only in KV for dashboard display
2. **Stripe handles PCI** - We never touch card numbers
3. **Clerk handles auth** - No password storage (except end-user-api for customer creation)
4. **Workers isolated** - No shared state between requests
5. **HTTPS everywhere** - Cloudflare enforces
6. **Rate limiting** - Per-user, per-minute via KV
7. **Webhook idempotency** - Events table prevents duplicate processing

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
CLERK_SECRET_KEY           - JWT verification (dream-api Clerk app)
CLERK_END_USER_SECRET_KEY  - JWT verification (end-user-api Clerk app)
```

## Current Status (Dec 2025)

### Working
- Dev signup → payment → Stripe Connect → create products
- Dashboard with project selector, test/live mode toggle
- SaaS: usage tracking, limits, checkout, subscriptions, cancel/undo
- Store: products, multi-item cart, inventory decrement, sold-out detection
- Edit tiers/products without regenerating keys
- Add new tiers/products to existing projects
- Delete tiers (archives Stripe product)
- "Edit & Go Live" flow with full edit capability
- Blocks duplicate live key creation (checks by project name)
- Webhook handling with idempotency
- Asset upload to R2 with URL serving
- Store dashboard: real sales count, revenue from events
- Customer creation via API

### Known Limitations
- Rate limiting causes 1 KV write per request (by design, acceptable cost)
- Secret key shown only once (security feature, but UX friction)
- Usage not yet filtered by publishableKey in dashboard (TODO)

### TODO
- [ ] Filter usage counts by publishableKey (test vs live separation)
- [ ] SDK package (`npm install dream-api`)
- [ ] Key rotation endpoint
- [ ] Better onboarding UX
- [ ] Tax handling (Stripe Tax integration)

## Common Debugging

**"Platform not found"**
- Check D1 `stripe_tokens` table has entry for platformId
- Verify publishableKey → platformId lookup: `SELECT * FROM api_keys WHERE publishableKey = ?`

**"Invalid API key"**
- Hash the secret key with SHA-256
- Check `api_keys.secretKeyHash` in D1 matches
- Clear KV cache: delete `secretkey:{hash}:publishableKey`

**Webhook not processing**
- Check `events` table for duplicate eventId (idempotency)
- Verify webhook secret matches in wrangler.toml
- Check Stripe dashboard for webhook delivery status

**Tiers not loading**
- Query D1: `SELECT * FROM tiers WHERE publishableKey = ? AND mode = ?`
- Ensure publishableKey filter is applied (not just platformId)

**Usage showing wrong data**
- Ensure usage_counts query filters by publishableKey
- Test and live usage are separate rows (different publishableKey)

**Inventory not decrementing**
- Check webhook received: `events` table
- Verify `checkout.session.completed` with `mode='payment'` processed
- Check `tiers` table for current inventory

## Testing Checklist

### SaaS Flow
```bash
# 1. Create customer
curl -X POST .../api/customers -H "Authorization: Bearer sk_test_xxx" \
  -d '{"email":"test@example.com","password":"Pass123","plan":"free"}'

# 2. Track usage (do this multiple times to hit limit)
curl -X POST .../api/data -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_xxx" -H "X-User-Plan: free"

# 3. Create upgrade checkout
curl -X POST .../api/create-checkout -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_xxx" -d '{"tier":"pro"}'

# 4. Complete checkout with test card 4242424242424242
# 5. Verify subscription in dashboard
```

### Store Flow
```bash
# 1. Get products
curl .../api/products -H "Authorization: Bearer sk_test_xxx"

# 2. Create cart checkout
curl -X POST .../api/cart/checkout -H "Authorization: Bearer sk_test_xxx" \
  -d '{"email":"buyer@example.com","items":[{"priceId":"price_xxx","quantity":2}]}'

# 3. Complete checkout with test card
# 4. Verify inventory decremented in dashboard
# 5. Verify revenue/sales count updated
```

### Go Live Flow
1. Create test project with tiers/products
2. Test with test keys
3. Click "Edit & Go Live" on dashboard
4. Adjust values if needed (can change tier names, prices, inventory)
5. Click "Create Live Products"
6. SAVE the live secret key from alert
7. Switch to live project in dashboard
8. Test with live keys (use real card or Stripe test mode on live)
