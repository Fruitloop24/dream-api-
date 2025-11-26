# dream-api - Claude Development Guide

## Project Overview

**dream-api** is an API-as-a-Service platform that provides auth, billing, and usage tracking in 5 lines of code.

**The Goal:** Let indie developers add Clerk auth + Stripe billing + usage limits to their apps without building infrastructure.

**Success Metric:** 100 paying developers @ $29-99/mo = $2,900-9,900/mo MRR

**The Pitch:**
> "Don't trust me - trust Clerk, Stripe, and Cloudflare. I'm just the glue."

---

## Origin Story

This project evolved through 4 iterations:

1. **Open-source SaaS template** - Built a boilerplate with auth + billing
2. **Auto-deploy tool** - Made it easy for devs to deploy their own instances
3. **Preview system** - Multi-tenant with KV (show previews using our keys)
4. **API product** - Realized: "Why deploy? Just sell API access!"

**Current state:** We have multi-tenant infrastructure from iteration #3, now pivoting to pure API product.

---

## Current Status

### ✅ What Works (Copied from previous iteration)

These files work but need **adaptation** for API-first model:

**api-multi/**: Multi-tenant API worker
- ✅ Clerk JWT authentication (one Clerk app for all)
- ✅ Multi-tenant via `X-Platform-User-Id` header
- ✅ Config loading from KV per platform (`user:{platformId}:tierConfig`)
- ✅ Usage tracking with tier limits (`usage:{userId}`)
- ✅ Stripe checkout/webhooks/portal
- ✅ Rate limiting (100 req/min per user)
- ✅ CORS handling
- ✅ Monthly billing period resets

**frontend/**: React app (currently builder UI)
- ✅ Component structure
- ✅ Routing
- ⚠️ Shows old "builder" UI (needs to become signup/dashboard)

**front-auth-api/**: Clerk JWT verification for frontend
- ✅ Works as-is (validates dashboard logins)

**oauth-api/**: OAuth flow handler
- ✅ GitHub/Stripe/Cloudflare OAuth flows
- ⚠️ Built for auto-deploy (evaluate if needed for API product)

### 🔨 What Needs Work

**Critical (API-first pivot):**
1. **API Key Authentication**
   - Current: Only accepts Clerk JWT
   - Need: Accept API keys too (dual mode)
   - Why: Devs shouldn't need Clerk in their app, just an API key

2. **Developer Registration**
   - Need: `POST /api/developer/register`
   - Generates: platformId + API key
   - Stores: `platform:{id}:apiKey` (hashed)

3. **Product Creation Helper**
   - Need: `POST /api/developer/create-products`
   - Creates Stripe products/prices
   - Stores: `platform:{id}:config` with stripePriceIds

4. **Developer Dashboard**
   - Show: API key, usage stats, revenue
   - Current frontend is builder UI (needs rebuild)

5. **Code Comments Cleanup**
   - Remove references to "PLUG SAAS" / "FACT-SaaS"
   - Add TODO markers for what needs fixing
   - Update architecture docs

### ❌ Not Built Yet

- API key generation/rotation
- Developer analytics aggregation
- Stripe product creation endpoint
- npm package wrapper (@dream-api/client)
- API documentation site

---

## Directory Structure

```
dream-api/
├── api-multi/              # Main multi-tenant API worker
│   ├── src/
│   │   ├── index.ts               # Main entry point
│   │   │                          # TODO: Add API key auth mode
│   │   │                          # TODO: Add developer endpoints
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── utils.ts               # Helper functions
│   │   ├── config/
│   │   │   ├── tiers.ts           # Tier definitions
│   │   │   ├── config.ts          # Static config fallback
│   │   │   └── configLoader.ts    # Load tier config from KV
│   │   │                          # WORKS: Multi-tenant KV loading
│   │   ├── middleware/
│   │   │   ├── cors.ts            # CORS handling (WORKS)
│   │   │   ├── rateLimit.ts       # Rate limiting (WORKS)
│   │   │   └── security.ts        # Security headers (WORKS)
│   │   │   # TODO: Add apiKey.ts for API key verification
│   │   ├── routes/
│   │   │   ├── usage.ts           # Usage tracking (WORKS)
│   │   │   └── checkout.ts        # Stripe checkout/portal (WORKS)
│   │   │   # TODO: Add developer.ts for registration/stats
│   │   ├── services/
│   │   │   └── kv.ts              # KV helpers (WORKS)
│   │   └── stripe-webhook.ts      # Stripe webhook handler (WORKS)
│   └── package.json
│
├── frontend/              # Developer dashboard (React + Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx        # TODO: Rebuild as API landing
│   │   │   ├── Builder.tsx        # TODO: Remove (not needed)
│   │   │   ├── Setup.tsx          # TODO: Become signup flow
│   │   │   └── Configure.tsx      # TODO: Become dashboard
│   │   └── components/            # Shared UI components
│   └── package.json
│
├── front-auth-api/        # Frontend authentication API
│   ├── src/
│   │   └── index.ts               # Clerk JWT verification (WORKS)
│   └── package.json
│
├── oauth-api/             # OAuth handler
│   ├── src/
│   │   └── index.ts               # GitHub/Stripe/CF OAuth flows
│   │                              # TODO: Evaluate if needed
│   └── package.json
│
├── CLAUDE.md              # This file (development guide)
└── README.md              # User-facing documentation
```

---

## Architecture

### The Current Flow (What Works)

```
Developer's App
  ↓
  Authorization: Bearer {clerk_jwt}
  X-Platform-User-Id: plt_abc123
  ↓
api-multi (Cloudflare Worker)
  ↓
1. Verify Clerk JWT → userId
2. Get platformId from header (or userId if not multi-tenant)
3. Load config from KV: user:{platformId}:tierConfig
4. Check usage: usage:{userId}
5. Enforce tier limits
6. Increment counter
7. Return response
  ↓
KV Storage (edge-replicated)
  - platform:plt_abc123:apiKey (hashed)
  - user:plt_abc123:tierConfig (tiers, limits, Stripe price IDs)
  - usage:user_xyz (count, plan, billing period)
```

### The Target Flow (API-First)

```
Developer's App
  ↓
  Authorization: Bearer pk_live_abc123 (API KEY, not JWT)
  ↓
api-multi
  ↓
1. Verify API key → platformId (KV lookup, hashed comparison)
2. Load config: user:{platformId}:tierConfig
3. Check usage: usage:{platformId}:user_xyz
4. Enforce limits
5. Track usage
6. Return response
```

**Key Difference:** API key auth instead of requiring Clerk in customer's app.

---

## Multi-Tenancy Strategy

### How Isolation Works

Each developer gets a `platformId` (e.g., `plt_abc123`). All their data is namespaced:

```
KV Structure:
platform:plt_abc123:apiKey         → "pk_live_xyz..." (hashed)
platform:plt_abc123:stripeSecret   → "sk_..." (encrypted, for their Stripe)
user:plt_abc123:tierConfig         → { tiers: [...], stripePriceIds: {...} }
usage:plt_abc123:user_xyz          → { count: 47, plan: "pro", periodStart: "2025-11-01" }

platform:plt_def456:apiKey         → Different developer, totally isolated
user:plt_def456:tierConfig         → Their config
usage:plt_def456:user_abc          → Their users
```

**Why this works:**
- KV keys are globally unique (platformId in every key)
- No cross-contamination possible
- Fast lookups (indexed by platformId)
- Edge-replicated (global reads <10ms)

### Clerk Strategy (One App for All)

**We're using ONE Clerk app** to handle all developers + all their end-users.

**How we distinguish:**
- Developers: `publicMetadata.role = "developer"`
- End-users: `publicMetadata.role = "end_user"`
- Namespace: `publicMetadata.platformId = "plt_abc123"`

**Example:**
```typescript
// Developer signs up
clerk.users.createUser({
  emailAddress: "dev@example.com",
  publicMetadata: {
    role: "developer",
    platformId: "plt_abc123"
  }
});

// Their end-user signs up (in THEIR app, via our API)
clerk.users.createUser({
  emailAddress: "enduser@example.com",
  publicMetadata: {
    role: "end_user",
    platformId: "plt_abc123",
    tier: "free"
  }
});

// Query developer's users
clerk.users.getUserList({
  query: 'publicMetadata.platformId:plt_abc123 AND publicMetadata.role:end_user'
});
```

**Why one app:**
- ✅ FREE up to 10k MAU
- ✅ Simple to implement
- ✅ Easy queries by platformId
- ✅ Scales to thousands of developers

**Why NOT Clerk Organizations:**
- ⚠️ Requires Pro plan ($25/mo)
- ⚠️ More complex API
- ⚠️ Only needed if devs want Clerk dashboard access (they won't)

---

## Key Implementation Issues

### Issue 1: API Key Authentication Not Implemented

**Current problem (api-multi/src/index.ts:131-139):**
```typescript
// Only accepts Clerk JWT
const authHeader = request.headers.get('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Missing authentication' }), {
    status: 401
  });
}
```

**Solution: Add API key verification**

Create `api-multi/src/middleware/apiKey.ts`:
```typescript
import { Env } from '../types';
import * as crypto from 'crypto';

/**
 * Verify API key and return platformId
 *
 * SECURITY:
 * - API keys stored hashed in KV (bcrypt or SHA-256)
 * - Constant-time comparison to prevent timing attacks
 * - Rate limited per key (prevent brute force)
 *
 * @param apiKey - Raw API key from Authorization header
 * @param env - Worker environment (for KV access)
 * @returns platformId if valid, null if invalid
 */
