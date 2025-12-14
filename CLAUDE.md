# dream-api - Technical Reference

**Updated:** 2024-12-14 | **Status:** Working, UI refresh complete

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
│  - /api/use (usage tracking)      - /api/dashboard              │
│  - /api/create-checkout           - /api/products               │
│  - /api/cart/checkout             - /api/customer-portal        │
│  - /webhook/stripe                - /api/assets                 │
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
user:{userId}:publishableKey:live → pk_live_xxx (also without :live suffix)
user:{userId}:secretKey:live → sk_live_xxx (also without :live suffix)
user:{userId}:products:test → [{tier, priceId, productId}]
user:{userId}:products:live → [{tier, priceId, productId}]
```

### Mode Selection
- API header: `X-Env: test|live` (defaults to live)
- Key prefix detected: `pk_test_` vs `pk_live_`
- Dashboard fetches both modes, displays based on toggle

## Frontend Pages

### Dashboard (`/dashboard`) - DashboardNew.tsx
- **Tabs**: SaaS/Subscriptions | Store/One-offs
- **Mode toggle**: Test (amber) | Live (green) - top right
- **Keys section**: Shows BOTH test and live keys side-by-side
- **SaaS tab**: Metrics (MRR, active, canceling), tiers, customer table with usage bars
- **Store tab**: Products grid with images, inventory, sold-out badges
- **Webhook status**: Bottom of page, shows recent events
- Theme: Dark (gray-900)

### Config Page (`/api-tier-config`) - ApiTierConfig.tsx
- **Tabs**: SaaS/Subscriptions | Store/One-offs
- **Mode toggle**: Test Mode (amber) | Live Mode (green)
- **SaaS form**: Tier ID, display name, price, limit, features, popular checkbox
- **Store form**: Product ID, display name, price, inventory, description, image upload, features
- After submit → redirects to dashboard
- Theme: Dark (gray-900)

### Credentials (`/credentials`) - Credentials.tsx
- Shows test/live keys summary after product creation
- Simplified - just confirms and links to dashboard
- Theme: Dark (gray-900)

## Backend Services

### front-auth-api
- `POST /generate-platform-id` - Creates plt_xxx on first login
- `POST /create-checkout` - $15/mo subscription checkout
- `GET /get-credentials` - Returns test AND live keys (fixed to work with test-only)
- `POST /upload-asset` - R2 image upload (Clerk auth)

### oauth-api
- `GET /authorize` - Stripe Connect OAuth start
- `GET /callback` - OAuth completion, stores token
- `POST /create-products` - Creates Stripe products, generates keys (accepts `mode`)
- `POST /promote-to-live` - Clones test config to live products/keys

### api-multi (the actual API devs use)
- `POST /api/use` - Usage increment + limit check
- `POST /api/create-checkout` - Subscription checkout
- `POST /api/cart/checkout` - One-off cart checkout
- `GET /api/products` - List one-off products
- `GET /api/dashboard` - Full dashboard data
- `POST /api/customer-portal` - Stripe portal link
- `POST /webhook/stripe` - Connect webhook handler

## D1 Tables

```sql
platforms(platformId, clerkUserId, createdAt)
api_keys(platformId, publishableKey, secretKeyHash, status, mode, createdAt)
stripe_tokens(platformId, stripeUserId, accessToken, refreshToken, scope, mode, createdAt)
tiers(platformId, name, displayName, price, limit, priceId, productId, features, popular, inventory, soldOut, mode, createdAt)
end_users(platformId, publishableKey, clerkUserId, email, status, createdAt, updatedAt)
usage_counts(platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt)
subscriptions(platformId, userId, publishableKey, plan, priceId, productId, amount, currency, status, currentPeriodEnd, canceledAt, cancelReason, subscriptionId, stripeCustomerId, updatedAt)
events(platformId, source, type, eventId UNIQUE, payload_json, createdAt)
usage_snapshots(platformId, userId, plan, periodStart, periodEnd, usageCount, updatedAt)
```

## Recent Changes (Dec 2024)

### Fixed: Test keys not showing in dashboard
- `/get-credentials` now returns keys even if only test keys exist
- Checks both test AND live, allows either set
- Returns explicit fields: testPublishableKey, testSecretKey, livePublishableKey, liveSecretKey

### New: Dashboard with tabs
- SaaS tab: subscriptions, usage, customers, MRR
- Store tab: one-off products, inventory, sold-out status
- Both test/live keys visible side-by-side (not toggle that hides one)

### New: Config page redesign
- Dark theme matching dashboard
- Separate forms for SaaS (simple) vs Store (images/inventory)
- Test/Live mode selector
- Goes straight to dashboard after submit

### Flow now
```
Sign up → Pay $15 → Connect Stripe → Config (dark, tabs) → Dashboard
         ↑                              ↑
      front-auth                    oauth-api
```

## Deployment

```bash
# Frontend
cd frontend && npm run build
npx wrangler pages deploy dist --project-name=dream-frontend

# Workers
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
// Dev's backend calls this on each API request
const res = await fetch('https://api-multi.../api/use', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userId: 'user_123' })
});
// Returns: { allowed: true, usage: 45, limit: 100, plan: 'pro' }
```

### Create checkout (SaaS)
```js
const res = await fetch('https://api-multi.../api/create-checkout', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer sk_live_xxx' },
  body: JSON.stringify({
    userId: 'user_123',
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
  headers: { 'Authorization': 'Bearer sk_live_xxx' },
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
- [ ] API naming - let devs name their API projects
- [ ] Key rotation endpoint (rotate sk without touching products)
- [ ] Grace period for old keys during rotation
- [ ] Better onboarding flow (reduce redirects)
- [ ] AI prompt generator with all product/config info loaded
