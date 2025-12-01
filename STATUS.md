# Project Status - dream-api

**Last Updated:** 2025-11-30

---

## Current State - What We Actually Have

### 1. front-auth-api/ - YOUR Developer Platform
**Purpose:** Developers sign up HERE and pay YOU

**Current State:**
- ✅ Clerk app: "dream-api" (smooth-molly-95.clerk.accounts.dev)
- ✅ JWT template: "dream-api" with `plan` claim
- ✅ Stripe integration (YOUR account)
- ✅ Usage tracking (5 free, 500 paid)
- ✅ Webhook handler
- ✅ KV namespaces configured
- ✅ Local dev tested and working

**Files:**
```
src/
├── index.ts     # Main worker (usage tracking, auth, credentials)
└── webhook.ts   # Stripe webhook handler
```

**Env Variables (.dev.vars):**
```
✅ CLERK_SECRET_KEY - dream-api app
✅ CLERK_PUBLISHABLE_KEY - dream-api app
✅ STRIPE_SECRET_KEY - YOUR Stripe
✅ STRIPE_PRICE_ID - $29/mo product
⚠️ STRIPE_WEBHOOK_SECRET - needs local webhook (stripe listen)
✅ FRONTEND_URL - localhost:5173
```

**KV Namespaces:**
```
USAGE_KV:  6a3c39a8ee9b46859dc237136048df25
TOKENS_KV: d09d8bf4e63a47c495384e9ed9b4ec7e
```

**Wrangler Config:**
```
Worker name: config-api
Port: 8788
JWT Template: dream-api
```

---

### 2. api-multi/ - Customer Worker (Multi-Tenant)
**Purpose:** Where YOUR developers' end-users hit

**Current State:**
- ✅ Clerk app: "end-user-api" (composed-blowfish-76.clerk.accounts.dev)
- ⚠️ JWT template: "end-user-api" (NEEDS TO BE CREATED in Clerk dashboard)
- ✅ NEW SHARED CLERK APP CONFIGURED
- ✅ API key authentication implemented
- ✅ Multi-tenant KV structure
- ✅ Usage tracking per platform
- ✅ Dual auth (API key OR JWT)
- ✅ Rate limiting
- ✅ Developer registration endpoint

**Files:**
```
src/
├── index.ts               # Main worker
├── types.ts               # TypeScript types
├── utils.ts               # Utilities
├── stripe-webhook.ts      # Stripe webhooks
├── config/
│   ├── tiers.ts          # Tier definitions
│   └── configLoader.ts   # Load from KV
├── middleware/
│   ├── apiKey.ts         # API key verification
│   ├── cors.ts           # CORS handling
│   ├── rateLimit.ts      # Rate limiting
│   └── security.ts       # Security headers
├── routes/
│   ├── developer.ts      # Registration/dashboard
│   ├── usage.ts          # Usage tracking
│   └── checkout.ts       # Stripe integration
└── services/
    └── kv.ts             # KV helpers
```

**Env Variables (.dev.vars) - NEEDS UPDATE:**
```
⚠️ CLERK_SECRET_KEY - OLD app (evident-swine-4) → NEEDS NEW SHARED APP
⚠️ CLERK_PUBLISHABLE_KEY - OLD app → NEEDS NEW SHARED APP
⚠️ CLERK_JWT_TEMPLATE - "pan-api" (old) → NEEDS NEW TEMPLATE NAME
✅ STRIPE_SECRET_KEY - YOUR Stripe
⚠️ STRIPE_WEBHOOK_SECRET - set but may need update
```

**KV Namespaces:**
```
USAGE_KV:  10cc8b9f46f54a6e8d89448f978aaa1f
TOKENS_KV: a9f3331b0c8b48d58c32896482484208
```

**Wrangler Config:**
```
Worker name: api-multi
Port: 8787
JWT Template: end-user-api
Clerk App: composed-blowfish-76.clerk.accounts.dev
```

---

### 3. frontend/ - Developer Dashboard
**Purpose:** Where developers sign up for YOUR platform

**Current State:**
- ✅ Clerk integration (dream-api app)
- ✅ Landing page (LandingNew.tsx) - active
- ✅ Dashboard (DashboardNew.tsx) - active
- ⚠️ Old pages still present (need cleanup)
- ⚠️ No usage stats display yet
- ⚠️ Dashboard CSS off-center

**Pages:**
```
src/pages/
├── LandingNew.tsx    # ✅ NEW - Active landing
├── DashboardNew.tsx  # ✅ NEW - Active dashboard
├── Landing.tsx       # ⚠️ OLD - Remove?
├── Builder.tsx       # ⚠️ OLD - Remove?
├── Setup.tsx         # ⚠️ OLD - Remove?
├── Configure.tsx     # ⚠️ OLD - Remove?
└── Styling.tsx       # ⚠️ OLD - Remove?
```