export async function verifyApiKey(
  apiKey: string,
  env: Env
): Promise<string | null> {
  // Hash the provided API key
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Search KV for matching hash
  // TODO: Optimize this - store reverse mapping (hash → platformId)
  const keys = await env.TOKENS_KV.list({ prefix: 'platform:' });

  for (const key of keys.keys) {
    if (key.name.endsWith(':apiKey')) {
      const storedHash = await env.TOKENS_KV.get(key.name);

      // Constant-time comparison (prevent timing attacks)
      if (storedHash && crypto.timingSafeEqual(
        Buffer.from(storedHash),
        Buffer.from(hashedKey)
      )) {
        // Extract platformId from "platform:plt_abc123:apiKey"
        const parts = key.name.split(':');
        return parts[1]; // Returns "plt_abc123"
      }
    }
  }

  return null; // Invalid API key
}
```

**Update index.ts to support dual auth:**
```typescript
// STEP 4: AUTHENTICATION (Dual Mode: API Key OR Clerk JWT)

const authHeader = request.headers.get('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Missing authentication' }), {
    status: 401
  });
}

const token = authHeader.replace('Bearer ', '');

// Try API key auth first (starts with 'pk_')
if (token.startsWith('pk_')) {
  const platformId = await verifyApiKey(token, env);
  if (!platformId) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401
    });
  }

  // TODO: Handle API key requests (no userId, just platformId)
  // For now, require end-user identification another way
}

