# Dream API - Technical Overview

## What It Is

A complete API-as-a-Service platform. Developers integrate once, get:
- **Auth**: Clerk-based, multi-tenant user management
- **Billing**: Stripe Connect subscriptions + one-time payments
- **Usage Tracking**: Per-user metering with limits
- **Dashboard**: Real-time metrics, customer management

## Architecture

```
Developer's App (React/Next/Vue)
         │
         ├─► dream-sdk (npm package)
         │        │
         │        ├─► PK-only mode (frontend)
         │        │      └─► X-Publishable-Key header
         │        │
         │        └─► SK mode (backend)
         │               └─► Authorization: Bearer sk_xxx
         │
         ▼
    api-multi Worker
         │
         ├─► D1 (SQLite) - subscriptions, usage, tiers
         ├─► KV - caching, rate limiting
         ├─► R2 - asset storage
         │
         ├─► Clerk Backend API - JWT verification
         └─► Stripe Connect - payments
```

## Security Model

| Key Type | Where | Access Level |
|----------|-------|--------------|
| `pk_xxx` | Frontend (public) | Catalog + user ops with JWT |
| `sk_xxx` | Backend only | Full admin access |
| JWT | Per-user, from Clerk | User identity + plan |

**Same model as Stripe, Firebase, Auth0.**

### JWT Security
- Signed by Clerk with platform's secret key
- Contains `userId` (from Clerk, not user input)
- Contains `plan` (set by webhooks, not user spoofable)
- Contains `publishableKey` (tenant isolation)
- Verified server-side on every request

### Data Isolation
- `publishableKey` = project identifier (test vs live)
- `platformId` = developer account
- All queries filter by both
- No cross-tenant data access possible

## API Auth Modes

### Mode 1: PK Only (Frontend Safe)
```
Header: X-Publishable-Key: pk_xxx
Access: GET /api/tiers, GET /api/products
```

### Mode 2: PK + JWT (User Operations)
```
Headers:
  X-Publishable-Key: pk_xxx
  X-Clerk-Token: <jwt>
Access: usage tracking, billing, checkout
```

### Mode 3: SK (Backend Full Access)
```
Header: Authorization: Bearer sk_xxx
Access: Everything including customers, dashboard
```

## Database Schema (D1)

```sql
-- Developer accounts
platforms (platformId PK, clerkUserId, stripeAccountId)

-- API credentials per project
api_keys (publishableKey PK, platformId, secretKeyHash, mode, projectType)

-- Subscription tiers
tiers (publishableKey, name PK, price, requestLimit, priceId, productId)

-- User subscriptions
subscriptions (platformId, userId PK, plan, status, stripeCustomerId)

-- Usage tracking
usage_counts (platformId, userId PK, usageCount, periodStart, periodEnd)

-- End users per project
end_users (platformId, publishableKey, clerkUserId PK, email)

-- Webhook idempotency
events (eventId PK, type, payload_json)
```

## SDK Usage

```typescript
// Frontend - PK only
const api = new DreamAPI({ publishableKey: 'pk_xxx' });
await api.products.listTiers();  // works
await api.usage.check();         // needs JWT first
api.setUserToken(jwt);
await api.usage.check();         // works

// Backend - Full access
const api = new DreamAPI({ secretKey: 'sk_xxx', publishableKey: 'pk_xxx' });
await api.customers.delete(id);  // works
await api.dashboard.get();       // works
```

## Key Flows

### New User Signup
```
1. App redirects to sign-up worker
2. Clerk hosted page handles auth (email/Google)
3. Worker verifies token, sets metadata
4. User redirected back, logged in
```

### Subscription Upgrade
```
1. Frontend calls api.billing.createCheckout()
2. User completes Stripe checkout
3. Webhook fires → updates Clerk metadata
4. User's next JWT has new plan
```

### Usage Tracking
```
1. Frontend calls api.usage.track()
2. JWT verified → userId + plan extracted
3. D1 atomically increments usage
4. Returns current/limit (403 if exceeded)
```

## Workers

| Worker | Purpose |
|--------|---------|
| api-multi | Main API - usage, billing, products |
| oauth-api | Stripe Connect OAuth, tier management |
| front-auth-api | Developer auth, credentials |
| sign-up | End-user signup with metadata |

## What Makes It Solid

1. **Industry-standard auth model** - Same as Stripe (pk/sk split)
2. **JWT is the real auth** - Signed by Clerk, verified server-side
3. **Plan can't be spoofed** - Set by system, in publicMetadata
4. **Multi-tenant isolation** - PK in JWT verified against header
5. **Parameterized queries** - All D1 uses .bind()
6. **Webhook signatures** - Stripe events verified
7. **Rate limiting** - Per-user, KV-based
