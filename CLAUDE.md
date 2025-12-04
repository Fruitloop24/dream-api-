# dream-api - Development Guide

**Last Updated:** 2025-12-03

---

## 🧠 THE BIG PICTURE - MENTAL MODEL

This is an **API-as-a-Service platform**. We have TWO completely separate authentication systems and FOUR KV namespaces that keep data isolated.

### The Two Flows:

**FREE PREVIEW FLOW (before payment):**
Developer signs up → Setup branding → Configure tiers → Styling → Get AI-generated preview site → See it working → Subscribe

**PAID FLOW (after $29/mo payment):**
Payment success → Connect Stripe OAuth → Configure REAL API tiers → Create Stripe products → Get platformId + API key → Use production API

---

## Current Session Status

### ✅ What We Built Previously:

**FREE PREVIEW FLOW:**
- Landing page updated ("See Your SaaS Working in 5 Minutes")
- Setup page (branding: app name, logo, color)
- PreviewConfigure page (tier config for preview)
- PreviewStyling page (value prop, description, hero image)
- PreviewReady page (shows preview URL + Subscribe button)
- Dashboard redirects free users to /setup (no localStorage caching)

**PAID FLOW:**
- After payment → `/configure?payment=success`
- Shows "Connect Stripe" button → OAuth to oauth-api
- OAuth redirects to `/api-tier-config?stripe=connected`
- ApiTierConfig page (configure REAL tiers, no branding)

---

## Tomorrow's Tasks

### 1. Setup OAuth Secrets
**File:** `oauth-api/.dev.vars`
```bash
STRIPE_CLIENT_ID=ca_...           # Get from Stripe Connect settings
STRIPE_CLIENT_SECRET=sk_...       # Get from Stripe Connect settings
FRONTEND_URL=http://localhost:5173
```

**How to get Stripe Connect credentials:**
1. Go to https://dashboard.stripe.com/settings/applications
2. Create OAuth app or use existing
3. Copy Client ID and Secret Key
4. Add to oauth-api/.dev.vars

**Test OAuth:**
```bash
cd oauth-api && npm run dev  # Port 8789
# Click "Connect Stripe" button in frontend
# Should redirect to Stripe OAuth
# After auth, redirects to /api-tier-config
```

---

### 2. Preview Site Generation

**Current:** PreviewReady shows placeholder URL
**Need:** Generate REAL preview site

**Options:**
1. **AI Worker** - Send config to AI worker, generates HTML/worker code
2. **Template Worker** - Pre-built template, inject their config
3. **Static Site** - Generate static HTML, deploy to Pages

**Recommended:** Template worker (fastest to implement)

**Steps:**
- Create preview-template worker
- Receives config from PreviewStyling submit
- Deploys worker with their branding
- Returns URL: `https://preview-{hash}.workers.dev`

---

### 3. Product Creation After Tier Config

**File:** `front-auth-api/src/index.ts`

**New endpoint needed:** `POST /create-products`

**Flow:**
1. User submits ApiTierConfig form
2. Frontend calls `/create-products` with:
   - userId (from JWT)
   - tiers array (from form)
3. Backend:
   - Gets platformId from `user:{userId}:platformId`
   - Gets Stripe token from `platform:{platformId}:stripe` (api-multi KV)
   - Creates products on THEIR Stripe using their token
   - Generates platformId + API key
   - Saves tier config + price IDs to api-multi TOKENS_KV
   - Returns: platformId, API key, price IDs

