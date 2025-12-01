# dream-api - Development Guide

**Last Updated:** 2025-11-30

---

## Current State

**What's Working:**
- front-auth-api: Usage tracking (5 free, 500 paid)
- front-auth-api: Webhooks, rate limiting
- frontend: Auth flow, basic dashboard
- api-multi: API key auth, multi-tenant KV

**What's Blocked:**
- api-multi: Using old "Fact-SaaS" Clerk app
- api-multi: Needs NEW shared Clerk app for all customers
- api-multi: JWT template design needed

**Start Services:**
```bash
cd front-auth-api && npm run dev  # Port 8788
cd frontend && npm run dev         # Port 5173
```

---

## Project Structure

### front-auth-api/ - Platform API (YOUR developers)
**Purpose:** Developers who pay YOU

**Clerk App:** dream-api (smooth-molly-95.clerk.accounts.dev)
**JWT Template:** `dream-api` with `plan` claim

**What it does:**
- Clerk JWT verification
- Usage tracking (5/month free, 500/month paid)
- Stripe checkout/webhooks ($29/mo)
- Monthly resets
- Rate limiting (100 req/min)
- Credential generation (platformId + API key)

**KV Structure:**
```
USAGE_KV (6a3c39a8ee9b46859dc237136048df25):
  usage:{userId} → { usageCount, plan, periodStart, periodEnd }
  ratelimit:{userId}:{minute} → count (TTL: 120s)
  webhook:stripe:{eventId} → timestamp (TTL: 30 days)

TOKENS_KV (d09d8bf4e63a47c495384e9ed9b4ec7e):
  user:{userId}:platformId → "plt_abc123"
  user:{userId}:apiKey → "pk_live_xyz..."
  apikey:{hash} → platformId
  platform:{platformId}:userId → userId
```

**Env Variables (.dev.vars):**
```bash
CLERK_SECRET_KEY=sk_test_...          # dream-api app
CLERK_PUBLISHABLE_KEY=pk_test_...     # dream-api app
STRIPE_SECRET_KEY=sk_test_...         # YOUR Stripe
STRIPE_PRICE_ID=price_...             # $29/mo subscription
STRIPE_WEBHOOK_SECRET=whsec_...       # From stripe listen
FRONTEND_URL=http://localhost:5173
```

**Endpoints:**
- `POST /verify-auth` - Verify JWT, track usage
- `POST /create-checkout` - Create Stripe checkout
- `POST /generate-credentials` - Generate platformId + API key
- `GET /get-credentials` - Get existing credentials
- `POST /webhook/stripe` - Stripe webhook handler
- `GET /health` - Health check

---

### api-multi/ - Multi-Tenant Customer Worker
**Purpose:** Customer end-users hit this

**Current Clerk App:** ⚠️ evident-swine-4 (OLD Fact-SaaS app)
**Current JWT Template:** ⚠️ `pan-api` (old name)
**Status:** NEEDS NEW SHARED CLERK APP

**What it does:**
- Dual auth (API key OR Clerk JWT)
- Multi-tenant usage tracking (per platformId)
- Per-platform tier config (from KV)
- Stripe integration
- Rate limiting
- Monthly resets

**KV Structure:**
```
USAGE_KV (10cc8b9f46f54a6e8d89448f978aaa1f):
  usage:{platformId}:{userId} → { count, plan, periodStart, periodEnd }
  ratelimit:{userId}:{minute} → count (TTL: 120s)

TOKENS_KV (a9f3331b0c8b48d58c32896482484208):
  platform:{platformId}:email → "dev@example.com"
  platform:{platformId}:createdAt → timestamp
  platform:{platformId}:stats → { totalUsers, revenue, totalCalls }
  user:{platformId}:tierConfig → { tiers: [...] }
  apikey:{hash} → platformId
```

**Env Variables (.dev.vars) - NEEDS UPDATE:**
```bash
CLERK_SECRET_KEY=sk_test_...          # ⚠️ OLD - NEEDS NEW SHARED APP
CLERK_PUBLISHABLE_KEY=pk_test_...     # ⚠️ OLD - NEEDS NEW SHARED APP
CLERK_JWT_TEMPLATE=pan-api            # ⚠️ OLD - NEEDS UPDATE
STRIPE_SECRET_KEY=sk_test_...         # YOUR Stripe
STRIPE_WEBHOOK_SECRET=whsec_...
```

