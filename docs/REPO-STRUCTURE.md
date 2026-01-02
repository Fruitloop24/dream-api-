# Repository Structure

## Overview

```
dream-api/
├── Workers (Cloudflare)
│   ├── api-multi/        # Main API - usage, checkouts, webhooks
│   ├── front-auth-api/   # Dev auth, credentials, projects
│   ├── oauth-api/        # Stripe Connect, products/tiers
│   └── sign-up/          # End-user signup flow
│
├── SDK
│   └── dream-sdk/        # @dream-api/sdk npm package
│
├── Templates (separate GitHub repos)
│   ├── dream-store-basic/   # E-commerce store template
│   └── dream-saas-basic/    # SaaS app template
│
├── Dashboard
│   └── frontend/         # Dev dashboard (React)
│
├── Docs
│   └── docs/             # All documentation
│
└── Test Apps
    └── test-paywall/     # Testing paywall integration
```

## Workers

### api-multi
**URL:** `https://api-multi.k-c-sheffield012376.workers.dev`

Main API that end-users interact with.

```
api-multi/
├── src/
│   ├── index.ts              # Entry point, router
│   ├── types.ts              # TypeScript interfaces
│   ├── utils.ts              # Helpers
│   ├── stripe-webhook.ts     # Stripe webhook handler
│   ├── config/
│   │   ├── config.ts         # Environment config
│   │   ├── configLoader.ts   # Config loading logic
│   │   └── tiers.ts          # Tier definitions
│   ├── middleware/
│   │   ├── apiKey.ts         # PK/SK validation
│   │   ├── cors.ts           # CORS handling
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── security.ts       # Security headers
│   ├── routes/
│   │   ├── assets.ts         # R2 asset uploads
│   │   ├── checkout.ts       # Stripe checkout sessions
│   │   ├── customers.ts      # Customer CRUD (SK only)
│   │   ├── dashboard.ts      # Dev metrics (SK only)
│   │   ├── products.ts       # Product listing (PK)
│   │   └── usage.ts          # Usage tracking (PK + JWT)
│   └── services/
│       ├── d1.ts             # D1 database helpers
│       └── kv.ts             # KV store helpers
└── wrangler.toml
```

**Key Routes:**
| Route | Auth | Purpose |
|-------|------|---------|
| GET /api/products | PK | List products |
| GET /api/tiers | PK | List subscription tiers |
| POST /api/cart/checkout | PK | Guest cart checkout |
| POST /api/data | PK+JWT | Track usage |
| GET /api/usage | PK+JWT | Get usage stats |
| POST /api/create-checkout | PK+JWT | Subscription checkout |
| POST /api/customer-portal | PK+JWT | Billing portal |
| DELETE /api/me | PK+JWT | Self-delete account |
| GET /api/dashboard | SK | Dev metrics |
| POST /api/customers | SK | Create customer |

---

### front-auth-api
**URL:** `https://front-auth-api.k-c-sheffield012376.workers.dev`

Developer authentication and project management.

```
front-auth-api/
├── src/
│   ├── index.ts              # Entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── webhook.ts            # Clerk webhook handler
│   └── lib/
│       ├── auth.ts           # JWT verification
│       ├── keys.ts           # API key generation
│       ├── keyRotation.ts    # Secret key rotation
│       ├── projects.ts       # Project CRUD logic
│       ├── projectsRoute.ts  # Project route handlers
│       └── schema.ts         # D1 schema management
└── wrangler.toml
```

**Key Routes:**
| Route | Purpose |
|-------|---------|
| POST /projects | Create new project |
| GET /projects | List dev's projects |
| POST /projects/regenerate-secret | Rotate secret key |
| DELETE /projects/:pk | Delete project |

---

### oauth-api
**URL:** `https://oauth-api.k-c-sheffield012376.workers.dev`

Stripe Connect OAuth and tier/product management.

