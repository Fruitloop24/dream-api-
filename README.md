# dream-api

API-as-a-Service platform: Auth + Billing + Usage Tracking for indie developers.

---

## Quick Start

### Start Local Development

**Terminal 1: front-auth-api**
```bash
cd front-auth-api && npm run dev  # Port 8788
```

**Terminal 2: frontend**
```bash
cd frontend && npm run dev  # Port 5173
```

**Terminal 3: Stripe webhooks (optional)**
```bash
stripe listen --forward-to http://localhost:8788/webhook/stripe
# Copy webhook secret to front-auth-api/.dev.vars
```

Open: **http://localhost:5173**

---

## Architecture

### The Two Systems

**System 1: YOUR Platform (developers pay YOU)**
- **frontend/** - Developer signup dashboard
- **front-auth-api/** - Platform API (auth, billing, credentials)
- **oauth-api/** - OAuth handler for Stripe Connect

**System 2: Customer API (their end-users)**
- **api-multi/** - Multi-tenant worker for customer end-users

---

## Directory Breakdown

### 1. front-auth-api/ - Platform API
**Purpose:** Developers who pay YOU

**What it does:**
- Clerk JWT verification (dream-api app)
- Usage tracking (5 free, 500 paid per month)
- Stripe checkout/webhooks ($29/mo)
- Monthly billing resets
- Rate limiting (100 req/min)
- Credential generation (platformId + API key)

**Status:** ✅ Working, tested locally

**Env Variables:**
```bash
CLERK_SECRET_KEY=sk_test_...          # dream-api Clerk app
CLERK_PUBLISHABLE_KEY=pk_test_...     # dream-api Clerk app
STRIPE_SECRET_KEY=sk_test_...         # YOUR Stripe account
STRIPE_PRICE_ID=price_...             # $29/mo subscription
STRIPE_WEBHOOK_SECRET=whsec_...       # From stripe listen
FRONTEND_URL=http://localhost:5173
```

**KV Namespaces:**
```
USAGE_KV:  6a3c39a8ee9b46859dc237136048df25
  usage:{userId} → { usageCount, plan, periodStart, periodEnd }
  ratelimit:{userId}:{minute} → count (TTL: 120s)
  webhook:stripe:{eventId} → timestamp (TTL: 30 days)

TOKENS_KV: d09d8bf4e63a47c495384e9ed9b4ec7e
  user:{userId}:platformId → "plt_abc123"
  user:{userId}:apiKey → "pk_live_xyz..."
  apikey:{hash} → platformId
  platform:{platformId}:userId → userId
```

**Endpoints:**
- `POST /verify-auth` - Verify JWT, track usage
- `POST /create-checkout` - Create Stripe checkout
- `POST /generate-credentials` - Generate platformId + API key
- `GET /get-credentials` - Get existing credentials
- `POST /webhook/stripe` - Stripe webhook handler
- `GET /health` - Health check

---

### 2. api-multi/ - Multi-Tenant Customer Worker
**Purpose:** Customer end-users hit this API

**What it does:**
- Dual auth (API key OR Clerk JWT)
- Multi-tenant usage tracking (per platformId)
- Per-platform tier configuration (from KV)
- Stripe integration (customer's OR your keys)
- Rate limiting
- Monthly billing resets

**Status:** ⚠️ Needs new shared Clerk app

**Current Issues:**
- Using old "Fact-SaaS" Clerk app (evident-swine-4)
- Needs new shared Clerk app for all customers
- JWT template needs design

**Env Variables (NEEDS UPDATE):**
```bash
CLERK_SECRET_KEY=sk_test_...          # ⚠️ OLD APP - NEEDS NEW SHARED APP
CLERK_PUBLISHABLE_KEY=pk_test_...     # ⚠️ OLD APP - NEEDS NEW SHARED APP
CLERK_JWT_TEMPLATE=pan-api            # ⚠️ OLD NAME - NEEDS UPDATE
STRIPE_SECRET_KEY=sk_test_...         # YOUR Stripe account
STRIPE_WEBHOOK_SECRET=whsec_...
```

**KV Namespaces:**
```
USAGE_KV:  10cc8b9f46f54a6e8d89448f978aaa1f
  usage:{platformId}:{userId} → { count, plan, periodStart, periodEnd }
  ratelimit:{userId}:{minute} → count (TTL: 120s)

TOKENS_KV: a9f3331b0c8b48d58c32896482484208
  platform:{platformId}:email → "dev@example.com"
  platform:{platformId}:createdAt → timestamp
  platform:{platformId}:stats → { totalUsers, revenue, totalCalls }
  user:{platformId}:tierConfig → { tiers: [...] }
  apikey:{hash} → platformId
```

**Endpoints:**
- `POST /api/data` - Track usage (API key OR JWT)
- `GET /api/usage` - Check usage/limits (API key OR JWT)
- `GET /api/developer/dashboard` - Developer stats (API key)
- `POST /api/developer/register` - Developer signup (public)
- `POST /api/create-checkout` - Stripe checkout (JWT only)
- `POST /api/customer-portal` - Stripe portal (JWT only)
- `GET /api/tiers` - Get pricing tiers (public)
- `GET /health` - Health check (public)

**File Structure:**
```
src/
├── index.ts               # Main worker
├── types.ts               # TypeScript types
├── utils.ts               # Utilities
├── stripe-webhook.ts      # Stripe webhooks
├── middleware/
│   ├── apiKey.ts         # API key verification
│   ├── cors.ts           # CORS handling
│   ├── rateLimit.ts      # Rate limiting
│   └── security.ts       # Security headers
├── routes/
│   ├── developer.ts      # Registration/dashboard
│   ├── usage.ts          # Usage tracking
│   └── checkout.ts       # Stripe integration
├── config/
│   ├── tiers.ts          # Tier definitions
│   └── configLoader.ts   # Load from KV
└── services/
    └── kv.ts             # KV helpers
```

---

### 3. frontend/ - Developer Dashboard
**Purpose:** Where developers sign up for YOUR platform

**Status:** ✅ Auth working, ⚠️ UI needs updates

**What Works:**
- Signup flow (Clerk)
- Dashboard loads
- Subscribe button
- Basic layout

**What's Missing:**
- Usage stats display (API returns it, UI doesn't show)
- Tier config UI
- Preview link generation
- CSS centering fix
- Old pages need cleanup

**Env Variables:**
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...     # dream-api Clerk app
VITE_FRONT_AUTH_API_URL=http://localhost:8788
```

**Pages:**
```
src/pages/
├── LandingNew.tsx    # ✅ Active landing page
├── DashboardNew.tsx  # ✅ Active dashboard
├── Landing.tsx       # ⚠️ OLD - remove?
├── Builder.tsx       # ⚠️ OLD - remove?
├── Setup.tsx         # ⚠️ OLD - remove?
├── Configure.tsx     # ⚠️ OLD - remove?
└── Styling.tsx       # ⚠️ OLD - remove?
```

---

### 4. oauth-api/ - OAuth Handler
**Purpose:** Stripe OAuth for customer Stripe keys

**Status:** ⚠️ Not wired up yet

**What it has:**
- Stripe Connect OAuth setup
- GitHub OAuth setup
- OAuth flow skeleton

**Env Variables:**
```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
STRIPE_CLIENT_ID=...
STRIPE_CLIENT_SECRET=...
FRONTEND_URL=...  # ⚠️ Needs update
```

---

## Dual Authentication (api-multi)

### Mode 1: API Key
**For developers using their own auth system**

```
Authorization: Bearer pk_live_xxxxx
X-User-Id: user_123
X-User-Plan: free
```

Verification:
1. Hash API key (SHA-256)
2. Lookup in KV: `apikey:{hash}` → platformId
3. Load tier config: `user:{platformId}:tierConfig`
4. Track usage: `usage:{platformId}:{userId}`

### Mode 2: Clerk JWT
**For developers using Clerk**

```
Authorization: Bearer {clerk_jwt}
```

Extraction:
1. Verify JWT with Clerk
2. Extract platformId from `publicMetadata.platformId`
3. Extract plan from JWT claims
4. Track usage: `usage:{platformId}:{userId}`

---

## Usage Tracking Flow

### Free Tier Developer (5 calls/month)
1. Sign up → Clerk sets `plan: 'free'` in JWT
2. Make API call → Counter increments
3. After 5 calls → Returns 403
4. Monthly reset (1st of month) → Counter resets to 0

### Paid Tier Developer ($29/mo, 500 calls/month)
1. Sign up → Free tier (5 calls)
2. Click "Upgrade" → Stripe checkout
3. Pay → Webhook fires
4. Webhook updates JWT: `plan: 'paid'`
5. Now has 500 calls/month
6. Monthly reset applies

### API Response Format

**Success:**
```json
{
  "success": true,
  "userId": "user_abc123",
  "usage": {
    "count": 3,
    "limit": 5,
    "plan": "free",
    "periodStart": "2025-11-01",
    "periodEnd": "2025-11-30",
    "remaining": 2
  }
}
```

**Limit Exceeded:**
```json
{
  "error": "Tier limit reached",
  "count": 5,
  "limit": 5,
  "plan": "free",
  "message": "Please upgrade to unlock more requests"
}
```

---

## Testing Locally

### Test Free Tier (5 calls)
```javascript
// Browser console at localhost:5173
const token = await window.Clerk.session.getToken();

for (let i = 0; i < 6; i++) {
  const res = await fetch('http://localhost:8788/verify-auth', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(`Call ${i+1}:`, data.usage || data.error);
}
```

### Test Paid Tier Upgrade
1. Click "Upgrade" in dashboard
2. Use test card: `4242 4242 4242 4242`
3. Webhook fires → JWT updates to `plan: 'paid'`
4. Make API calls → Now has 500/month limit

### Check KV Storage
```bash
# View usage data
wrangler kv:key get "usage:user_abc123" --binding=USAGE_KV

# List all usage keys
wrangler kv:key list --binding=USAGE_KV --prefix="usage:"
```

---

## Clerk Setup

### dream-api App (front-auth-api)
**Status:** ✅ Configured

**JWT Template:** `dream-api`
```json
{
  "plan": "{{user.public_metadata.plan}}"
}
```

**Default Metadata on Signup:**
```json
{
  "publicMetadata": {
    "plan": "free"
  }
}
```

### Shared Customer App (api-multi)
**Status:** ⚠️ NEEDS CREATION

**Need:**
- New Clerk app for ALL customer end-users
- Shared across all developers
- Namespaced by platformId

**TODO:**
1. Create new Clerk app
2. Design JWT template (TBD)
3. Update api-multi env variables
4. Test dual auth modes

---

## Deployment

### Set Secrets
```bash
cd front-auth-api
wrangler secret put CLERK_SECRET_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

### Deploy
```bash
cd front-auth-api && wrangler deploy
cd api-multi && wrangler deploy
cd frontend && npm run build && wrangler pages deploy dist
```

---

## Current Status

### ✅ Working
- front-auth-api: Usage tracking, webhooks, rate limiting
- frontend: Auth flow, landing page, basic dashboard
- api-multi: API key auth, multi-tenant KV structure
- KV: 4 namespaces configured and isolated

### ⚠️ Needs Work
- api-multi: Needs new shared Clerk app
- api-multi: JWT template design needed
- frontend: No usage stats display
- frontend: Dashboard off-center
- frontend: Old pages cleanup
- oauth-api: Not wired up yet

### ❌ Not Started
- Tier config UI
- Preview link generation
- Production deployment
- Custom domains

---

## Next Steps

1. **Create shared Clerk app** for api-multi (IN PROGRESS)
2. **Design JWT template** for customer end-users
3. **Update api-multi** env variables with new keys
4. **Test dual auth** (API key + JWT modes)
5. **Add usage stats** to frontend dashboard
6. **Clean up frontend** (remove old pages)
7. **Wire oauth-api** for Stripe OAuth

---

See **STATUS.md** for detailed current state and blockers.
See **CLAUDE.md** for development guide with code patterns.
See **QUICKSTART.md** for tomorrow's session plan.

---

*Last Updated: 2025-11-30*
*Status: Clerk apps configured, ready for upgrade flow integration*