**File Organization:**
```
src/
├── index.ts                 # Main worker, routing
├── types.ts                 # TypeScript types
├── utils.ts                 # Utilities
├── stripe-webhook.ts        # Stripe webhooks
├── middleware/
│   ├── apiKey.ts           # API key verification
│   ├── cors.ts             # CORS handling
│   ├── rateLimit.ts        # Rate limiting
│   └── security.ts         # Security headers
├── routes/
│   ├── developer.ts        # Registration, dashboard
│   ├── usage.ts            # Usage tracking
│   └── checkout.ts         # Stripe integration
├── config/
│   ├── tiers.ts            # Tier definitions
│   └── configLoader.ts     # KV config loading
└── services/
    └── kv.ts               # KV helpers
```

**Endpoints:**
- `POST /api/data` - Track usage (API key OR JWT)
- `GET /api/usage` - Check usage/limits (API key OR JWT)
- `GET /api/developer/dashboard` - Developer stats (API key)
- `POST /api/developer/register` - Developer signup (public)
- `POST /api/create-checkout` - Stripe checkout (JWT only)
- `POST /api/customer-portal` - Stripe portal (JWT only)
- `GET /api/tiers` - Get pricing tiers (public)
- `GET /health` - Health check

---

### frontend/ - Developer Dashboard
**Purpose:** Developer signup and management

**Clerk App:** dream-api (same as front-auth-api)

**Pages:**
```
src/pages/
├── LandingNew.tsx    # ✅ Active landing
├── DashboardNew.tsx  # ✅ Active dashboard
├── Landing.tsx       # ⚠️ OLD - remove?
├── Builder.tsx       # ⚠️ OLD - remove?
├── Setup.tsx         # ⚠️ OLD - remove?
├── Configure.tsx     # ⚠️ OLD - remove?
└── Styling.tsx       # ⚠️ OLD - remove?
```

**Env Variables (.env):**
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...     # dream-api app
VITE_FRONT_AUTH_API_URL=http://localhost:8788
```

**What Works:**
- Auth flow (signup → dashboard)
- Subscribe button
- Basic layout

**What's Missing:**
- Usage stats display
- Tier config UI
- Preview link generation
- CSS centering

---

### oauth-api/ - OAuth Handler
**Purpose:** Stripe OAuth for customer Stripe keys

**Status:** Not wired up yet

**Env Variables (.dev.vars):**
```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
STRIPE_CLIENT_ID=...
STRIPE_CLIENT_SECRET=...
FRONTEND_URL=...  # ⚠️ Needs update
```

---

## Usage Tracking Pattern

### Data Structures

```typescript
interface UsageData {
  usageCount: number;
  plan: 'free' | 'paid';
  lastUpdated: string;
  periodStart?: string;
  periodEnd?: string;
}

const PLATFORM_TIERS = {
  free: { name: 'Free', price: 0, limit: 5 },
  paid: { name: 'Paid', price: 29, limit: 500 }
};
```

### Core Functions

**Get current billing period:**
```typescript
function getCurrentPeriod(): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}
```

**Check if reset needed:**
```typescript
function shouldResetUsage(usageData: UsageData): boolean {
  const currentPeriod = getCurrentPeriod();

  if (!usageData.periodStart || !usageData.periodEnd) {
    return true;
  }

  return currentPeriod.start !== usageData.periodStart;
}
```

**Rate limiting:**
```typescript
const RATE_LIMIT_PER_MINUTE = 100;

async function checkRateLimit(
  userId: string,
  env: Env
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const rateLimitKey = `ratelimit:${userId}:${minute}`;

  const currentCount = await env.USAGE_KV.get(rateLimitKey);
  const count = currentCount ? parseInt(currentCount) : 0;

  if (count >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }

  await env.USAGE_KV.put(
    rateLimitKey,
    (count + 1).toString(),
    { expirationTtl: 120 }
  );

  return {
    allowed: true,
    remaining: RATE_LIMIT_PER_MINUTE - count - 1
  };
}
```

---

## Dual Authentication (api-multi)

### API Key Mode
**For developers using their own auth**

```
Authorization: Bearer pk_live_xxxxx
X-User-Id: user_123
X-User-Plan: free
```

**Verification:**
```typescript
async function verifyApiKey(apiKey: string, env: Env): Promise<string | null> {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const platformId = await env.TOKENS_KV.get(`apikey:${hash}`);
  return platformId;
}
```

### Clerk JWT Mode
**For developers using Clerk**

```
Authorization: Bearer {clerk_jwt}
```

**Extraction:**
```typescript
const auth = toAuth();
const platformId = auth.sessionClaims.publicMetadata.platformId;
const plan = auth.sessionClaims.plan;
```

---

## Webhook Integration

### Stripe Checkout Completed

```typescript
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const userId = session.metadata?.userId || session.client_reference_id;

  if (userId) {
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        plan: 'paid',
        subscribed: true,
        subscriptionId: session.subscription,
      },
    });
  }
}
```

### Idempotency

```typescript
const idempotencyKey = `webhook:stripe:${event.id}`;
const processed = await env.USAGE_KV.get(idempotencyKey);

