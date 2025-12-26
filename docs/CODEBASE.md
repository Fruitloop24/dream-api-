# Codebase Reference

## Project Structure

```
dream-api/
├── api-multi/          # Main customer-facing API
├── oauth-api/          # Stripe Connect + tier management
├── front-auth-api/     # Dev authentication + credentials
├── sign-up/            # End-user signup worker
├── dream-sdk/          # Official TypeScript SDK
├── frontend/           # React dashboard (Cloudflare Pages)
├── test-app/           # Local testing client
└── docs/               # This documentation
```

---

## api-multi (Main API)

**URL:** `https://api-multi.k-c-sheffield012376.workers.dev`

**Purpose:** Customer-facing API for usage tracking, billing, products, dashboard.

```
api-multi/
├── src/
│   ├── index.ts              # Main router - all endpoint routing
│   ├── types.ts              # Env interface, PlanTier types
│   ├── utils.ts              # Validation helpers
│   ├── stripe-webhook.ts     # Stripe Connect webhook handler
│   │                         # - Subscription events → update Clerk metadata
│   │                         # - Payment events → decrement inventory
│   │                         # - Idempotency via events table
│   │
│   ├── config/
│   │   ├── tiers.ts          # Default tier definitions, rate limits
│   │   ├── configLoader.ts   # Load tiers from D1/KV with caching
│   │   └── config.ts         # Config constants
│   │
│   ├── middleware/
│   │   ├── apiKey.ts         # SK verification (hash → publishableKey lookup)
│   │   ├── cors.ts           # Origin validation (allowlist + regex)
│   │   ├── rateLimit.ts      # KV-based rate limiting
│   │   └── security.ts       # Security headers (CSP, XSS, etc.)
│   │
│   ├── routes/
│   │   ├── customers.ts      # CRUD for end-users in Clerk
│   │   │                     # - create, get, update, delete
│   │   ├── usage.ts          # Usage tracking + limit enforcement
│   │   │                     # - POST /api/data (increment)
│   │   │                     # - GET /api/usage (check)
│   │   ├── checkout.ts       # Stripe checkout + portal
│   │   │                     # - POST /api/create-checkout
│   │   │                     # - POST /api/customer-portal
│   │   ├── products.ts       # Store mode - product listing + cart
│   │   │                     # - GET /api/products
│   │   │                     # - POST /api/cart/checkout
│   │   ├── dashboard.ts      # Dev metrics dashboard
│   │   │                     # - GET /api/dashboard
│   │   │                     # - GET /api/dashboard/totals
│   │   └── assets.ts         # R2 image upload/retrieval
│   │                         # - POST /api/assets
│   │                         # - GET /api/assets/{key}
│   │
│   └── services/
│       ├── d1.ts             # All D1 database operations
│       │                     # - upsertEndUser, upsertSubscription
│       │                     # - decrementInventory, recordEvent
│       └── kv.ts             # KV helpers (getCurrentPeriod, cache)
│
└── wrangler.toml             # Bindings: TOKENS_KV, DB, dream_api_assets
```

---

## oauth-api (Stripe Connect)

**URL:** `https://oauth-api.k-c-sheffield012376.workers.dev`

**Purpose:** Stripe Connect OAuth, product/tier creation, test→live promotion.

```
oauth-api/
├── src/
│   ├── index.ts              # Main router
│   ├── types.ts              # Env interface, ProjectType
│   │
│   ├── routes/
│   │   ├── oauth.ts          # Stripe Connect OAuth flow
│   │   │                     # - GET /authorize (start OAuth)
│   │   │                     # - GET /callback (exchange code)
│   │   ├── products.ts       # Create new project with products
│   │   │                     # - POST /create-products
│   │   ├── tiers.ts          # CRUD for existing tiers
│   │   │                     # - GET/PUT/POST/DELETE /tiers
│   │   └── promote.ts        # Test to live promotion
│   │                         # - POST /promote-to-live
│   │
│   └── lib/
│       ├── auth.ts           # Clerk JWT verification
│       ├── keys.ts           # API key generation + hashing
│       ├── tiers.ts          # Tier upsert operations
│       ├── stripe.ts         # Stripe token storage
│       ├── schema.ts         # D1 schema migrations
│       └── projects.ts       # Project helpers
│
└── wrangler.toml             # Bindings: PLATFORM_TOKENS_KV, CUSTOMER_TOKENS_KV, DB
```

