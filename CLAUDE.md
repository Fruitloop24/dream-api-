# dream-api - Claude Development Guide

## 🚀 Quick Start (Pick Up Where We Left Off)

**Last session:** 2025-11-26 - Usage tracking fully implemented in front-auth-api

**What's working:**
- ✅ Backend API with usage tracking (5 calls free, 500 calls paid)
- ✅ Auth flow (Clerk signup → free plan → subscribe button)
- ✅ Local dev environment tested

**Next task:** Dashboard UI improvements
1. Display usage stats in dashboard (3/5 calls)
2. Add progress bar + upgrade CTA
3. Generate & display preview link
4. Fix off-center CSS layout

**To resume:**
```bash
# Start services
cd front-auth-api && npm run dev  # Port 8788
cd frontend && npm run dev         # Port 5173

# Test at http://localhost:5173
# API docs: See TOMORROW.md for UI mockups
```

---

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

## Adding from plug-saas Pattern

We're implementing the **exact pattern** from plug-saas for usage tracking and billing. This pattern has been tested and works perfectly.

### What We're Implementing:

#### 1. **JWT-Based Usage Tracking**
- **Plan stored in JWT**: `{ "plan": "free" | "paid" }`
- **Usage counter in KV**: `usage:{userId} → { usageCount, plan, periodStart }`
- **Tier limits in config** (NOT in JWT): `TIER_CONFIG = { free: 5, paid: 500 }`

**Why this works:**
- JWT is public → Only store plan tier (safe to expose)
- KV is private → Store actual usage count (sensitive data)
- Config is hardcoded → Easy to change limits without migrations

#### 2. **Monthly Billing Period Reset**
- `getCurrentPeriod()` - Calculates current month start/end (UTC)
- `shouldResetUsage()` - Checks if new billing period started
- Resets counter automatically on first request of new month
- Only applies to limited tiers (free/paid), not unlimited developer tier

#### 3. **Stripe Webhook Updates JWT**
- Webhook receives `checkout.session.completed`
- Updates Clerk `publicMetadata.plan = "paid"`
- JWT refreshes with new plan on next request
- No manual database updates needed

#### 4. **Rate Limiting** (100 req/min per user)
- Per-minute buckets: `ratelimit:{userId}:{minute}`
- TTL of 2 minutes for auto-cleanup
- Prevents abuse even within tier limits

---

## Current Status

### ✅ What Works (Updated 2025-11-26)