**Env Variables (.env):**
```
✅ VITE_CLERK_PUBLISHABLE_KEY - dream-api app
✅ VITE_FRONT_AUTH_API_URL - localhost:8788
```

**What Works:**
- Auth flow (signup → dashboard)
- Subscribe button
- Basic layout

**What's Missing:**
- Usage stats display (API returns it, UI doesn't show it)
- Tier config UI
- Preview link generation
- CSS centering fix

---

### 4. oauth-api/ - OAuth Handler
**Purpose:** Stripe OAuth for customer Stripe keys

**Current State:**
- ✅ Stripe Connect OAuth setup
- ✅ GitHub OAuth setup
- ⚠️ Not wired to anything yet
- ⚠️ Frontend URL outdated

**Files:**
```
src/
└── index.ts  # OAuth flow skeleton
```

**Env Variables (.dev.vars):**
```
✅ GITHUB_CLIENT_ID
✅ GITHUB_CLIENT_SECRET
✅ STRIPE_CLIENT_ID
✅ STRIPE_CLIENT_SECRET
⚠️ FRONTEND_URL - old URL (fact-saas.pages.dev) → NEEDS UPDATE
```

**Status:** Ready to wire up, needs integration with front-auth-api

---

## Architecture Overview

### The Two Systems

**System 1: YOUR Platform (front-auth-api + frontend)**
- Developers sign up on YOUR site
- Pay YOU $29/mo
- Get platformId + API key
- Configure their tiers
- Connect their Stripe (via oauth-api)

**System 2: Customer API (api-multi)**
- Customer's end-users hit this
- Uses customer's platformId (from API key)
- Tracks usage per customer's users
- Handles Stripe billing (uses customer's Stripe OR yours for preview)
- Multi-tenant isolation via KV

### Data Flow

```
Developer Signup Flow:
1. Developer visits YOUR site (frontend)
2. Signs up with Clerk (dream-api app)
3. Gets free tier (5 calls/month)
4. Pays $29/mo via Stripe → Upgrades to 500 calls/month
5. Gets platformId + API key from front-auth-api
6. Configures tiers in dashboard
7. (Optional) Connects their Stripe via oauth-api

Customer End-User Flow:
1. Developer's end-user signs up (THEIR Clerk app OR any auth)
2. Developer's backend calls api-multi with:
   - API key (identifies platform)
   - User ID (from their auth)
   - Plan tier (from their logic)
3. api-multi tracks usage in KV: usage:{platformId}:{userId}
4. Enforces limits based on developer's tier config
5. Handles Stripe billing (preview mode = YOUR Stripe, prod mode = THEIR Stripe)
```

---

## KV Structure

### front-auth-api KV
```
USAGE_KV:
  usage:{userId} → { usageCount, plan, periodStart, periodEnd }
  ratelimit:{userId}:{minute} → count (TTL: 120s)
  webhook:stripe:{eventId} → timestamp (TTL: 30 days)

TOKENS_KV:
  user:{userId}:platformId → "plt_abc123"
  user:{userId}:apiKey → "pk_live_xyz..."
  apikey:{hash} → platformId
  platform:{platformId}:userId → userId
```

### api-multi KV
```
USAGE_KV:
  usage:{platformId}:{userId} → { count, plan, periodStart, periodEnd }
  ratelimit:{userId}:{minute} → count (TTL: 120s)

TOKENS_KV:
  platform:{platformId}:email → "dev@example.com"
  platform:{platformId}:createdAt → timestamp
  platform:{platformId}:stats → { totalUsers, revenue, totalCalls }
  user:{platformId}:tierConfig → { tiers: [...] }
  apikey:{hash} → platformId
```

---

## CRITICAL: Four KV Namespace Separation Strategy

**WHY FOUR SEPARATE NAMESPACES:**
Complete isolation between YOUR developers and THEIR end-users.

**Two Clerk Apps:**
1. **dream-api** (smooth-molly-95) - YOUR developers sign up here
2. **end-user-api** (composed-blowfish-76) - THEIR end-users sign up here

**Four KV Namespaces:**

**front-auth-api (YOUR platform):**
- USAGE_KV: `6a3c39a8ee9b46859dc237136048df25` - Track YOUR developers' API usage (5 free, 500 paid)
- TOKENS_KV: `d09d8bf4e63a47c495384e9ed9b4ec7e` - Store YOUR developers' credentials (platformId, API keys)

**api-multi (THEIR platform):**
- USAGE_KV: `10cc8b9f46f54a6e8d89448f978aaa1f` - Track THEIR end-users' usage (per platformId)
- TOKENS_KV: `a9f3331b0c8b48d58c32896482484208` - Store THEIR configs (tier config, Stripe tokens)

**The Bridge (oauth-api):**
- Reads from: front-auth-api TOKENS_KV (get platformId for logged-in dev)
- Writes to: api-multi TOKENS_KV (save tier config + Stripe tokens)

**Benefits:**
- ✅ No data mixing
- ✅ No cross-contamination
- ✅ Each worker owns its domain
- ✅ Clean separation of concerns

---

## Immediate Next Steps

### 1. Complete Developer Upgrade Flow (TOMORROW)
**Status:** IN PROGRESS

**What we have:**
- ✅ Frontend with subscribe button
- ✅ front-auth-api with Stripe checkout
- ✅ Webhook handler (updates plan to "paid")
- ✅ Free tier (5 calls) working
- ✅ Paid tier (500 calls) working

**What we need:**
- After developer pays $29/mo, redirect to Stripe OAuth
- Capture Stripe access token
- Show tier configuration UI
- Create Stripe products on THEIR account
- Save tier config to api-multi TOKENS_KV

### 2. Wire Up oauth-api (TOMORROW)
**Status:** NEEDS WORK

**Required changes:**
- Strip out GitHub and Cloudflare OAuth (Stripe only)
- Add both KV bindings (PLATFORM_KV + CUSTOMER_KV)
- Implement Stripe Connect flow
- Create Stripe products via API
- Save tier config to KV

**KV Bindings for oauth-api:**
```toml
[[kv_namespaces]]
binding = "PLATFORM_KV"  # Read developer info
id = "d09d8bf4e63a47c495384e9ed9b4ec7e"

[[kv_namespaces]]
binding = "CUSTOMER_KV"  # Write tier config
id = "a9f3331b0c8b48d58c32896482484208"
```

### 3. Update Stripe Webhook
**Status:** NEEDS WORK

After developer pays:
- Update plan to "paid" ✅ (already works)
- Redirect to Stripe OAuth flow ❌ (needs implementation)
- NOT redirect to dashboard yet

### 4. Frontend Integration
**Status:** NEEDS WORK

After Stripe OAuth:
- Show tier config UI
- Let developer set: tier names, limits, prices
- Submit to oauth-api
- Generate API key
- Display API key + docs

### 5. Test Full Flow
**Status:** NOT STARTED

**End-to-end test:**
1. Developer signs up on YOUR site
2. Gets platformId immediately
3. Pays $29/mo
4. Redirects to Stripe OAuth
5. Configures tiers
6. Gets API key
7. Makes API call to api-multi
8. api-multi loads their tier config
9. Enforces their limits
10. Creates checkout session for THEIR customer
11. Customer pays
12. Webhook updates customer's plan
13. Next API call uses new tier

---

## Testing Status

### front-auth-api
- ✅ Health endpoint working
- ✅ Auth flow tested (signup → dashboard)
- ✅ Usage tracking tested (5 free, 500 paid)
- ✅ Webhook handler tested locally
- ✅ Rate limiting tested
- ⚠️ Needs Stripe webhook forwarding (stripe listen)

### api-multi
- ⚠️ Needs new Clerk app before testing
- ✅ API key auth implemented
- ✅ Multi-tenant KV structure
- ⚠️ Not tested end-to-end yet

### frontend
- ✅ Landing page loads
- ✅ Signup flow works
- ✅ Dashboard loads
- ⚠️ Usage stats not displayed
- ⚠️ CSS issues

### oauth-api
- ❌ Not tested (not wired up yet)

---

## Pending Decisions

1. **JWT Template Design for api-multi**
   - What claims to include?
   - How to namespace by platformId?
   - Security considerations?

2. **Preview vs Production Mode**
   - When to use YOUR Stripe?
   - When to require customer Stripe?
   - How to handle transition?

3. **Frontend Cleanup**
   - Remove old pages now or later?
   - Redesign dashboard or iterate?

4. **Deployment Strategy**
   - Deploy all at once or incrementally?
   - Custom domains needed?
   - Environment variable management?

---

## Current Blockers

1. **Stripe OAuth not wired** - Need oauth-api integration
2. **No tier config UI** - Need frontend form
3. **No Stripe product creation** - Need oauth-api to call Stripe API
4. **Webhook doesn't redirect** - Need to redirect to OAuth after payment

## Nice to Have (Later)

- Dashboard usage stats display
- Dashboard CSS centering
- Remove old frontend pages
- Preview deployment feature

---

*Next Session: Get new Clerk app keys, design JWT template, update api-multi configuration*