// Fall back to Clerk JWT auth
const clerkClient = createClerkClient({ ... });
// ... existing JWT verification code
```

---

### Issue 2: platformUserId Security (Header Spoofing)

**Current problem (api-multi/src/index.ts:164):**
```typescript
// DANGEROUS: Anyone can set this header
const platformUserId = request.headers.get('X-Platform-User-Id') || userId;
```

**Attack scenario:**
```bash
# Attacker gets valid Clerk JWT for platform A
# But wants to use platform B's config (cheaper limits)

curl -X POST https://api.dream-api.com/api/data \
  -H "Authorization: Bearer {valid_clerk_jwt}" \
  -H "X-Platform-User-Id: plt_other_platform"  # SPOOFED!
```

**Solution: Derive platformId from verified source**

**Option A: From API key (RECOMMENDED for API-first):**
```typescript
// API key auth flow
const platformId = await verifyApiKey(apiKey, env); // Trusted
```

**Option B: From Clerk JWT metadata (for Clerk-based customers):**
```typescript
// JWT auth flow
const auth = toAuth();
const platformId = auth.sessionClaims.publicMetadata.platformId; // Trusted
```

**Remove the header entirely:**
```typescript
// DELETE THIS LINE:
// const platformUserId = request.headers.get('X-Platform-User-Id') || userId;

// USE VERIFIED SOURCE:
const platformId = /* from API key OR JWT metadata */;
```

---

### Issue 3: No Developer Registration

**Missing:** Endpoint for developers to sign up and get API keys

**Solution: Add registration endpoint**

Create `api-multi/src/routes/developer.ts`:
```typescript
import { Env } from '../types';
import { generateId, generateSecureToken } from '../utils';
import * as crypto from 'crypto';