---

## front-auth-api (Dev Auth)

**URL:** `https://front-auth-api.k-c-sheffield012376.workers.dev`

**Purpose:** Developer authentication, credential management, project CRUD.

```
front-auth-api/
├── src/
│   ├── index.ts              # Main router + inline handlers
│   ├── types.ts              # Env interface
│   ├── webhook.ts            # Clerk webhook (dev user events)
│   │
│   └── lib/
│       ├── auth.ts           # Clerk JWT verification for devs
│       ├── keys.ts           # Secret key management
│       ├── keyRotation.ts    # Key regeneration logic
│       ├── schema.ts         # D1 schema for platforms
│       ├── projects.ts       # Project helpers
│       └── projectsRoute.ts  # Project CRUD endpoints
│
└── wrangler.toml             # Bindings: TOKENS_KV, DB
```

---

## sign-up (End-User Signup)

**URL:** `https://sign-up.k-c-sheffield012376.workers.dev`

**Purpose:** End-user registration with metadata for multi-tenant isolation.

```
sign-up/
├── src/
│   └── index.ts              # Single file worker
│                             # - GET /signup (render page)
│                             # - GET /complete (OAuth callback)
│                             # - POST /oauth/complete (set metadata)
│                             # - GET /verify (email link callback)
│                             # Contains embedded HTML templates
│
├── oauth.md                  # Technical implementation docs
└── wrangler.toml             # Bindings: TOKENS_KV, DB
```

---

## dream-sdk (TypeScript SDK)

**NPM:** `@dream-api/sdk` (not published yet)

**Purpose:** Official SDK for devs using the API.

```
dream-sdk/
├── src/
│   ├── index.ts              # Main export - DreamAPI class
│   │                         # - Namespaced APIs: customers, usage, billing, products, dashboard
│   │                         # - setUserToken() for JWT
│   ├── client.ts             # HTTP client with auto auth headers
│   ├── auth.ts               # URL helpers (getSignUpUrl, getSignInUrl)
│   └── types.ts              # All TypeScript interfaces
│
├── package.json              # @dream-api/sdk
├── tsconfig.json
└── README.md                 # SDK documentation
```

---

## frontend (React Dashboard)

**URL:** Cloudflare Pages (auto-deploy)

**Purpose:** Dev-facing dashboard for managing projects, tiers, customers.

```
frontend/
├── src/
│   ├── components/
│   │   ├── dashboard/        # Dashboard UI components
│   │   ├── layout/           # Layout components
│   │   └── shared/           # Reusable components
│   │
│   ├── hooks/
│   │   ├── useDashboardData.ts   # Fetch dashboard metrics
│   │   ├── useProjects.ts        # Project management
│   │   ├── useCredentials.ts     # API key display
│   │   └── usePayment.ts         # Stripe connection
│   │
│   └── constants/
│       └── index.ts          # API URLs, config
│
└── vite.config.ts
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `api-multi/src/index.ts` | Main routing - where endpoints are wired |
| `api-multi/src/services/d1.ts` | All database operations |
| `api-multi/src/stripe-webhook.ts` | Payment/subscription event handling |
| `oauth-api/src/routes/products.ts` | Product/tier creation in Stripe |
| `sign-up/src/index.ts` | Complete signup flow + HTML templates |
| `dream-sdk/src/index.ts` | SDK entry point |

---

## Bindings Summary

| Worker | KV | D1 | R2 |
|--------|----|----|-----|
| api-multi | TOKENS_KV | DB | dream_api_assets |
| oauth-api | PLATFORM_TOKENS_KV, CUSTOMER_TOKENS_KV | DB | - |
| front-auth-api | TOKENS_KV | DB | - |
| sign-up | TOKENS_KV | DB | - |

**Note:** oauth-api bridges two KV namespaces - writes to both front-auth (dev data) and api-multi (tier configs).
