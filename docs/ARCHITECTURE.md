# Dream API - Architecture

Technical reference for contributors and maintainers.

---

## System Overview

Two billing flows, two Clerk apps, four workers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLATFORM BILLING                                   │
│                     (Devs pay us $19/mo + overage)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Developer                                                                  │
│       │                                                                      │
│       ├─► Clerk (dream-api app) ──► front-auth-api                          │
│       │                                    │                                 │
│       ├─► Stripe Connect ─────────► oauth-api                               │
│       │                                    │                                 │
│       └─► $19/mo subscription ────► front-auth-api ◄── Stripe Webhooks     │
│                                            │                                 │
│                                     Daily cron → Stripe Billing Meter       │
│                                     (end-user overage)                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           END-USER BILLING                                   │
│                  (End-users pay devs via Stripe Connect)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Developer's App                                                            │
│       │                                                                      │
│       ├─► @dream-api/sdk                                                    │
│       │        │                                                             │
│       │        ├─► PK mode (frontend)                                       │
│       │        │      └─► X-Publishable-Key header                          │
│       │        │                                                             │
│       │        └─► SK mode (backend)                                        │
│       │               └─► Authorization: Bearer sk_xxx                      │
│       │                                                                      │
│       ▼                                                                      │
│   api-multi Worker                                                          │
│       │                                                                      │
│       ├─► D1 (SQLite) - subscriptions, usage, tiers                         │
│       ├─► KV - caching, auth lookups                                        │
│       ├─► R2 - asset storage                                                │
│       │                                                                      │
│       ├─► Clerk (end-user-api) - JWT verification                           │
│       └─► Stripe Connect - payments go to dev's Stripe                      │
│                                                                              │
│   End-User Sign-up                                                           │
│       └─► sign-up Worker ──► Clerk (end-user-api)                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pricing Model

| Who Pays | To Whom | Amount | How |
|----------|---------|--------|-----|
| Developer | Dream API | $19/mo base | Stripe subscription |
| Developer | Dream API | $0.03/user after 2,000 | Stripe Billing Meter |
| End-user | Developer | Tier price | Stripe Connect (direct) |

**Key insight:** We don't touch end-user payments. Stripe Connect routes funds directly to dev's Stripe account. We only charge devs for platform usage.

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

Developer authentication, project management, AND platform billing.

```
front-auth-api/src/
├── index.ts              # Router + cron handler
├── types.ts              # TypeScript interfaces
├── webhook.ts            # Stripe webhook (platform billing)
└── lib/
    ├── auth.ts           # Dev JWT verification
    ├── keys.ts           # SK management
    ├── keyRotation.ts    # Key regeneration
    ├── projectsRoute.ts  # Project CRUD
    ├── schema.ts         # D1 schema migrations
    └── usage.ts          # End-user counting + Stripe Meter
```

**Platform Billing Endpoints:**
```
POST /create-checkout     # $19/mo subscription (14-day trial)
POST /billing-portal      # Stripe billing portal
GET  /subscription        # Status, usage, overage estimate
POST /webhook/stripe      # Subscription events
```

**Cron Trigger:** Daily 00:00 UTC - Report end-user counts to Stripe Meter

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

### admin-dashboard
**URL:** `https://admin-dashboard.k-c-sheffield012376.workers.dev`

Internal admin metrics dashboard. Protected by Cloudflare Access (email whitelist).

```
admin-dashboard/src/
└── index.ts              # Single file (~400 lines)
    ├── GET /             # Dashboard HTML (inline)
    └── GET /api/data     # JSON metrics
```

**Shows:**
- Total devs, paying devs, trialing devs
- MRR (paying × $19), overage revenue
- Live/test end-users per dev
- Subscription status, trial countdown
- Dev emails (via Clerk API)

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

| Worker | KV | D1 | R2 | Cron |
|--------|----|----|-----|------|
| api-multi | TOKENS_KV | DB | dream_api_assets | - |
| oauth-api | PLATFORM_TOKENS_KV, CUSTOMER_TOKENS_KV | DB | - | - |
| front-auth-api | TOKENS_KV, USAGE_KV, API_MULTI_KV | DB | dream_api_assets | Daily 00:00 UTC |
| sign-up | TOKENS_KV | DB | - | - |
| admin-dashboard | - | DB | - | - |

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
# Workers (all auto-deploy via GitHub/Cloudflare connector)
cd api-multi && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd front-auth-api && npx wrangler deploy
cd sign-up && npx wrangler deploy

