# dream-api - Technical Reference

**Updated:** 2024-12-14 | **Status:** Working, edit/create modes complete

## What This Is
API-as-a-Service platform. Devs pay $15/mo → get API keys, auth, billing, usage tracking, dashboard. Two products:
1. **SaaS subscriptions** - tiers with usage limits, recurring billing
2. **Store/one-offs** - products with inventory, cart checkout, one-time payment

No webhooks for devs. Everything handled internally via Stripe Connect + Clerk JWT.

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
│  - /api/data (usage tracking)    - /api/dashboard               │
│  - /api/create-checkout          - /api/products                │
│  - /api/cart/checkout            - /api/customer-portal         │
│  - /webhook/stripe               - /api/assets                  │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   [D1 Database]        [KV Store]           [R2 Bucket]
```

## Two Clerk Apps
- `dream-api` - YOUR devs who pay $15/mo
- `end-user-api` - Shared app for ALL devs' customers, isolated by publishableKey in JWT

## Test/Live Mode System

### Key Format
- Test: `pk_test_xxx`, `sk_test_xxx`
- Live: `pk_live_xxx`, `sk_live_xxx`
- Both tied to same `platformId (plt_xxx)`

### KV Storage Pattern
```
user:{userId}:platformId → plt_xxx
user:{userId}:publishableKey:test → pk_test_xxx
user:{userId}:secretKey:test → sk_test_xxx
user:{userId}:publishableKey:live → pk_live_xxx
user:{userId}:secretKey:live → sk_live_xxx
user:{userId}:products:test → [{tier, priceId, productId}]
user:{userId}:products:live → [{tier, priceId, productId}]
```

### Mode Selection
- Key prefix auto-detected: `pk_test_` vs `pk_live_`
- Dashboard fetches both modes, displays based on toggle
- Config page accepts mode param for edit operations

## Frontend Pages

### Dashboard (`/dashboard`) - DashboardNew.tsx
- **Tabs**: SaaS/Subscriptions | Store/One-offs
- **Mode toggle**: Test (amber) | Live (green) - top right
- **Keys section**: Shows BOTH test and live keys side-by-side
- **SaaS tab**: Metrics (MRR, active, canceling), tiers, customer table with usage bars
- **Store tab**: Products grid with images, inventory, sold-out badges
- **Actions**:
  - `+ New Project` → create mode (new keys)
  - `Edit Tiers` → edit mode (update existing, no new keys)
- Theme: Dark (gray-900)

### Config Page (`/api-tier-config`) - ApiTierConfig.tsx
**Two modes controlled by URL params:**

1. **Create Mode** (default, no params)
   - Shows project name input field
   - Creates new Stripe products on submit
   - Generates new API keys (pk/sk)
   - Button: "Create Test/Live Subscriptions →"

2. **Edit Mode** (`?edit=true&mode=test|live`)
   - Blue "Edit Mode" banner
   - Loads existing tiers from GET /tiers
   - Updates via PUT/POST/DELETE /tiers endpoints
   - Does NOT generate new keys
   - Tier IDs locked for existing tiers (can't rename)
   - Button: "Save Changes"

- **Tabs**: SaaS/Subscriptions | Store/One-offs
- **Mode toggle**: Test Mode (amber) | Live Mode (green)
- Theme: Dark (gray-900)

### Credentials (`/credentials`) - Credentials.tsx
- Shows test/live keys summary after product creation
- Simplified - just confirms and links to dashboard
- Theme: Dark (gray-900)

## Backend Services

### front-auth-api
- `POST /generate-platform-id` - Creates plt_xxx on first login
- `POST /create-checkout` - $15/mo subscription checkout
- `GET /get-credentials` - Returns test AND live keys
- `POST /upload-asset` - R2 image upload (Clerk auth)

### oauth-api
- `GET /authorize` - Stripe Connect OAuth start
- `GET /callback` - OAuth completion, stores token
- `POST /create-products` - Creates Stripe products, generates keys
  - Accepts: `userId`, `tiers[]`, `mode`, `projectName`
  - Returns: `publishableKey`, `secretKey`, `products[]`
- `POST /promote-to-live` - Clones test config to live products/keys

**Tier Management (no new keys):**
- `GET /tiers?userId=xxx&mode=test` - List existing tiers
- `PUT /tiers` - Update tier (displayName, price, limit, features, etc)
- `POST /tiers/add` - Add new tier (creates Stripe product)
- `DELETE /tiers` - Delete tier (archives Stripe product)

### api-multi (the actual API devs use)
- `POST /api/data` - Usage increment + limit check
- `GET /api/usage` - Check current usage
- `POST /api/create-checkout` - Subscription checkout
- `POST /api/cart/checkout` - One-off cart checkout
- `GET /api/products` - List one-off products
- `GET /api/dashboard` - Full dashboard data (filtered by mode)
- `POST /api/customer-portal` - Stripe portal link
- `POST /webhook/stripe` - Connect webhook handler

## D1 Tables

```sql
platforms(platformId, clerkUserId, createdAt)
api_keys(platformId, publishableKey, secretKeyHash, status, mode, name, createdAt)
stripe_tokens(platformId, stripeUserId, accessToken, refreshToken, scope, mode, createdAt)
tiers(platformId, name, displayName, price, limit, priceId, productId, features, popular, inventory, soldOut, mode, createdAt)
end_users(platformId, publishableKey, clerkUserId, email, status, createdAt, updatedAt)
usage_counts(platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt)
subscriptions(platformId, userId, publishableKey, plan, priceId, productId, amount, currency, status, currentPeriodEnd, canceledAt, cancelReason, subscriptionId, stripeCustomerId, updatedAt)
events(platformId, source, type, eventId UNIQUE, payload_json, createdAt)
```

## Recent Changes (Dec 2024)

### Project Naming
- `api_keys` table now has `name` column
- Config page asks for project name on create
- Stored per key set for dashboard display

### Edit vs Create Mode
- Config page detects `?edit=true` URL param
- Edit mode: loads existing tiers, uses PUT/DELETE endpoints
- Create mode: asks for project name, creates new keys
- Dashboard links: "Edit Tiers" passes edit params, "+ New Project" doesn't

### Dashboard Mode Filtering
- Customers/subscriptions filtered by key prefix (`pk_test_%` vs `pk_live_%`)
- Test mode shows only test customers
- Live mode shows only live customers

### Tier CRUD Endpoints
- GET /tiers - List existing
- PUT /tiers - Update properties
- POST /tiers/add - Add new tier (creates Stripe product)
- DELETE /tiers - Remove tier (archives Stripe product)

### Fixed Issues
- Empty Stripe description error (only send for one-offs when provided)
- CORS missing X-Env header
- Mode not passed to getAllTiers causing wrong tier display
- Test/live customer separation in dashboard

## Deployment

```bash
# Auto-deploy via GitHub/Cloudflare connector
git add -A && git commit -m "message" && git push

# Manual deploy if needed:
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

## API Examples

### Usage tracking (SaaS)
```js
const res = await fetch('https://api-multi.../api/data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_xxx',
    'X-User-Id': 'user_123',
    'X-User-Plan': 'free'
  }
});
// Returns: { allowed: true, usage: { count: 1, limit: 100 } }
// At limit: { error: "Tier limit reached" }
```

### Create checkout (SaaS)
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
// Returns: { url: 'https://checkout.stripe.com/...' }
```

### Cart checkout (Store)
```js
const res = await fetch('https://api-multi.../api/cart/checkout', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer sk_test_xxx' },
  body: JSON.stringify({
    email: 'buyer@example.com',
    items: [{ priceId: 'price_xxx', quantity: 2 }],
    successUrl: 'https://mystore.com/thanks',
    cancelUrl: 'https://mystore.com/cart'
  })
});
// Returns: { url: 'https://checkout.stripe.com/...' }
```

## TODO / Future
- [x] API naming - let devs name their API projects
- [x] Edit tiers without regenerating keys
- [ ] Display project names in dashboard
- [ ] Key rotation endpoint (rotate sk without touching products)
- [ ] Better onboarding flow (reduce redirects)
- [ ] SDK: `npm install dream-api`
