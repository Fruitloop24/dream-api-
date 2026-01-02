# Dream API - Architecture

Technical reference for contributors and maintainers.

---

## System Overview

```
Developer's App
      │
      ├─► @dream-api/sdk
      │        │
      │        ├─► PK mode (frontend)
      │        │      └─► X-Publishable-Key header
      │        │
      │        └─► SK mode (backend)
      │               └─► Authorization: Bearer sk_xxx
      │
      ▼
 api-multi Worker
      │
      ├─► D1 (SQLite) - subscriptions, usage, tiers
      ├─► KV - caching, auth lookups
      ├─► R2 - asset storage
      │
      ├─► Clerk Backend API - JWT verification
      └─► Stripe Connect - payments
```

---

## Workers

### api-multi
**URL:** `https://api-multi.k-c-sheffield012376.workers.dev`

Main customer-facing API. Handles usage tracking, billing, products, dashboard.

```
api-multi/src/
├── index.ts              # Router
├── types.ts              # TypeScript interfaces
├── stripe-webhook.ts     # Stripe event handling
├── config/
│   ├── tiers.ts          # Default tier definitions
│   └── configLoader.ts   # Load tiers from D1/KV
├── middleware/
│   ├── apiKey.ts         # PK/SK verification
│   ├── cors.ts           # Origin validation
│   ├── rateLimit.ts      # KV-based rate limiting
│   └── security.ts       # Security headers
├── routes/
│   ├── customers.ts      # Customer CRUD
│   ├── usage.ts          # Usage tracking
│   ├── checkout.ts       # Stripe checkout/portal
│   ├── products.ts       # Product catalog
│   ├── dashboard.ts      # Metrics
│   └── assets.ts         # R2 uploads
└── services/
    ├── d1.ts             # Database operations
    └── kv.ts             # KV helpers
```

### oauth-api
**URL:** `https://oauth-api.k-c-sheffield012376.workers.dev`

Stripe Connect OAuth, product/tier management.

```
oauth-api/src/
├── index.ts
├── routes/
│   ├── oauth.ts          # Stripe Connect flow
│   ├── products.ts       # Create products/tiers
│   ├── tiers.ts          # Tier CRUD
│   └── promote.ts        # Test → Live
└── lib/
    ├── auth.ts           # JWT verification
    ├── keys.ts           # Key generation
    └── stripe.ts         # Stripe helpers
```

### front-auth-api
**URL:** `https://front-auth-api.k-c-sheffield012376.workers.dev`

Developer authentication, project management.

```
front-auth-api/src/
├── index.ts
├── webhook.ts            # Clerk webhook
└── lib/
    ├── auth.ts           # Dev JWT verification
    ├── keys.ts           # SK management
    ├── keyRotation.ts    # Key regeneration
    └── projectsRoute.ts  # Project CRUD
```

### sign-up
**URL:** `https://sign-up.k-c-sheffield012376.workers.dev`

End-user signup using Clerk hosted pages.

```
sign-up/src/
└── index.ts              # All routes (~300 lines)
    ├── GET /signup       # Validate PK, redirect to Clerk
    ├── GET /callback     # Return from Clerk, set metadata
    └── POST /oauth/complete  # Verify token, sync D1
```

---

## SDK

```
dream-sdk/src/
├── index.ts              # Main export, DreamAPI class
├── client.ts             # HTTP client with auto auth
├── auth.ts               # URL helpers, Clerk integration
├── clerk.ts              # Clerk SDK loader
└── types.ts              # TypeScript types
```

**Modes:**
- Frontend (PK only): Uses `X-Publishable-Key` header
- Backend (PK + SK): Uses `Authorization: Bearer` header

---

## Security Model

### Key Hierarchy
```
Platform (Developer)
    └── platformId: plt_xxx
    └── clerkUserId: user_xxx (dream-api Clerk)
    └── stripeAccountId: acct_xxx

Project
    └── publishableKey: pk_test_xxx (public)
    └── secretKeyHash: sha256(sk_test_xxx) (stored hashed)
    └── mode: test | live
    └── projectType: saas | store

End User
    └── clerkUserId: user_yyy (end-user-api Clerk)
    └── publicMetadata: { publishableKey, plan }
```

### JWT Contents
```json
{
  "sub": "user_yyy",
  "metadata": {
    "publishableKey": "pk_test_xxx",
    "plan": "pro"
  }
}
```

### Auth Flow
1. Request arrives with SK or PK header
2. SK: Hash and lookup in KV → get platformId
3. PK: Lookup in KV → get platformId
4. JWT (if present): Verify with Clerk, extract userId + plan
5. All D1 queries filter by publishableKey for isolation

---

## Data Flow

### Sign-Up
```
1. App redirects to /signup?pk=xxx&redirect=/dashboard
2. Worker validates PK, sets cookie, redirects to Clerk hosted signup
3. User creates account (email or Google)
4. Clerk redirects to /callback
5. Worker verifies session token, sets publicMetadata
6. Worker syncs user to D1 (end_users table)
7. Redirect to app - user is logged in
```

### Subscription
```
1. Frontend calls api.billing.createCheckout({ tier: 'pro' })
2. API creates Stripe Checkout session
3. User completes payment on Stripe
4. Stripe webhook → api-multi
5. Update D1 subscriptions table
6. Update Clerk publicMetadata.plan
7. User's next JWT has new plan
```

### Usage Tracking
```
1. Frontend calls api.usage.track()
2. JWT verified → userId + plan extracted
3. D1: Check current usage vs tier limit
4. D1: Atomic increment usage_counts
5. Return current/limit/remaining
6. If limit exceeded, return 403
```

---

## Bindings

| Worker | KV | D1 | R2 |
|--------|----|----|-----|
| api-multi | TOKENS_KV | DB | dream_api_assets |
| oauth-api | PLATFORM_TOKENS_KV, CUSTOMER_TOKENS_KV | DB | - |
| front-auth-api | TOKENS_KV | DB | - |
| sign-up | TOKENS_KV | DB | - |

---

## Two Clerk Apps

### dream-api
Platform developers (our customers).
- Used by: front-auth-api, oauth-api
- JWT template: None (default)

### end-user-api
All end-users across all developers.
- Used by: api-multi, sign-up
- JWT template: `end-user-api`
- Isolation via `publicMetadata.publishableKey`

---

## Deployment

```bash
# Workers
cd api-multi && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd front-auth-api && npx wrangler deploy
cd sign-up && npx wrangler deploy

# SDK
cd dream-sdk && npm publish

# Frontend Dashboard
# Auto-deploys via Cloudflare Pages
```

---

## Key Concepts

1. **publishableKey** - Project identifier, test/live isolation
2. **platformId** - Developer account identifier
3. **JWT verification** - All user ops verify Clerk JWT server-side
4. **Plan in metadata** - Set by webhooks, not user input, not spoofable
5. **Parameterized queries** - All D1 uses `.bind()` for SQL safety
6. **Webhook idempotency** - Events table prevents duplicates