**Code pattern:**
```typescript
// front-auth-api/src/index.ts
if (url.pathname === '/create-products' && request.method === 'POST') {
  const userId = await verifyAuth(request, env);
  const { tiers } = await request.json();

  // 1. Get platformId
  const platformId = await env.TOKENS_KV.get(`user:${userId}:platformId`);
  if (!platformId) {
    // Generate new platformId
    platformId = `plt_${crypto.randomUUID().replace(/-/g, '')}`;
    await env.TOKENS_KV.put(`user:${userId}:platformId`, platformId);
  }

  // 2. Get Stripe token from api-multi KV
  // NOTE: This requires oauth-api to have access to api-multi TOKENS_KV!
  // Actually, we should READ from api-multi KV HERE
  // Need to add CUSTOMER_TOKENS_KV binding to front-auth-api wrangler.toml

  const stripeDataJson = await env.CUSTOMER_TOKENS_KV.get(`platform:${platformId}:stripe`);
  const stripeData = JSON.parse(stripeDataJson);

  // 3. Create Stripe products
  const stripe = new Stripe(stripeData.accessToken, { apiVersion: '2025-11-17.clover' });
  const priceIds = [];

  for (const tier of tiers) {
    const product = await stripe.products.create({
      name: tier.displayName,
      metadata: { platformId, tierName: tier.name }
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.price * 100,
      currency: 'usd',
      recurring: { interval: 'month' }
    });

    priceIds.push({ tier: tier.name, priceId: price.id });
  }

  // 4. Generate API key
  const apiKey = `pk_live_${crypto.randomUUID().replace(/-/g, '')}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  // 5. Save to KV
  await env.TOKENS_KV.put(`user:${userId}:apiKey`, apiKey);
  await env.TOKENS_KV.put(`apikey:${hashHex}`, platformId);
  await env.TOKENS_KV.put(`platform:${platformId}:userId`, userId);

  await env.CUSTOMER_TOKENS_KV.put(`platform:${platformId}:tierConfig`, JSON.stringify({
    tiers: tiers.map((t, i) => ({ ...t, priceId: priceIds[i].priceId }))
  }));

  return new Response(JSON.stringify({ platformId, apiKey, priceIds }));
}
```

---

### 4. Wrangler.toml Updates

**front-auth-api/wrangler.toml** needs CUSTOMER_TOKENS_KV binding:
```toml
[[kv_namespaces]]
binding = "USAGE_KV"
id = "6a3c39a8ee9b46859dc237136048df25"

[[kv_namespaces]]
binding = "TOKENS_KV"
id = "d09d8bf4e63a47c495384e9ed9b4ec7e"

[[kv_namespaces]]
binding = "CUSTOMER_TOKENS_KV"
id = "a9f3331b0c8b48d58c32896482484208"
```

**oauth-api/wrangler.toml** already has both:
```toml
[[kv_namespaces]]
binding = "PLATFORM_TOKENS_KV"
id = "d09d8bf4e63a47c495384e9ed9b4ec7e"