```
oauth-api/
├── src/
│   ├── index.ts              # Entry point
│   ├── types.ts              # TypeScript interfaces
│   └── lib/
│   │   ├── auth.ts           # JWT verification
│   │   ├── keys.ts           # Key helpers
│   │   ├── schema.ts         # D1 schema
│   │   ├── stripe.ts         # Stripe API helpers
│   │   └── tiers.ts          # Tier creation logic
│   └── routes/
│       ├── oauth.ts          # Stripe Connect flow
│       ├── products.ts       # Create products endpoint
│       ├── promote.ts        # Test → Live promotion
│       └── tiers.ts          # Tier CRUD (add/update/delete)
└── wrangler.toml
```

**Key Routes:**
| Route | Purpose |
|-------|---------|
| GET /authorize | Start Stripe Connect |
| GET /callback | Stripe OAuth callback |
| POST /create-products | Create project with tiers |
| GET /tiers | List tiers |
| PUT /tiers | Update tier (handles price changes) |
| POST /tiers/add | Add tier to project |
| DELETE /tiers | Remove tier |

---

### sign-up
**URL:** `https://sign-up.k-c-sheffield012376.workers.dev`

Frictionless end-user signup using Clerk hosted pages.

```
sign-up/
├── src/
│   └── index.ts              # All routes
├── oauth.md                  # Flow documentation
└── wrangler.toml
```

**Flow:**
1. Dev's app → `/signup?pk=xxx&redirect=/dashboard`
2. Validates PK, sets cookie, redirects to Clerk
3. User signs up (email or Google)
4. Clerk → `/callback`
5. Verifies token, sets metadata, syncs D1
6. Redirects to dev's app (user logged in)

---

## SDK

### dream-sdk
**npm:** `@dream-api/sdk`

```
dream-sdk/
├── src/
│   ├── index.ts              # Main export
│   ├── client.ts             # DreamAPI class
│   ├── auth.ts               # Auth module
│   ├── clerk.ts              # Clerk integration
│   └── types.ts              # TypeScript types
├── README.md                 # Full SDK docs
└── package.json
```

**Usage:**
```typescript
// Frontend (PK only)
const api = new DreamAPI({ publishableKey: 'pk_test_xxx' });
await api.products.list();
await api.products.cartCheckout({ items: [...] });

// With auth
await api.auth.init();
await api.usage.track();

// Backend (SK)
const api = new DreamAPI({
  publishableKey: 'pk_test_xxx',
  secretKey: 'sk_test_xxx'
});
await api.customers.create({ email: '...' });
```

---

## Templates

Both templates live in **separate GitHub repos** but are developed in this monorepo under `.gitignore`.

### dream-store-basic
**GitHub:** `github.com/Fruitloop24/dream-store-basic`

E-commerce store with cart and guest checkout.

```
dream-store-basic/
├── .claude/
│   └── commands/
│       └── setup.md          # AI setup command
├── src/
│   ├── App.tsx               # Main app + BRANDING config
│   ├── main.tsx              # Entry point
│   ├── index.css             # Tailwind styles
│   ├── components/
│   │   └── Layout.tsx        # Header/nav/footer
│   ├── pages/
│   │   ├── About.tsx
│   │   └── Contact.tsx
│   └── assets/
│       └── README.md         # Asset instructions
├── CLAUDE.md                 # AI context file
├── README.md
└── .env.example
```

**Features:**
- Product grid with images
- Slide-out cart drawer
- Guest checkout (no auth needed)
- Multi-page navigation
- AI-customizable via /setup

---

### dream-saas-basic
**GitHub:** `github.com/Fruitloop24/dream-saas-basic`

SaaS app with auth, billing, and usage tracking.

