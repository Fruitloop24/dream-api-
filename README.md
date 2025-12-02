# dream-api

API-as-a-Service platform: Auth + Billing + Usage Tracking for indie developers.

---

## Architecture Overview

### The Two Systems

**System 1: YOUR Platform** (developers pay YOU)
- `frontend/` - Developer signup dashboard
- `front-auth-api/` - Platform API (auth, billing, credentials)
- `oauth-api/` - OAuth handler for Stripe Connect

**System 2: Customer API** (their end-users)
- `api-multi/` - Multi-tenant worker for customer end-users

---

## CRITICAL: Four KV Namespace Strategy

**Complete separation between YOUR developers and THEIR end-users.**

### Two Clerk Apps:
1. **dream-api** (smooth-molly-95) - YOUR developers sign up here
2. **end-user-api** (composed-blowfish-76) - THEIR end-users sign up here

### Four KV Namespaces:

**front-auth-api (YOUR platform):**
- `USAGE_KV: 6a3c39a8ee9b46859dc237136048df25`
  - Tracks YOUR developers' API usage (5 free, 500 paid)
  - Keys: `usage:{userId}`, `ratelimit:{userId}:{minute}`, `webhook:stripe:{eventId}`

- `TOKENS_KV: d09d8bf4e63a47c495384e9ed9b4ec7e`
  - Stores YOUR developers' credentials (platformId, API keys)
  - Keys: `user:{userId}:platformId`, `user:{userId}:apiKey`, `apikey:{hash}`, `platform:{platformId}:userId`

**api-multi (THEIR platform):**
- `USAGE_KV: 10cc8b9f46f54a6e8d89448f978aaa1f`
  - Tracks THEIR end-users' usage (per platformId)
  - Keys: `usage:{platformId}:{userId}`, `ratelimit:{userId}:{minute}`

- `TOKENS_KV: a9f3331b0c8b48d58c32896482484208`
  - Stores THEIR configs (tier config, Stripe tokens)
  - Keys: `platform:{platformId}:stripe`, `platform:{platformId}:tierConfig`, `apikey:{hash}`

**oauth-api bridges both:**
- Reads from: `front-auth-api TOKENS_KV` (get platformId for logged-in dev)
- Writes to: `api-multi TOKENS_KV` (save tier config + Stripe tokens)

---

## The Two User Flows

### Flow 1: FREE PREVIEW (before payment)

1. Developer signs up → Clerk (free plan, dream-api app)
2. Setup → Configure → Styling (collects branding + tier config)
3. Preview site generated → Shows working SaaS with auth + billing
4. Developer sees it working → Clicks "Subscribe Now"

**Data stored in localStorage only (temporary)**

### Flow 2: PAID API (after $29/mo payment)

1. Developer pays → Stripe webhook updates JWT to `plan: 'paid'`
2. Redirect to `/configure?payment=success`
3. Connect Stripe OAuth → Save access token to `api-multi TOKENS_KV`
4. Configure REAL tiers (no branding, just tier config)
5. Create Stripe products on THEIR account
6. Generate platformId + API key
7. Save everything to KV:
   - Stripe token → `api-multi TOKENS_KV`
   - platformId/API key → `front-auth-api TOKENS_KV`
   - Tier config → `api-multi TOKENS_KV`

**Now they have a production API**

---

## Project Structure

```
dream-api/
├── frontend/                    # Developer dashboard (React + Clerk)
│   ├── src/pages/
│   │   ├── LandingNew.tsx      # Landing page
│   │   ├── Setup.tsx           # Preview: branding setup
│   │   ├── PreviewConfigure.tsx # Preview: tier config
│   │   ├── PreviewStyling.tsx  # Preview: final touches
│   │   ├── PreviewReady.tsx    # Preview: show URL + subscribe
│   │   ├── Configure.tsx       # Paid: post-payment Stripe OAuth
│   │   ├── ApiTierConfig.tsx   # Paid: real tier config
│   │   └── DashboardNew.tsx    # Paid: credentials display
│
├── front-auth-api/              # Platform API (Cloudflare Worker)
│   ├── src/
│   │   ├── index.ts            # Main worker (auth, billing, credentials)
│   │   └── webhook.ts          # Stripe webhook handler
│   ├── wrangler.toml           # KV bindings: USAGE_KV, TOKENS_KV
│   └── .dev.vars               # Clerk + Stripe secrets
│
├── oauth-api/                   # Stripe OAuth handler (Cloudflare Worker)
│   ├── src/index.ts            # Stripe Connect OAuth flow
│   ├── wrangler.toml           # KV bindings: PLATFORM_KV, CUSTOMER_KV
│   └── .dev.vars               # Stripe OAuth secrets
│
└── api-multi/                   # Multi-tenant API (Cloudflare Worker)
    ├── src/
    │   ├── index.ts            # Main worker (dual auth, usage tracking)
    │   ├── middleware/         # Auth, CORS, rate limiting
    │   ├── routes/             # Developer, usage, checkout
    │   └── services/           # KV helpers
    ├── wrangler.toml           # KV bindings: USAGE_KV, TOKENS_KV
    └── .dev.vars               # Clerk + Stripe secrets
```

---

## Local Development

```bash
# Terminal 1: Platform API
cd front-auth-api && npm run dev  # Port 8788

# Terminal 2: Frontend
cd frontend && npm run dev         # Port 5173

# Terminal 3: OAuth API (when needed)
cd oauth-api && npm run dev        # Port 8789

# Terminal 4: Stripe webhooks (when testing payments)
stripe listen --forward-to http://localhost:8788/webhook/stripe
```

---

## Current State

### ✅ What's Working:
- Free preview flow (setup → configure → styling → preview ready)
- Payment flow (subscribe → Stripe checkout → webhook)
- Stripe OAuth button (redirects to oauth-api)
- Tier config page for real API

### ⚠️ What's Next:
1. Setup oauth-api secrets (Stripe OAuth credentials)
2. Generate preview worker/site
3. Create Stripe products after tier config
4. Generate platformId + API key
5. Save to both KV namespaces
6. Test full production flow

---

## Environment Variables

### front-auth-api/.dev.vars
```bash
CLERK_SECRET_KEY=sk_test_...          # dream-api Clerk app
CLERK_PUBLISHABLE_KEY=pk_test_...     # dream-api Clerk app
STRIPE_SECRET_KEY=sk_test_...         # YOUR Stripe account
STRIPE_PRICE_ID=price_...             # $29/mo subscription
STRIPE_WEBHOOK_SECRET=whsec_...       # From stripe listen
FRONTEND_URL=http://localhost:5173
```

### oauth-api/.dev.vars
```bash
STRIPE_CLIENT_ID=...                  # Stripe Connect OAuth app
STRIPE_CLIENT_SECRET=...              # Stripe Connect OAuth app
FRONTEND_URL=http://localhost:5173
```

### frontend/.env
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...      # dream-api Clerk app
VITE_FRONT_AUTH_API_URL=http://localhost:8788
VITE_OAUTH_API_URL=http://localhost:8789
```

---

## Deployment

```bash
# Set secrets
cd front-auth-api
wrangler secret put CLERK_SECRET_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

cd ../oauth-api
wrangler secret put STRIPE_CLIENT_ID
wrangler secret put STRIPE_CLIENT_SECRET

# Deploy
cd front-auth-api && wrangler deploy
cd oauth-api && wrangler deploy
cd api-multi && wrangler deploy
cd frontend && npm run build && wrangler pages deploy dist
```

---

See **CLAUDE.md** for development guide and current session context.