[[kv_namespaces]]
binding = "CUSTOMER_TOKENS_KV"
id = "a9f3331b0c8b48d58c32896482484208"
```

---

## 🔑 THE FOUR KV NAMESPACES (ULTRA CRITICAL!)

This is the HEART of the architecture. We have FOUR separate KV namespaces that keep YOUR developers' data completely separate from THEIR end-users' data.

### System 1: YOUR Platform (front-auth-api)
These track YOUR developers who pay YOU $29/mo:

**USAGE_KV: `6a3c39a8ee9b46859dc237136048df25`**
- Tracks YOUR developers' API usage
- Keys: `usage:{userId}`, `ratelimit:{userId}:{minute}`
- Limits: Free = 5 calls/mo, Paid = 500 calls/mo

**TOKENS_KV: `d09d8bf4e63a47c495384e9ed9b4ec7e`**
- Stores YOUR developers' credentials
- Keys: `user:{userId}:platformId`, `user:{userId}:apiKey`, `apikey:{hash}`, `platform:{platformId}:userId`
- This is where platformId + API key are stored

### System 2: THEIR Platform (api-multi)
These track THEIR end-users who pay THEM:

**USAGE_KV: `10cc8b9f46f54a6e8d89448f978aaa1f`**
- Tracks THEIR end-users' API usage
- Keys: `usage:{platformId}:{endUserId}`, `ratelimit:{endUserId}:{minute}`
- Limits defined by tier config (they set their own limits)

**TOKENS_KV: `a9f3331b0c8b48d58c32896482484208`**
- Stores THEIR tier configs, Stripe tokens, product IDs
- Keys: `platform:{platformId}:stripe`, `platform:{platformId}:tierConfig`, `apikey:{hash}`
- This is the "customer tokens" namespace

### The Bridge: oauth-api
This worker bridges both systems without mixing data:

**PLATFORM_TOKENS_KV: `d09d8bf4e63a47c495384e9ed9b4ec7e`** (READ)
- Same as front-auth-api TOKENS_KV
- Used to READ platformId for a given userId

**CUSTOMER_TOKENS_KV: `a9f3331b0c8b48d58c32896482484208`** (WRITE)
- Same as api-multi TOKENS_KV
- Used to WRITE Stripe OAuth tokens after OAuth completes

### Dual Clerk Apps
We also have TWO separate Clerk apps for authentication:

1. **dream-api** (smooth-molly-95) - YOUR developers sign up here
2. **end-user-api** (composed-blowfish-76) - THEIR end-users sign up here (in api-multi)

---

## Testing Checklist

### Free Preview Flow:
- [ ] Sign up → Goes to /setup
- [ ] Setup → Configure → Styling works
- [ ] PreviewReady shows URL + Subscribe button
- [ ] Preview URL actually works (after worker setup)

### Paid Flow:
- [ ] Subscribe → Stripe checkout works
- [ ] Webhook updates plan to 'paid'
- [ ] Redirects to /configure?payment=success
- [ ] Connect Stripe button → OAuth works
- [ ] Redirects to /api-tier-config?stripe=connected
- [ ] Tier config form works
- [ ] Submit → Creates products on THEIR Stripe
- [ ] Shows platformId + API key + price IDs
- [ ] Can copy credentials

### API Integration:
- [ ] Developer uses API key to call api-multi
- [ ] Usage tracking works
- [ ] Tier limits enforced
- [ ] Stripe checkout for THEIR customers works

---

## Common Issues

**OAuth not working:**
- Check STRIPE_CLIENT_ID and STRIPE_CLIENT_SECRET in oauth-api/.dev.vars
- Check oauth-api is running on port 8789
- Check VITE_OAUTH_API_URL in frontend/.env

**Products not creating:**
- Check CUSTOMER_TOKENS_KV binding in front-auth-api/wrangler.toml
- Check Stripe token exists in KV: `platform:{platformId}:stripe`
- Check Stripe API version matches

**Preview not showing:**
- Check localStorage has previewConfig
- Check PreviewReady page loads correctly

---

## 🚀 FINAL ARCHITECTURE (Dec 3, 2025)

### **KEY DECISIONS:**

**✅ No Preview Flow** - Removed (focus on core API product)
**✅ Keys After Payment** - publishableKey + secretKey given AFTER $15/mo payment
**✅ publishableKey = platformId** - Client-safe identifier (pk_live_abc123)
**✅ secretKey = apiKey** - Server-only authentication (sk_live_xyz789)
**✅ D1 for Dashboard** - User data queryable, exportable
**✅ Webhooks to D1** - Clerk + Stripe webhooks write directly to D1
**✅ Stripe Connect Webhook** - ONE webhook URL for ALL platforms (auto-created)
**✅ KV + D1 dual-write** - Usage in KV (fast), dashboard in D1 (queryable)
**✅ Matching JWT Templates** - Both apps: userId, platformId, plan

---

### **WHEN DEVS GET KEYS:**

```
1. Sign up (Clerk dream-api) → No keys yet
2. Pay $15/mo → Stripe webhook updates metadata
3. Connect Stripe → OAuth flow completes
4. Configure tiers → Submit form
5. Generate keys:
   - publishableKey: pk_live_abc123 (platformId)
   - secretKey: sk_live_xyz789 (apiKey)