```
dream-saas-basic/
├── .claude/
│   └── commands/
│       └── setup.md          # AI setup command
├── src/
│   ├── App.tsx               # Main app + router
│   ├── main.tsx              # Entry point
│   ├── hooks/
│   │   └── useDreamAPI.tsx   # SDK hook with auth
│   └── pages/
│       ├── Landing.tsx       # Public landing
│       ├── Dashboard.tsx     # Protected dashboard
│       └── ChoosePlanPage.tsx # Plan selection
├── CLAUDE.md                 # AI context file
├── README.md
└── .env.example
```

**Features:**
- Clerk auth integration
- Protected routes
- Usage tracking
- Subscription upgrades
- Customer portal

---

## Dashboard

### frontend
Dev dashboard for managing projects, tiers, and customers.

```
frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── dashboard/        # Dashboard-specific
│   │   │   ├── ApiKeysSection.tsx
│   │   │   ├── CustomerTable.tsx
│   │   │   ├── OrdersTable.tsx
│   │   │   ├── ProductsTable.tsx
│   │   │   ├── SaasDashboard.tsx
│   │   │   ├── StoreDashboard.tsx
│   │   │   └── TierCard.tsx
│   │   ├── layout/           # Layout components
│   │   │   ├── Header.tsx
│   │   │   └── ProjectSelector.tsx
│   │   └── shared/           # Reusable components
│   │       ├── CopyButton.tsx
│   │       ├── MetricCard.tsx
│   │       └── Toast.tsx
│   ├── hooks/
│   │   ├── useCredentials.ts
│   │   ├── useDashboardData.ts
│   │   ├── useProjects.ts
│   │   └── useToast.ts
│   └── pages/
│       ├── DashboardNew.tsx  # Main dashboard
│       ├── Credentials.tsx   # API keys page
│       └── LandingNew.tsx    # Landing page
└── vite.config.ts
```

---

## Documentation

```
docs/
├── AI-CONTEXT.md         # Context for AI assistants
├── CODEBASE.md           # Codebase overview
├── DATA.md               # D1/KV data structures
├── ENDPOINTS.md          # API endpoint reference
├── HYPE.md               # Marketing copy
├── LIMITATIONS.md        # Known limitations
├── REPO-STRUCTURE.md     # This file
├── review.md             # Security review notes
├── SAAS-GUIDE.md         # SaaS template guide
├── SDK-ARCHITECTURE.md   # SDK internals
├── SDK-GOTCHAS.md        # Common SDK issues
├── STORE-GUIDE.md        # Store template guide
└── TECHNICAL-OVERVIEW.md # Architecture overview
```

---

## Data Storage

### D1 Database (dream-api-ssot)
Single source of truth.

| Table | Purpose |
|-------|---------|
| platforms | Dev accounts |
| api_keys | Project credentials |
| tiers | Products/subscription tiers |
| subscriptions | User subscriptions |
| usage_counts | Monthly usage tracking |
| end_users | Users per project |
| stripe_tokens | Stripe Connect tokens |
| events | Webhook idempotency |

### KV Namespaces
Caching layer.

| Namespace | Purpose |
|-----------|---------|
| PLATFORM_TOKENS_KV | Platform/key lookups |
| CUSTOMER_TOKENS_KV | Customer data cache |

### R2 Bucket
`dream-api-assets` - Product images, uploads.

---

## Deployment

```bash
# Deploy workers
cd api-multi && npx wrangler deploy
cd front-auth-api && npx wrangler deploy
cd oauth-api && npx wrangler deploy
cd sign-up && npx wrangler deploy

# Publish SDK
cd dream-sdk && npm publish

# Templates (separate repos)
cd dream-store-basic && npm run build
# Deploy dist/ to CF Pages, Vercel, etc.
```

---

## Key Concepts

1. **PK/SK Split** - Publishable key (frontend-safe) vs Secret key (backend-only)
2. **JWT Verification** - All user ops verify Clerk JWT server-side
3. **Multi-tenant** - `publishableKey` isolates projects
4. **Test/Live Modes** - `pk_test_` vs `pk_live_` for dev/prod
5. **AI Customization** - Templates have CLAUDE.md + /setup commands
