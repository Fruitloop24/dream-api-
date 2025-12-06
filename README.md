# dream-api

**Stripe + Auth + Customer Management as a Service**

$15/mo API that handles authentication, billing, and usage tracking for indie developers.

---

## 🎯 What It Does

**The Simplest Pitch:**
You pay us $15/mo. We give you publishableKey + secretKey. You get Clerk auth + Stripe billing + usage tracking for YOUR customers. All in one API.

Developers integrate your API and get:
- ✅ User authentication (shared Clerk app, isolated by publishableKey)
- ✅ Stripe billing (checkout on THEIR Stripe account via Connect)
- ✅ Usage tracking (tier limits, rate limiting, enforcement)
- ✅ Customer dashboard (see users, revenue, MRR, churn)
- ✅ Webhooks handled automatically (Clerk + Stripe → D1 database)

**Works for:** SaaS, courses, digital products, API monetization, paywalls, indie hackers

**What makes this special:**
- Devs don't need their own Clerk account - use YOUR shared end-user-api
- Devs don't handle webhooks - you do
- Devs don't write auth/billing code - just call your API
- You provide infrastructure, they handle money (Stripe Connect)

---

## 🏗️ Architecture

### **The Services:**

**frontend/** - Developer dashboard (React + Clerk)
- Sign up, pay, connect Stripe, configure tiers
- Get publishableKey + secretKey
- View customer dashboard

**front-auth-api/** - Platform API (Cloudflare Worker)
- YOUR devs authenticate here (Clerk dream-api app)
- Payment processing ($15/mo to YOU)
- Generates credentials after product creation

**oauth-api/** - Stripe Connect handler (Cloudflare Worker)
- Securely connects developer's Stripe account
- Creates products on THEIR Stripe
- Generates publishableKey + secretKey
- Auto-creates webhook endpoints

**api-multi/** - Multi-tenant API (Cloudflare Worker)
- THEIR end-users authenticate here (Clerk end-user-api app)
- Usage tracking + tier enforcement
- Stripe checkout/portal for THEIR customers
- Webhooks populate D1 dashboard

---

## 🔑 The Key System (Critical Architecture)

### **platformId** (plt_xxx) - Internal, Stable, Never Changes
- Generated at first login (POST /generate-platform-id)
- Lives in KV only (NEVER in JWT, NEVER exposed)
- Stable internal ID - survives key rotation
- One dev can have MULTIPLE publishableKey/secretKey pairs
- All keys link back to same platformId
- Used for: KV storage, D1 queries, dashboard routing

### **publishableKey** (pk_live_xxx) - Public, Goes in JWT
- Generated AFTER tier configuration (oauth-api/create-products)
- Lives in end-user-api JWT (NOT dream-api JWT)
- Safe to expose (like Stripe's pk_live_)
- Used to isolate end-user data between different developers
- Dev can have multiple keys (prod, staging, test)

### **secretKey** (sk_live_xxx) - Private, Server-Only
- Generated with publishableKey
- NEVER exposed to client
- Used for API authentication (Authorization: Bearer sk_live_...)
- SHA-256 hashed before storing in KV

### **Why This Architecture?**
```
platformId: plt_abc123 (stable, internal)
    ↓
    ├── pk_live_prod → sk_live_prod_secret
    ├── pk_live_staging → sk_live_staging_secret
    └── pk_live_test → sk_live_test_secret
```

This allows you to:
- Rotate keys without losing customer data
- Have separate keys for prod/staging/test
- Revoke individual keys without affecting others
- Query ALL customers by platformId (regardless of which key was used)

---

## 💾 Data Storage

### **4 KV Namespaces:**

**TOKENS_KV (front-auth-api)** - `d09d8bf4e63a47c495384e9ed9b4ec7e`
```
user:{userId}:platformId → plt_abc123 (internal)
user:{userId}:publishableKey → pk_live_xyz789
user:{userId}:secretKey → sk_live_abc123def456
platform:{platformId}:userId → userId
```

**USAGE_KV (front-auth-api)** - `6a3c39a8ee9b46859dc237136048df25`
```
usage:{userId} → YOUR developers' usage
ratelimit:{userId}:{minute} → rate limit counters
```

**CUSTOMER_TOKENS_KV (api-multi)** - `a9f3331b0c8b48d58c32896482484208`
```
platform:{platformId}:stripe → {accessToken, stripeUserId}
platform:{platformId}:publishableKey → pk_live_xyz789
platform:{platformId}:tierConfig → {tiers: [...]}
publishablekey:{pk_live_xyz789} → platformId (reverse lookup)
secretkey:{hash} → publishableKey (API auth)
```

**USAGE_KV (api-multi)** - `10cc8b9f46f54a6e8d89448f978aaa1f`
```
usage:{publishableKey}:{userId} → THEIR end-users' usage
ratelimit:{userId}:{minute} → rate limit counters
```

### **D1 Database:**

```sql
CREATE TABLE users (
  publishable_key TEXT NOT NULL,  -- Which dev (pk_live_xxx)
  user_id TEXT NOT NULL,          -- Which end-user
  clerk_email TEXT,               -- From Clerk webhook
  clerk_name TEXT,
  plan TEXT,                      -- Tier (free, pro, etc)
  stripe_customer_id TEXT,        -- From Stripe webhook
  subscription_status TEXT,
  mrr REAL,
  usage_count INTEGER DEFAULT 0,
  last_active TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (publishable_key, user_id)
);

CREATE INDEX idx_publishable_key ON users(publishable_key);
CREATE INDEX idx_plan ON users(plan);
CREATE INDEX idx_last_active ON users(last_active);
```

**Purpose:** Dashboard queries (user lists, analytics, CSV export)

---

## 🔄 The Complete Developer Flow

### **Phase 1: Setup (Getting Credentials)**
```
1. Sign up (Clerk dream-api)
   → Frontend calls: POST /generate-platform-id
   → Backend generates: platformId = plt_abc123
   → Saved to front-auth-api TOKENS_KV
   ↓
2. Pay $15/mo (Stripe)
   → Stripe webhook updates dream-api JWT: plan = 'paid'
   ↓
3. Connect Stripe (OAuth)
   → Reads platformId from KV
   → OAuth to Stripe Connect
   → Stripe token saved: platform:{platformId}:stripeToken
   ↓
4. Configure tiers (ApiTierConfig page)
   → Free: $0, 100 requests
   → Pro: $29, 10k requests
   → Enterprise: $99, unlimited
   → Submit to: POST /create-products
   ↓
5. Products created → Keys generated:
   → Creates Stripe products on THEIR Stripe account
   → Generates publishableKey: pk_live_xyz789
   → Generates secretKey: sk_live_abc123def456
   → Saves to KV (front-auth-api + api-multi)
   → Returns credentials to frontend
   ↓
6. Copy credentials from dashboard
   → publishableKey (safe to expose)
   → secretKey (keep secret!)
```

### **Phase 2: Integration (Using the API)**
```
1. Dev builds their app
   → Uses api-multi endpoints with secretKey

2. Create customer:
   POST /customers
   Authorization: Bearer sk_live_abc123
   Body: { email, name, plan: "free" }

   → api-multi creates user in end-user-api Clerk
   → Sets: publicMetadata.publishableKey = pk_live_xyz789
   → Clerk webhook writes to D1

3. Create checkout (upgrade):
   POST /checkout
   Authorization: Bearer sk_live_abc123
   Body: { userId, tier: "pro" }

   → Creates Stripe checkout on dev's Stripe account
   → User pays on dev's Stripe
   → Stripe webhook updates D1
```

### **Phase 3: Dashboard (Viewing Customers)**
```
1. Dev logs into YOUR dashboard
   → Reads platformId from KV

2. Dashboard queries D1:
   SELECT * FROM customers WHERE platform_id = 'plt_abc123'

3. Shows:
   → Customer list (email, plan, status)
   → MRR, active users, churn
   → "View in Stripe" link

4. Dev handles refunds in THEIR Stripe dashboard
   → You don't touch money, just infrastructure
```

---

## 🎯 JWT Templates (Both Clerk Apps)

### **dream-api (YOUR developers who pay YOU):**
```json
{
  "plan": "{{user.public_metadata.plan}}"
}
```
- Only contains their plan status ("free" or "paid")
- Updated by Stripe webhook after payment
- No publishableKey needed (devs don't call their own API)

### **end-user-api (THEIR customers - SHARED Clerk app):**
```json
{
  "publishableKey": "{{user.public_metadata.publishableKey}}"
}
```
- Contains which developer owns this user
- Set when api-multi creates user via POST /customers
- THIS is how you isolate data between different developers
- All end-users from ALL developers share ONE Clerk app
- publishableKey keeps them separated

**CRITICAL INSIGHT:**
- You have TWO Clerk apps, but end-user-api is SHARED by ALL developers
- It's like a multi-tenant SaaS where publishableKey is the tenant ID
- One dev's customers can't see another dev's customers
- Dashboard queries: `WHERE publishable_key = 'pk_live_xyz789'`

---

## 🪝 Webhook Strategy

### **Clerk Webhook** → `front-auth-api/webhook/clerk`
- Fires when dev signs up
- Generates internal platformId
- Saves to KV, updates Clerk metadata

### **Stripe Webhook (Platform)** → `front-auth-api/webhook/stripe`
- Fires when dev pays $15/mo
- Updates plan to 'paid' in Clerk metadata

### **Clerk Webhook** → `api-multi/webhook/clerk`
- Fires when end-user signs up
- Caches profile in KV
- Writes to D1 (if publishableKey in metadata)

### **Stripe Webhook (Customers)** → `api-multi/webhook/stripe`
- Auto-created via Connect (oauth-api does this)
- ONE URL for ALL platforms
- Stripe sends `Stripe-Account: acct_xxx` header
- We lookup publishableKey, verify signature, write to D1

**Devs never configure webhooks. Fully automated.**

---

## 🚀 Local Development

```bash
# Terminal 1: Platform API
cd front-auth-api && npm run dev  # :8788

# Terminal 2: Frontend
cd frontend && npm run dev         # :5173

# Terminal 3: OAuth API
cd oauth-api && npm run dev        # :8789

# Terminal 4: Multi-tenant API
cd api-multi && npm run dev        # :8787
```

---

## 📋 Environment Setup

### **front-auth-api/.dev.vars**
```bash
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...         # $15/mo for YOUR revenue
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

### **oauth-api/.dev.vars**
```bash
STRIPE_CLIENT_ID=ca_...
STRIPE_CLIENT_SECRET=sk_...       # Full secret key (NOT rk_...)
FRONTEND_URL=http://localhost:5173
CLERK_SECRET_KEY=sk_test_...      # For updating metadata
CLERK_PUBLISHABLE_KEY=pk_test_...
```

### **api-multi/.dev.vars**
```bash
CLERK_SECRET_KEY=sk_test_...      # end-user-api Clerk app
CLERK_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
```

---

## 🎯 Current State (Dec 5, 2025)

**✅ COMPLETED:**
- ✅ Platform auth + payment flow ($15/mo Stripe checkout)
- ✅ Stripe OAuth integration (Stripe Connect)
- ✅ Tier configuration UI (ApiTierConfig page)
- ✅ Product creation endpoint (creates products on dev's Stripe)
- ✅ Platform ID generation (immediately after login)
- ✅ Credential generation (publishableKey + secretKey)
- ✅ Credentials page (displays keys + price IDs)
- ✅ Tier limits saved to Stripe metadata
- ✅ Tier config copied to api-multi KV namespace
- ✅ KV data structure finalized

**🎯 READY TO TEST:**
- Full signup flow: signup → pay → OAuth → tier config → credentials
- Tier limits enforcement (saved to KV + Stripe metadata)

**📝 TODO NEXT:**
- Test complete flow with fresh account
- Verify tier limits in KV after tier config
- Build api-multi endpoints (POST /customers, POST /checkout)
- Setup D1 database (customers table)
- Clerk webhook (end-user-api → D1)
- Stripe webhook (write to D1)
- Dashboard UI (customer list, analytics, CSV export)
- Automated webhook setup via Connect API

---

## 📦 Tech Stack

- **Frontend:** React + Vite + Clerk + Tailwind
- **Workers:** Cloudflare Workers (TypeScript)
- **Auth:** Clerk (2 apps: dream-api, end-user-api)
- **Storage:** KV (4 namespaces) + D1 (dashboard)
- **Payments:** Stripe + Stripe Connect
- **Deployment:** Wrangler + Cloudflare Pages

---

## 🔥 Key Architecture Insights

### **Why separate platformId and publishableKey?**
- **platformId** = internal bridge between KV namespaces (never exposed)
- **publishableKey** = public identifier in JWT (safe to expose)
- Allows regenerating publishableKey without breaking internal mappings

### **Why only publishableKey in JWT?**
- Simplicity - one identifier does everything
- Security - can't reverse lookup sensitive data from JWT alone
- Flexibility - can add more claims later without breaking tokens

### **Why two Clerk apps?**
- Complete data isolation (YOUR devs vs THEIR customers)
- Different pricing tiers, limits, features per app
- Cleaner billing (you bill devs, they bill customers)

### **Why D1 for dashboard?**
- KV is fast but not queryable
- D1 enables: filtering, sorting, aggregations, CSV exports
- Dual-write strategy: KV for speed, D1 for analytics

---

See **CLAUDE.md** for detailed session notes and implementation flow.