**front-auth-api/**: Platform authentication & payment (YOUR Stripe)
- ✅ Clerk JWT verification
- ✅ **Usage tracking IMPLEMENTED** (free: 5 calls/month, paid: 500 calls/month)
- ✅ **Monthly billing period resets** (auto-reset on 1st of month)
- ✅ **Rate limiting** (100 req/min per user)
- ✅ Stripe checkout ($29/mo subscription)
- ✅ **Webhook handler** (updates JWT plan field + idempotency)
- ✅ Credential generation (platformId + API key)
- ✅ **All endpoints wrapped** with usage tracking
- ✅ Usage stats returned in every API response

**api-multi/**: Multi-tenant API worker (customers' end-users)
- ✅ Clerk JWT authentication (one Clerk app for all)
- ✅ Multi-tenant via `X-Platform-User-Id` header
- ✅ Config loading from KV per platform (`user:{platformId}:tierConfig`)
- ✅ Usage tracking with tier limits (`usage:{userId}`)
- ✅ Stripe checkout/webhooks/portal
- ✅ Rate limiting (100 req/min per user)
- ✅ CORS handling
- ✅ Monthly billing period resets
- ⚠️ **NEEDS**: Same plug-saas pattern (already has most of it)

**frontend/**: React app (Vite + Clerk + Tailwind)
- ✅ Landing page (LandingNew.tsx)
- ✅ Dashboard (DashboardNew.tsx)
- ✅ Routing with Clerk authentication
- ✅ **WIRED TO**: front-auth-api (uses JWT tokens)
- ✅ **Local dev working** (http://localhost:5173)
- ⚠️ **NEEDS**: Usage stats display in dashboard
- ⚠️ **NEEDS**: Tier config UI
- ⚠️ **NEEDS**: Preview link generation

**oauth-api/**: Stripe OAuth handler
- ✅ OAuth flow skeleton
- ⚠️ Needs full Stripe Connect implementation (Phase 2)

### 🔨 What Needs Work (Priority Order)

**Phase 1: Dashboard UI (Next Session)**
1. **Display Usage Stats**
   - Show: "3/5 calls this month"
   - Progress bar visualization
   - Plan badge (FREE/PAID)
   - Upgrade CTA when near limit

2. **Preview Link Generation**
   - Generate: `https://preview.dream-api.com/{platformId}`
   - Display in dashboard
   - Copy button
   - "Try Demo" link

3. **Tier Configuration UI**
   - Let developers customize tier names
   - Set pricing
   - Set limits
   - Preview before saving

**Phase 2: Preview Mode (api-multi)**
1. **Preview vs Production Mode**
   - Preview: Uses YOUR Stripe keys
   - Production: Uses THEIR Stripe keys (OAuth)
   - Watermark responses in preview mode
   - Limit preview to 100 end-users

2. **Stripe OAuth Integration**
   - oauth-api flow
   - Store customer Stripe keys in KV
   - Switch from preview → production mode

**Phase 3: Polish**
1. **Code Cleanup**
   - Remove "PLUG SAAS" references
   - Remove "FACT-SaaS" references
   - Update all comments
   - Add JSDoc documentation

2. **Testing & Deploy**
   - End-to-end tests
   - Load testing
   - Deploy to production
   - Set up monitoring

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

## Implementation Details from plug-saas

This section contains the **exact code patterns** to implement in front-auth-api. Copy this pattern precisely.

### Data Structures

#### UsageData Interface
```typescript
interface UsageData {
    usageCount: number;
    plan: 'free' | 'paid';
    lastUpdated: string;
    periodStart?: string;
    periodEnd?: string;
}
```

#### Platform Tier Configuration (front-auth-api)
```typescript
const PLATFORM_TIERS: Record<string, { limit: number; price: number; name: string }> = {
    free: {
        name: 'Free',
        price: 0,
        limit: 5  // 5 API calls per month
    },
    paid: {
        name: 'Paid',
        price: 29,  // $29/month
        limit: 500  // 500 API calls per month
    }
};
```

### Core Functions

#### 1. Get Current Billing Period
```typescript
/**
 * Calculate current month boundaries (UTC)
 * Used for monthly billing period reset
 */
function getCurrentPeriod(): { start: string; end: string } {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    return {
        start: start.toISOString().split('T')[0],  // "2025-11-01"
        end: end.toISOString().split('T')[0]        // "2025-11-30"
    };
}
```

#### 2. Check if Usage Should Reset
```typescript
/**
 * Determine if usage counter should be reset
 * Resets on first request of new billing period
 */
function shouldResetUsage(usageData: UsageData): boolean {
    const currentPeriod = getCurrentPeriod();

    // No period data = first time, reset
    if (!usageData.periodStart || !usageData.periodEnd) {
        return true;
    }

    // Different month = new period, reset
    return currentPeriod.start !== usageData.periodStart;
}
```

#### 3. Rate Limiting
```typescript
const RATE_LIMIT_PER_MINUTE = 100;

/**
 * Check and update rate limit counter
 * Uses per-minute KV buckets with auto-expiring TTL
 */
async function checkRateLimit(
    userId: string,
    env: Env
): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);  // Current minute
    const rateLimitKey = `ratelimit:${userId}:${minute}`;

    const currentCount = await env.USAGE_KV.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount) : 0;

    if (count >= RATE_LIMIT_PER_MINUTE) {
        return { allowed: false, remaining: 0 };
    }

    // Increment and set TTL of 2 minutes (auto-cleanup)
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