6. Show both in dashboard
```

---

### **JWT FORMAT (Both dream-api + end-user-api):**

```json
{
  "userId": "{{user.id}}",
  "platformId": "{{user.public_metadata.platformId}}",
  "plan": "{{user.public_metadata.plan}}"
}
```

---

### **D1 SCHEMA:**

```sql
CREATE TABLE users (
  platform_id TEXT NOT NULL,       -- From publishableKey
  user_id TEXT NOT NULL,           -- From Clerk
  clerk_email TEXT,                -- From Clerk webhook
  clerk_name TEXT,                 -- From Clerk webhook
  plan TEXT,                       -- From tier config
  stripe_customer_id TEXT,         -- From Stripe webhook
  subscription_status TEXT,        -- From Stripe webhook
  mrr REAL,                        -- From Stripe webhook
  usage_count INTEGER DEFAULT 0,  -- From API calls
  last_active TIMESTAMP,           -- From API calls
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (platform_id, user_id)
);

CREATE INDEX idx_platform ON users(platform_id);
CREATE INDEX idx_plan ON users(plan);
CREATE INDEX idx_last_active ON users(last_active);
```

---

### **STRIPE CONNECT WEBHOOK SOLUTION:**

**Auto-create webhook via Connect (oauth-api callback):**
- Creates endpoint on THEIR Stripe account
- Points to: `https://api-multi.workers.dev/webhook/stripe`
- One URL for all platforms
- Stripe sends `Stripe-Account: acct_xxx` header
- We lookup: `stripeaccount:{acct_xxx} → platformId`
- Verify with: `platform:{platformId}:webhookSecret`

**No manual webhook setup. Fully automated.**

---

### **DUAL-WRITE STRATEGY:**

**API calls write to BOTH:**
- KV: Fast usage tracking (edge-replicated)
- D1: Dashboard queries (SQL, exportable)

**Webhooks write to:**
- D1 only (payment/user data doesn't need KV speed)

**Dashboard queries:**
- D1 only (SELECT * FROM users WHERE platform_id = ?)

---

### **KV NAMESPACE MAPPINGS:**

**TOKENS_KV (front-auth-api):**
```
user:{userId}:platformId → pk_live_abc123
user:{userId}:apiKey → sk_live_xyz789
apikey:{hash} → pk_live_abc123
platform:{platformId}:userId → {userId}
```

**CUSTOMER_TOKENS_KV (api-multi):**
```
platform:{platformId}:stripe → { accessToken, stripeUserId }
platform:{platformId}:tierConfig → { tiers: [...] }
platform:{platformId}:webhookSecret → whsec_...
stripeaccount:{acct_xxx} → pk_live_abc123
clerkuser:{userId}:profile → { email, name }
```

**USAGE_KV (api-multi):**
```
usage:{platformId}:{userId} → { usageCount, plan, ... }
```

---

## 📋 BUILD CHECKLIST:

- [ ] Remove preview pages from frontend
- [ ] Update both JWT templates (dream-api + end-user-api)
- [ ] Create D1 database: `wrangler d1 create dream-dashboard`
- [ ] Add D1 binding to api-multi wrangler.toml
- [ ] Run schema: `wrangler d1 execute dream-dashboard --file=schema.sql`
- [ ] Add Clerk webhook handler: `/webhook/clerk`
- [ ] Auto-create Stripe webhook in oauth-api callback
- [ ] Update Stripe webhook handler: write to D1
- [ ] Add dashboard endpoint: `/dashboard/users` in front-auth-api
- [ ] Build dashboard UI: Shadcn DataTable + export CSV
- [ ] Update README.md: Remove preview references
- [ ] Test full flow: signup → pay → OAuth → tiers → keys → dashboard

---

*Architecture finalized. Ready to build.*