if (processed) {
  return new Response('Already processed', { status: 200 });
}

// Process webhook...

await env.USAGE_KV.put(idempotencyKey, Date.now().toString(), {
  expirationTtl: 86400 * 30 // 30 days
});
```

---

## Testing

### Local Dev

```bash
# Terminal 1
cd front-auth-api && npm run dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
stripe listen --forward-to http://localhost:8788/webhook/stripe
```

### Test Free Tier

```javascript
const token = await window.Clerk.session.getToken();

for (let i = 0; i < 6; i++) {
  const res = await fetch('http://localhost:8788/verify-auth', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(await res.json());
}
```

### Test Upgrade

1. Click "Upgrade" in dashboard
2. Use test card: `4242 4242 4242 4242`
3. Webhook fires
4. JWT updates to `plan: 'paid'`
5. Limit increases to 500

### Check KV

```bash
wrangler kv:key get "usage:user_abc123" --binding=USAGE_KV
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

**Default Metadata:**
```json
{
  "publicMetadata": {
    "plan": "free"
  }
}
```

### Shared Customer App (api-multi)
**Status:** ⚠️ NEEDS CREATION

**TODO:**
1. Create new Clerk app
2. Design JWT template (discuss format)
3. Update api-multi/.dev.vars
4. Update api-multi/wrangler.toml
5. Test dual auth modes

---

## Deployment

```bash
# Set secrets
cd front-auth-api
wrangler secret put CLERK_SECRET_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Deploy
wrangler deploy
```

---

## Common Commands

```bash
# Local dev
cd api-multi && npm run dev
cd frontend && npm run dev

# View KV
wrangler kv:key get "platform:plt_abc123:email" --binding=TOKENS_KV
wrangler kv:key list --binding=TOKENS_KV --prefix="platform:"

# Deploy
cd api-multi && wrangler deploy
cd frontend && npm run build && wrangler pages deploy dist
```

---

## Current Issues

### Blocking
- api-multi: Using old Clerk app (evident-swine-4)
- api-multi: Needs NEW shared Clerk app
- api-multi: JWT template design needed

### Non-Blocking
- frontend: No usage stats display
- frontend: Dashboard off-center
- frontend: Old pages cleanup
- oauth-api: Not wired up

---

## Next Steps

1. **Create shared Clerk app** (IN PROGRESS)
2. **Design JWT template** for customer end-users
3. **Update api-multi env** with new keys
4. **Test dual auth** modes
5. **Add usage stats** to dashboard
6. **Clean up frontend** pages
7. **Wire oauth-api** for Stripe OAuth

---

See **STATUS.md** for detailed status and blockers.
See **README.md** for architecture overview.
See **QUICKSTART.md** for tomorrow's session plan.

---

## CRITICAL: Four KV Namespace Strategy

**Complete separation between YOUR developers and THEIR end-users.**

**Two Clerk Apps:**
1. dream-api (smooth-molly-95) - YOUR developers
2. end-user-api (composed-blowfish-76) - THEIR end-users

**Four KV Namespaces:**

front-auth-api:
- USAGE_KV: 6a3c39a8ee9b46859dc237136048df25 (YOUR devs' usage)
- TOKENS_KV: d09d8bf4e63a47c495384e9ed9b4ec7e (YOUR devs' credentials)

api-multi:
- USAGE_KV: 10cc8b9f46f54a6e8d89448f978aaa1f (THEIR users' usage)
- TOKENS_KV: a9f3331b0c8b48d58c32896482484208 (THEIR tier configs)

oauth-api bridges both:
- Reads PLATFORM_KV (d09d8bf4e63a47c495384e9ed9b4ec7e)
- Writes CUSTOMER_KV (a9f3331b0c8b48d58c32896482484208)