#### 4. Handle Data Request (Usage Tracking)
```typescript
/**
 * Main usage tracking handler
 * Call this on EVERY API endpoint that should count toward limits
 */
async function handleDataRequest(
    userId: string,
    plan: 'free' | 'paid',
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    // Load usage data from KV
    const usageKey = `usage:${userId}`;
    const usageDataRaw = await env.USAGE_KV.get(usageKey);
    const currentPeriod = getCurrentPeriod();

    let usageData: UsageData = usageDataRaw
        ? JSON.parse(usageDataRaw)
        : {
            usageCount: 0,
            plan,
            lastUpdated: new Date().toISOString(),
            periodStart: currentPeriod.start,
            periodEnd: currentPeriod.end,
        };

    const tierLimit = PLATFORM_TIERS[plan]?.limit || 0;

    // Reset usage if new billing period
    if (shouldResetUsage(usageData)) {
        usageData.usageCount = 0;
        usageData.periodStart = currentPeriod.start;
        usageData.periodEnd = currentPeriod.end;
    }

    // Update plan (in case it changed in JWT)
    usageData.plan = plan;

    // Check if tier limit exceeded
    if (usageData.usageCount >= tierLimit) {
        return new Response(
            JSON.stringify({
                error: 'Tier limit reached',
                usageCount: usageData.usageCount,
                limit: tierLimit,
                message: 'Please upgrade to unlock more requests',
            }),
            {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }

    // Increment usage count
    usageData.usageCount++;
    usageData.lastUpdated = new Date().toISOString();
    await env.USAGE_KV.put(usageKey, JSON.stringify(usageData));

    return new Response(
        JSON.stringify({
            success: true,
            usage: {
                count: usageData.usageCount,
                limit: tierLimit,
                plan,
                periodStart: usageData.periodStart,
                periodEnd: usageData.periodEnd,
            },
        }),
        {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
    );
}
```

### Webhook Handler (Stripe)

```typescript
/**
 * Handle Stripe checkout.session.completed webhook
 * Updates JWT metadata to unlock paid tier
 */
if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata?.userId || session.client_reference_id;

    if (userId) {
        // Update Clerk user metadata
        const clerkClient = createClerkClient({
            secretKey: env.CLERK_SECRET_KEY,
            publishableKey: env.CLERK_PUBLISHABLE_KEY,
        });

        await clerkClient.users.updateUser(userId, {
            publicMetadata: {
                plan: 'paid',  // Upgrade from 'free' to 'paid'
                subscribed: true,
                subscriptionId: session.subscription,
            },
        });

        console.log(`[Webhook] Upgraded user ${userId} to paid plan`);
    }
}
```

### Integration with Existing Endpoints

**Add to front-auth-api/src/index.ts:**

1. **Add USAGE_KV binding** to wrangler.toml:
```toml
[[kv_namespaces]]
binding = "USAGE_KV"
id = "your_kv_namespace_id"
```

2. **Add to Env interface:**
```typescript
interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  FRONTEND_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET: string;
  TOKENS_KV: KVNamespace;
  USAGE_KV: KVNamespace;  // ADD THIS
}
```

3. **Wrap protected endpoints:**
```typescript
// Example: /generate-credentials endpoint
if (url.pathname === '/generate-credentials' && request.method === 'POST') {
    const userId = await verifyAuth(request, env);

    // Extract plan from JWT
    const clerkClient = createClerkClient({
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });
    const user = await clerkClient.users.getUser(userId);
    const plan = user.publicMetadata.plan as 'free' | 'paid' || 'free';

    // Check rate limit first
    const rateLimit = await checkRateLimit(userId, env);
    if (!rateLimit.allowed) {
        return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Try again in 1 minute.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Track usage
    const usageResponse = await handleDataRequest(userId, plan, env, corsHeaders);
    const usageResult = await usageResponse.json();

    if (!usageResult.success) {
        // Usage limit exceeded
        return usageResponse;
    }

    // Continue with credential generation...
    // (existing code)
}
```

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

### Phase 1: Add Usage Tracking from plug-saas (URGENT)

**front-auth-api needs these additions:**

1. ✅ **Update docs** (README.md, CLAUDE.md) - DONE
2. **Add USAGE_KV binding**
   - Update `wrangler.toml` with USAGE_KV namespace
   - Add to Env interface in index.ts
