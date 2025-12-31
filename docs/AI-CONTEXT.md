# Dream API - AI Agent Context

Use this file when asking AI assistants to help with Dream API integration.

## Quick Facts

- **SDK:** `npm install @dream-api/sdk`
- **Auth model:** PK (public) + SK (secret) - same as Stripe
- **User auth:** Clerk JWT in `X-Clerk-Token` header
- **Database:** Cloudflare D1 (SQLite)
- **Caching:** Cloudflare KV
- **Payments:** Stripe Connect

## SDK Modes

```typescript
// FRONTEND (browser) - PK only, safe to expose
const api = new DreamAPI({
  publishableKey: 'pk_test_xxx',  // or pk_live_xxx
});

// BACKEND (Node/Workers) - Full access
const api = new DreamAPI({
  secretKey: process.env.DREAM_SECRET_KEY,
  publishableKey: 'pk_test_xxx',
});
```

## Available Methods

### No Auth Required (PK only)
```typescript
api.products.listTiers()    // GET /api/tiers
api.products.list()         // GET /api/products
```

### User Auth Required (PK + JWT)
```typescript
api.setUserToken(clerkJWT);
api.usage.track()           // POST /api/data
api.usage.check()           // GET /api/usage
api.billing.createCheckout({ tier: 'pro' })
api.billing.openPortal()
```

### Admin Only (SK required)
```typescript
api.customers.create({ email, plan })
api.customers.get(id)
api.customers.update(id, { plan })
api.customers.delete(id)
api.dashboard.get()
api.dashboard.getTotals()
```

## Common Patterns

### Pricing Page (Frontend)
```typescript
const { tiers } = await api.products.listTiers();
// No auth needed - public catalog
```

### Check Usage Before Feature
```typescript
const usage = await api.usage.check();
if (usage.remaining <= 0) {
  // Show upgrade modal
}
```

### Track API Call
```typescript
const result = await api.usage.track();
if (!result.success) {
  // Limit exceeded
}
```

### Upgrade Flow
```typescript
const { url } = await api.billing.createCheckout({
  tier: 'pro',
  successUrl: '/dashboard?upgraded=true',
  cancelUrl: '/pricing',
});
window.location.href = url;
```

## Environment Variables

```env
# Frontend (.env)
VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx

# Backend (.env) - NEVER in frontend!
DREAM_SECRET_KEY=sk_test_xxx
```

## API Response Shapes

```typescript
// Usage
{ used: 5, limit: 100, remaining: 95, plan: 'pro', periodStart, periodEnd }

// Tier
{ name: 'pro', displayName: 'Pro', price: 29, limit: 10000, priceId, features: [] }

// Checkout result
{ url: 'https://checkout.stripe.com/...' }

// Dashboard
{ activeSubscriptions, mrr, usageThisPeriod, customers: [], tiers: [] }
```

## Error Handling

```typescript
import { DreamAPIException } from '@dream-api/sdk';

try {
  await api.usage.track();
} catch (e) {
  if (e instanceof DreamAPIException) {
    if (e.status === 401) // Not authenticated
    if (e.status === 403) // Limit exceeded or forbidden
    if (e.status === 429) // Rate limited
  }
}
```

## Key Rules

1. **Never put SK in frontend code** - Use PK only
2. **Always call setUserToken() before user ops** - JWT required
3. **Prices are in dollars, not cents** - Don't divide by 100
4. **Features is an array, not string** - Don't call .split()
5. **Use result.url, not result.checkoutUrl** - For redirects

## Project Structure

```
dream-api/
├── api-multi/         # Main API worker
├── oauth-api/         # Stripe Connect
├── front-auth-api/    # Dev auth
├── sign-up/           # End-user signup
├── dream-sdk/         # NPM package
├── frontend/          # Dev dashboard
└── docs/              # Documentation
```

## Helpful Files

- `CLAUDE.md` - Main reference (schemas, endpoints)
- `docs/TECHNICAL-OVERVIEW.md` - Architecture deep-dive
- `docs/LIMITATIONS.md` - Known constraints
- `docs/SDK-GOTCHAS.md` - Common mistakes
- `docs/SAAS-GUIDE.md` - Subscription apps
- `docs/STORE-GUIDE.md` - E-commerce apps