/**
 * TODO: Developer Registration Endpoint
 *
 * POST /api/developer/register
 * Body: { email: string, name?: string }
 *
 * FLOW:
 * 1. Generate platformId (plt_xxxxx)
 * 2. Generate API key (pk_live_xxxxx)
 * 3. Hash API key (SHA-256)
 * 4. Store in KV:
 *    - platform:{id}:apiKey → hashed key
 *    - platform:{id}:email → email
 *    - platform:{id}:createdAt → timestamp
 * 5. Create default tier config
 * 6. Return platformId + API key (show ONCE, never again)
 *
 * SECURITY:
 * - Rate limit registration (prevent spam)
 * - Email verification (TODO: send confirmation email)
 * - API key shown only once (can't retrieve, only regenerate)
 */
export async function handleDeveloperRegister(
  email: string,
  name: string | undefined,
  env: Env
): Promise<Response> {
  // Generate IDs
  const platformId = `plt_${generateId(12)}`; // 12-char random ID
  const apiKey = `pk_live_${generateSecureToken(32)}`; // 32-byte secure random

  // Hash API key before storing
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Store in KV
  await env.TOKENS_KV.put(`platform:${platformId}:apiKey`, hashedKey);
  await env.TOKENS_KV.put(`platform:${platformId}:email`, email);
  await env.TOKENS_KV.put(`platform:${platformId}:name`, name || '');
  await env.TOKENS_KV.put(`platform:${platformId}:createdAt`, new Date().toISOString());

  // Create default tier config (free tier only)
  await env.TOKENS_KV.put(`user:${platformId}:tierConfig`, JSON.stringify({
    tiers: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        limit: 100,
        features: ['Basic access'],
        popular: false,
        stripePriceId: null
      }
    ]
  }));

  // Initialize stats
  await env.TOKENS_KV.put(`platform:${platformId}:stats`, JSON.stringify({
    totalCalls: 0,
    uniqueUsers: 0,
    lastUpdated: new Date().toISOString()
  }));

  return new Response(JSON.stringify({
    success: true,
    platformId,
    apiKey, // ONLY TIME THIS IS SHOWN
    message: 'Developer registered successfully. Save your API key - it will not be shown again.'
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Add to index.ts:**
```typescript
// Public endpoint (no auth required for registration)
if (url.pathname === '/api/developer/register' && request.method === 'POST') {
  const { email, name } = await request.json();

  // TODO: Add rate limiting (max 5 registrations per IP per hour)
  // TODO: Add email validation
  // TODO: Send confirmation email

  return await handleDeveloperRegister(email, name, env);
}
```

---

### Issue 4: Product Creation Helper

**Missing:** Easy way for developers to create Stripe products

**Solution: Stripe API wrapper**

Add to `api-multi/src/routes/developer.ts`:
```typescript
/**
 * TODO: Create Stripe Products Endpoint
 *
 * POST /api/developer/create-products
 * Authorization: Bearer pk_live_xxxxx (API key)
 * Body: {
 *   tiers: [
 *     { name: "Free", price: 0, limit: 100 },
 *     { name: "Pro", price: 29, limit: 1000 }
 *   ]
 * }
 *
 * FLOW:
 * 1. Verify API key → platformId
 * 2. For each paid tier:
 *    - Create Stripe product
 *    - Create Stripe price (recurring monthly)
 *    - Store price ID
 * 3. Update tier config in KV
 * 4. Return updated config with price IDs
 *
 * STRIPE SETUP:
 * - Uses YOUR Stripe account (env.STRIPE_SECRET_KEY)
 * - Creates products on behalf of developer
 * - Developer pays YOU, you handle their billing
 * - Alternative: Stripe Connect (let them use their own Stripe)
 */
export async function handleCreateProducts(
  platformId: string,
  tiers: Array<{ name: string; price: number; limit: number }>,
  env: Env
): Promise<Response> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const updatedTiers = [];

  for (const tier of tiers) {
    let stripePriceId = null;

    // Only create Stripe product for paid tiers
    if (tier.price > 0) {
      // Create product
      const product = await stripe.products.create({
        name: `${platformId} - ${tier.name}`,
        description: `${tier.name} tier for platform ${platformId}`
      });

      // Create recurring price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price * 100, // Convert to cents
        currency: 'usd',
        recurring: { interval: 'month' }
      });

      stripePriceId = price.id;
    }

    updatedTiers.push({
      id: tier.name.toLowerCase(),
      name: tier.name,
      price: tier.price,
      limit: tier.limit,
      stripePriceId,
      features: [], // TODO: Let developer customize
      popular: false
    });
  }

  // Update tier config in KV
  await env.TOKENS_KV.put(`user:${platformId}:tierConfig`, JSON.stringify({
    tiers: updatedTiers
  }));

  return new Response(JSON.stringify({
    success: true,
    tiers: updatedTiers
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## Environment Variables

### api-multi (Main Worker)

```bash
# Clerk (YOUR app - one for all developers + their users)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_TEMPLATE=dream-api

# Stripe (YOUR account - you're the merchant of record)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS (your frontend domains)
ALLOWED_ORIGINS=https://dream-api.com,https://dashboard.dream-api.com

# KV Bindings (wrangler.toml)
USAGE_KV      # Usage tracking + rate limiting
TOKENS_KV     # Platform configs + API keys
```

### frontend

```bash
# Clerk (same app, for dashboard login)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# API endpoint
VITE_API_URL=https://api.dream-api.com
```

### front-auth-api

```bash
# Clerk (same app)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## Next Steps (Priority Order)

### Phase 1: Core API (Week 1-2)

1. ✅ **Update docs** (README.md, CLAUDE.md) - DONE
2. **Add API key authentication**
   - Create `middleware/apiKey.ts`
   - Update `index.ts` for dual auth
   - Test API key verification
3. **Fix platformId security**
   - Remove `X-Platform-User-Id` header
   - Derive from API key or JWT metadata
4. **Add developer registration**
   - Create `routes/developer.ts`
   - Add `/api/developer/register` endpoint
   - Test registration flow
5. **Add product creation**
   - Add `/api/developer/create-products` endpoint
   - Integrate Stripe API
   - Test product creation

### Phase 2: Dashboard (Week 3)

1. **Rebuild frontend**
   - Landing page (API pitch)
   - Signup flow (developer registration)
   - Dashboard (show API key, stats)
2. **Dashboard API endpoints**
   - GET `/api/developer/dashboard` (stats)
   - POST `/api/developer/regenerate-key` (rotate key)
3. **Stats aggregation**
   - Update stats on each API call
   - Update stats on Stripe webhooks
   - Show in dashboard

### Phase 3: Polish (Week 4)

1. **npm package**
   - Create `@dream-api/client`
   - Publish to npm
2. **Documentation**
   - API reference
   - Quickstart guide
   - Integration examples
3. **Testing**
   - End-to-end tests
   - Load testing
   - Security audit

---

## Code Cleanup TODO List

**Files that need comment updates:**

- [ ] `api-multi/src/index.ts` - Remove "PLUG SAAS" header
- [ ] `api-multi/src/routes/usage.ts` - Add TODO for API key mode
- [ ] `api-multi/src/routes/checkout.ts` - Add TODO for platform-based Stripe
- [ ] `api-multi/src/config/configLoader.ts` - Update multi-tenant comments
- [ ] `oauth-api/src/index.ts` - Evaluate if needed, mark as optional

**New files needed:**

- [ ] `api-multi/src/middleware/apiKey.ts` - API key verification
- [ ] `api-multi/src/routes/developer.ts` - Registration + product creation
- [ ] `frontend/src/pages/Signup.tsx` - Developer signup
- [ ] `frontend/src/pages/Dashboard.tsx` - Developer dashboard

---

## Common Commands

```bash
# Local development
cd api-multi && npm run dev
cd frontend && npm run dev

# View KV data
wrangler kv:key get "platform:plt_abc123:apiKey" --binding=TOKENS_KV
wrangler kv:key list --binding=TOKENS_KV --prefix="platform:"

# Deploy
cd api-multi && wrangler deploy
cd frontend && npm run build && wrangler pages deploy dist

# Test API
curl http://localhost:8787/api/developer/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test Developer"}'
```

---

*Last Updated: 2025-11-26*
*Status: Pivoting from auto-deploy platform → API-as-a-Service*
*Next: Add API key authentication + developer registration*