3. **Add usage tracking functions**
   - Add `UsageData` interface
   - Add `PLATFORM_TIERS` config (free: 5, paid: 500)
   - Add `getCurrentPeriod()` function
   - Add `shouldResetUsage()` function
   - Add `checkRateLimit()` function
   - Add `handleDataRequest()` function
4. **Update webhook handler**
   - Modify `/webhook/stripe` to update `plan` in JWT metadata
   - Ensure `subscribed: true` is set
5. **Wrap protected endpoints**
   - Add usage tracking to `/generate-credentials`
   - Add usage tracking to any other metered endpoints
   - Test free tier limit (5 calls)
   - Test paid tier limit (500 calls)
6. **Test full flow**
   - Sign up → Free tier (5 calls)
   - Make 5 API calls → Should succeed
   - Make 6th call → Should return 403
   - Pay $29/mo → Webhook updates JWT
   - Make API call → Should succeed with paid tier (500 limit)

**api-multi verification:**
- Verify it already has this pattern implemented
- Test multi-tenant usage tracking
- Ensure monthly resets work

### Phase 2: Wire Frontend to API (Week 2)

1. ✅ **Frontend pages** - DONE (LandingNew.tsx, DashboardNew.tsx)
2. **Test frontend integration**
   - Test signup flow
   - Test payment flow
   - Test credential display
   - Test Stripe OAuth button
3. **Add usage display in dashboard**
   - Show current usage count
   - Show tier limit
   - Show billing period
   - Add upgrade prompt when limit reached

### Phase 3: Developer Experience (Week 3)

1. **Add developer endpoints**
   - GET `/api/developer/usage` (check usage/limits)
   - POST `/api/developer/regenerate-key` (rotate API key)
2. **Dashboard enhancements**
   - Usage graph over time
   - Revenue analytics
   - API call logs
3. **Documentation**
   - API reference
   - Quickstart guide
   - Integration examples

### Phase 4: Advanced Features (Week 4)

1. **npm package** (optional)
   - Create `@dream-api/client`
   - Publish to npm
2. **Testing & Security**
   - End-to-end tests
   - Load testing
   - Security audit
3. **Production deployment**
   - Deploy all services
   - Set up monitoring
   - Launch!

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

## Quick Reference: What to Implement Next

### Immediate Task: Add Usage Tracking to front-auth-api

**Files to modify:**
1. `front-auth-api/wrangler.toml` - Add USAGE_KV binding
2. `front-auth-api/src/index.ts` - Add all functions from "Implementation Details" section above

**Copy these functions exactly from plug-saas:**
- `UsageData` interface
- `PLATFORM_TIERS` config (free: 5, paid: 500)
- `getCurrentPeriod()` function
- `shouldResetUsage()` function
- `checkRateLimit()` function
- `handleDataRequest()` function

**Update webhook handler:**
- Set `plan: 'paid'` in JWT metadata after payment
- Set `subscribed: true` to unlock dashboard

**Test:**
- Free tier: 5 API calls/month
- Paid tier: 500 API calls/month
- Monthly reset on 1st of month
- Rate limit: 100 req/min

---

## Summary of Two Systems

### YOUR Platform (front-auth-api)
- **Customers**: Developers who pay YOU $29/mo
- **Auth**: Clerk App #1 (YOUR Clerk account)
- **Payment**: YOUR Stripe account (you're the merchant)
- **Tiers**: free (5 calls), paid (500 calls)
- **What it does**: Authentication, payment, credential generation
- **Status**: ⚠️ Needs usage tracking from plug-saas pattern

### Customers' End-Users (api-multi)
- **Customers**: Your customers' end-users
- **Auth**: Clerk App #2 (shared Clerk app OR customer's own)
- **Payment**: Customer's Stripe account (via OAuth)
- **Tiers**: Configured per customer (free, pro, etc.)
- **What it does**: Multi-tenant API usage tracking
- **Status**: ✅ Already has plug-saas pattern implemented

---

*Last Updated: 2025-11-26*
*Status: Documented plug-saas pattern implementation*
*Next: Add usage tracking functions to front-auth-api*