# SDK
cd dream-sdk && npm publish

# Frontend Dashboard
# Auto-deploys via Cloudflare Pages
```

### Environment Secrets (set via wrangler secret)

| Worker | Secrets |
|--------|---------|
| api-multi | CLERK_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| oauth-api | CLERK_SECRET_KEY, STRIPE_SECRET_KEY |
| front-auth-api | CLERK_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID |
| sign-up | CLERK_SECRET_KEY |

---

## Database Schema Updates

### platforms table (extended for billing)

```sql
CREATE TABLE IF NOT EXISTS platforms (
  platformId TEXT PRIMARY KEY,
  clerkUserId TEXT,
  stripeCustomerId TEXT,        -- Stripe customer ID (for our billing)
  stripeSubscriptionId TEXT,    -- Their $19/mo subscription
  subscriptionStatus TEXT,      -- 'trialing', 'active', 'past_due', 'canceled'
  trialEndsAt INTEGER,          -- Unix timestamp
  currentPeriodEnd INTEGER,     -- Unix timestamp
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Platform Billing Flow

```
1. Dev signs up via Clerk (dream-api app)
2. /generate-platform-id creates plt_xxx
3. Dev goes to billing → platform-billing creates Stripe checkout
   - 14-day trial with payment method required
   - $19/mo after trial
4. Stripe webhook → platform-billing
   - checkout.session.completed: Store stripeCustomerId, subscriptionId
   - customer.subscription.updated: Update status, period
   - invoice.payment_succeeded: Confirm active
   - customer.subscription.deleted: Mark canceled
5. Daily cron → platform-billing
   - Count live end-users per platform
   - Report to Stripe Billing Meter
   - Stripe auto-calculates overage ($0.03/user after 2,000)
```

### Store Mode (No End-User Cost)

Store mode uses guest checkout - no Clerk users created, no cost to us:

```
End-user → Stripe Checkout (guest) → Dev's Stripe account
                ↓
         No Clerk user created
         No count toward 2,000 limit
         No overage billing
```

### Subscription Enforcement (API Access Gating)

Dev API access is gated by subscription status to ensure devs can't use the API without paying.

**KV Cache Structure:**
```typescript
// Key: platform:{platformId}:subscription
// Written by: front-auth-api webhook
// Read by: api-multi apiKey middleware
{
  "status": "active",              // trialing|active|past_due|canceled
  "currentPeriodEnd": 1736553600000,
  "gracePeriodEnd": 1737158400000  // currentPeriodEnd + 7 days
}
```

**Enforcement Flow:**
```
1. Stripe event (subscription change)
       ↓
2. front-auth-api/webhook.ts
   - Update D1 platforms table
   - Cache status in KV (platform:{platformId}:subscription)
       ↓
3. api-multi/middleware/apiKey.ts
   - On every API call: verify key → check KV subscription
   - If canceled + grace expired → 403 "Subscription expired"
       ↓
4. front-auth-api/cron (daily)
   - Log platforms in grace period
   - Delete data for platforms 30+ days past cancellation
```

**Status Behavior:**
| Status | Dashboard | API Access | Data |
|--------|-----------|------------|------|
| `trialing` | ✅ | ✅ | ✅ |
| `active` | ✅ | ✅ | ✅ |
| `past_due` | ✅ | ✅ | ✅ |
| `canceled` (0-7 days) | ❌ | ✅ | ✅ |
| `canceled` (7+ days) | ❌ | ❌ | ✅ |
| `canceled` (30+ days) | ❌ | ❌ | 🗑️ |

**Constants:**
- Grace period: 7 days after `currentPeriodEnd`
- Data retention: 30 days after `currentPeriodEnd`

---

## Key Concepts

1. **publishableKey** - Project identifier, test/live isolation
2. **platformId** - Developer account identifier
3. **JWT verification** - All user ops verify Clerk JWT server-side
4. **Plan in metadata** - Set by webhooks, not user input, not spoofable
5. **Parameterized queries** - All D1 uses `.bind()` for SQL safety
6. **Webhook idempotency** - Events table prevents duplicates
7. **Live vs Test users** - Only `pk_live_%` users count toward billing
8. **Store mode is free** - Guest checkout creates no Clerk users
9. **Subscription enforcement** - API blocked when dev subscription expires (7-day grace)
