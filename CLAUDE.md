# dream-api - Development Guide

**Last Updated:** 2025-12-06 (Testing Phase - API Key Verification)

---

## 🧠 THE BIG PICTURE - MENTAL MODEL

This is an **API-as-a-Service platform**. Developers pay YOU $15/mo to get a white-label auth + billing API for THEIR customers.

### **THE SIMPLEST EXPLANATION:**

**You have TWO Clerk apps:**
1. **dream-api** - YOUR developers (who pay YOU)
2. **end-user-api** - THEIR customers (who pay THEM)

**You have ONE identifier in JWT: `publishableKey`**
- Like Stripe's `pk_live_xxx` - safe to expose
- Generated AFTER product creation (not at signup)
- Used to route dashboards, isolate data, track usage

**Internal `platformId` exists but stays in KV:**
- Generated IMMEDIATELY after first login (plt_xxx format)
- Used internally to bridge between KV namespaces
- NOT in JWT, NOT exposed to frontend

---

## 🔑 THE KEY SYSTEM (MOST IMPORTANT CONCEPT!)

This is the HARDEST part to understand. Read this carefully:

### **Internal platformId (plt_xxx)**
**Purpose:** Stable internal ID that NEVER changes
**When created:** IMMEDIATELY after first login (before payment, before OAuth)
**Where it lives:** KV only (NEVER in JWT, NEVER exposed to client)
**Why it exists:** Allows developers to have MULTIPLE publishableKey/secretKey pairs

**Example Use Cases:**
- Developer wants separate keys for production, staging, and test environments
- Developer rotates keys for security (old keys still work until deleted)
- All keys link back to the SAME platformId, so all data stays connected

```
platformId: plt_abc123 (NEVER changes)
    ↓
    ├── publishableKey #1 (production) → pk_live_prod123
    │   └── secretKey #1 → sk_live_prod456
    ├── publishableKey #2 (staging) → pk_live_staging789
    │   └── secretKey #2 → sk_live_staging012
    └── publishableKey #3 (test) → pk_live_test345
        └── secretKey #3 → sk_live_test678
```

**Key Storage Locations:**
- **front-auth-api TOKENS_KV:**
  - `user:{userId}:platformId → plt_abc123`
  - `platform:{platformId}:userId → userId`

---

### **publishableKey (pk_live_xxx)**
**Purpose:** Public identifier for data isolation
**When created:** AFTER tier configuration (oauth-api/create-products)
**Where it lives:** end-user-api JWT (NOT dream-api JWT)
**Why it exists:** Isolate end-user data between different developers

**The Magic:** ALL developers share ONE Clerk app (end-user-api), but data is isolated by publishableKey in JWT.

**Example:**
```
Developer A's customers:
  - user_123 has JWT: {"publishableKey": "pk_live_devA"}
  - user_456 has JWT: {"publishableKey": "pk_live_devA"}

Developer B's customers:
  - user_789 has JWT: {"publishableKey": "pk_live_devB"}
  - user_012 has JWT: {"publishableKey": "pk_live_devB"}
```

Even though all 4 users are in the SAME Clerk app, they're isolated by publishableKey.

**Key Storage Locations:**
- **front-auth-api TOKENS_KV:**
  - `user:{userId}:publishableKey → pk_live_xyz789`
  - `publishablekey:{pk_live_xyz}:platformId → plt_abc123`
- **api-multi TOKENS_KV:**
  - `publishablekey:{pk_live_xyz}:platformId → plt_abc123` (duplicate for fast lookup)

---

### **secretKey (sk_live_xxx)**
**Purpose:** Server-side API authentication
**When created:** Same time as publishableKey (after tier config)
**Where it lives:** Developer's backend ONLY (NEVER exposed to client)
**Why it exists:** Authenticate API calls to api-multi

**Security:**
- SHA-256 hashed before storing in KV
- Used in API calls: `Authorization: Bearer sk_live_abc123`

**Key Storage Locations:**
- **front-auth-api TOKENS_KV:**
  - `user:{userId}:secretKey → sk_live_abc123` (plaintext - for dev to copy)
  - `secretkey:{sha256hash}:publishableKey → pk_live_xyz789` (for API auth)
- **api-multi TOKENS_KV:**
  - `secretkey:{sha256hash}:publishableKey → pk_live_xyz789` (duplicate for fast lookup)

---

## 🔄 THE COMPLETE DATA FLOW

### **PHASE 1: Signup → platformId Generated**
```
1. Dev signs up (Clerk dream-api app)
   ↓
2. Frontend calls: POST /generate-platform-id
   ↓
3. Backend generates: plt_abc123
   ↓
4. Saves to front-auth-api TOKENS_KV:
   - user:{userId}:platformId → plt_abc123
   - platform:{platformId}:userId → userId
```

**WHY THIS EARLY?** Because platformId is needed for Stripe OAuth callback (next step).

---

### **PHASE 2: Payment → Plan Upgraded**
```
1. Dev clicks "Subscribe" → Stripe checkout
   ↓
2. Dev pays $15/mo → Stripe webhook fires
   ↓
3. front-auth-api/webhook/stripe updates Clerk:
   - publicMetadata.plan = "paid"
   ↓
4. Dashboard now shows "Connect Stripe" button
```

---

### **PHASE 3: OAuth → Stripe Token Saved**
```
1. Dev clicks "Connect Stripe Account"
   ↓
2. oauth-api/authorize?userId={userId}
   - Generates random state (CSRF protection)
   - Saves: oauth:state:{state} → userId
   - Redirects to Stripe Connect
   ↓
3. Dev authorizes on Stripe
   ↓
4. Stripe redirects: oauth-api/callback?code={code}&state={state}
   ↓
5. Backend:
   - Validates state → retrieves userId
   - Reads platformId: user:{userId}:platformId
   - Exchanges code for Stripe access token
   - Saves to front-auth-api TOKENS_KV:
      * user:{userId}:stripeToken → {accessToken, stripeUserId}
      * platform:{platformId}:stripeToken → {accessToken, stripeUserId}
   ↓
6. Redirects: /api-tier-config?stripe=connected
```

**WHY SAVE TWICE?** Because product creation needs to look up by platformId, and we have platformId but not userId in that context.

---

### **PHASE 4: Tier Config → Products Created → Keys Generated**
```
1. Dev configures tiers on /api-tier-config:
   - Free: $0/mo, 100 req/mo
   - Pro: $29/mo, 10,000 req/mo
   - Enterprise: $99/mo, unlimited
   ↓
2. Frontend submits: POST /create-products
   Body: {userId, tiers: [...]}
   ↓
3. oauth-api/create-products:
   a) Reads platformId: user:{userId}:platformId → plt_abc123

   b) Reads Stripe token: platform:{platformId}:stripeToken

   c) Creates Stripe products on THEIR account (uses access token):
      - Product: "Pro Plan"
        Metadata: {platformId, tierName: "pro", limit: 10000}
      - Price: $29/mo
        Metadata: {platformId, tierName: "pro", limit: 10000}

   d) Generates keys:
      - publishableKey = pk_live_xyz789
      - secretKey = sk_live_abc123def456
      - hashHex = SHA256(secretKey)

   e) Saves to front-auth-api TOKENS_KV:
      - user:{userId}:publishableKey → pk_live_xyz789
      - user:{userId}:secretKey → sk_live_abc123
      - user:{userId}:products → [{tier, priceId, productId}]
      - publishablekey:{pk_live_xyz}:platformId → plt_abc123
      - secretkey:{hashHex}:publishableKey → pk_live_xyz789

   f) Copies to api-multi TOKENS_KV (for fast tier lookups):
      - platform:{platformId}:tierConfig → {tiers: [{name, limit, priceId, productId}]}
      - publishablekey:{pk_live_xyz}:platformId → plt_abc123
      - secretkey:{hashHex}:publishableKey → pk_live_xyz789

   g) Updates Clerk metadata (dream-api app):
      - publicMetadata.publishableKey = pk_live_xyz789
   ↓
4. Redirects to: /credentials
   ↓
5. Frontend displays:
   - publishableKey (safe to expose)
   - secretKey (server-only - ONE TIME SHOW)
   - Stripe price IDs (for creating checkouts)
   - Platform ID (internal reference)
```

**CRITICAL:** This is the ONLY time you see the plaintext secretKey. After this, it's hashed in KV.

---

### **PHASE 5: Developer Integrates API**
```
Dev's backend calls api-multi:

POST /customers
Authorization: Bearer sk_live_abc123
Body: {email, name, plan: "free"}
   ↓
api-multi:
1. Hash secretKey → lookup publishableKey
2. Lookup platformId from publishableKey
3. Create user in end-user-api Clerk app
4. Set metadata: publicMetadata.publishableKey = pk_live_xyz789
5. Track usage in USAGE_KV
6. Return customer object
```

---

### **PHASE 6: End-User Gets JWT**
```
End-user logs into dev's app:
   ↓
Clerk (end-user-api) issues JWT:
{
  "publishableKey": "pk_live_xyz789"
}
   ↓
This JWT is used to:
- Query dashboard (filtered by publishableKey)
- Track usage (scoped to publishableKey)
- Enforce tier limits (from tierConfig)
```

**THE MAGIC:** All end-users share ONE Clerk app, but are isolated by publishableKey in their JWT.

---

## 🗄️ KV NAMESPACE MAPPINGS (WHERE EVERYTHING LIVES)

### **front-auth-api TOKENS_KV** - `d09d8bf4e63a47c495384e9ed9b4ec7e`
**Purpose:** MAIN storage - ALL data about YOUR developers

```
# Platform ID mappings (created at login)
user:{userId}:platformId → plt_abc123
platform:{platformId}:userId → userId

# Stripe OAuth (created after OAuth)
user:{userId}:stripeToken → {accessToken, stripeUserId}
platform:{platformId}:stripeToken → {accessToken, stripeUserId}

# API Keys (created after tier config)
user:{userId}:publishableKey → pk_live_xyz789
user:{userId}:secretKey → sk_live_abc123  # PLAINTEXT!
user:{userId}:products → [{tier, priceId, productId}]

# Reverse lookups (created after tier config)
publishablekey:{pk_live_xyz}:platformId → plt_abc123
secretkey:{sha256hash}:publishableKey → pk_live_xyz789
```

### **front-auth-api USAGE_KV** - `6a3c39a8ee9b46859dc237136048df25`
**Purpose:** Track YOUR developers' usage (how many API calls they make to YOUR platform)

```
usage:{userId} → {usageCount, plan, lastUpdated, periodStart, periodEnd}
ratelimit:{userId}:{minute} → count
```

### **api-multi TOKENS_KV** - `a9f3331b0c8b48d58c32896482484208`
**Purpose:** Fast tier limit lookups for end-user API calls

```
# Tier configuration (copied from front-auth-api)
platform:{platformId}:tierConfig → {tiers: [{name, limit, priceId, productId, price, features}]}

# Reverse lookups (copied from front-auth-api)
publishablekey:{pk_live_xyz}:platformId → plt_abc123
secretkey:{sha256hash}:publishableKey → pk_live_xyz789
```

**WHY DUPLICATE DATA?** Because api-multi needs to look up tier limits FAST. KV lookups are 50-100ms globally. Copying data to api-multi namespace means we don't have to query front-auth-api namespace.

### **api-multi USAGE_KV** - `10cc8b9f46f54a6e8d89448f978aaa1f`
**Purpose:** Track THEIR end-users' usage

```
usage:{publishableKey}:{userId} → {usageCount, plan, lastUpdated}
ratelimit:{userId}:{minute} → count
```

---

## 🎯 JWT TEMPLATES (CRITICAL!)

### **dream-api (YOUR developers) - Clerk App #1**
Template name: `dream-api`

```json
{
  "plan": "{{user.public_metadata.plan}}"
}
```

**What's in publicMetadata:**
- `plan`: "free" or "paid" (updated by Stripe webhook)
- `publishableKey`: pk_live_xyz789 (updated after tier config)

**What goes in JWT:**
- ONLY `plan` (not publishableKey!)
- Why? Because developers don't need publishableKey to use YOUR platform

---

### **end-user-api (THEIR customers) - Clerk App #2 - SHARED APP**
Template name: `end-user-api` (or whatever you name it)

```json
{
  "publishableKey": "{{user.public_metadata.publishableKey}}"
}
```

**What's in publicMetadata:**
- `publishableKey`: pk_live_xyz789 (set when dev creates customer)
- `plan`: "free" / "pro" / "enterprise" (updated by Stripe webhook)

**What goes in JWT:**
- ONLY `publishableKey` (not plan!)
- Why? Because api-multi needs to know which developer owns this user

**CRITICAL CONCEPT:** This is a SHARED Clerk app. One big pool of users from ALL developers. publishableKey in JWT is how you filter them.

---

## 🏗️ ARCHITECTURE DECISIONS (WHY WE BUILT IT THIS WAY)

### **Q: Why separate platformId and publishableKey?**

**A:** Key rotation and multi-environment support.

**Without platformId:**
```
Developer has: pk_live_prod123
Wants to rotate keys for security
→ Generate new: pk_live_prod456
→ Update ALL customer metadata: publishableKey = pk_live_prod456
→ Update ALL D1 records: publishable_key = pk_live_prod456
→ NIGHTMARE! Thousands of updates, data migration, downtime
```

**With platformId:**
```
Developer has: plt_abc123 (stable ID)
  ↳ pk_live_prod123 (current prod key)

Wants to rotate keys:
→ Generate new: pk_live_prod456
→ Link to SAME platformId: plt_abc123
→ Customer data UNCHANGED (still linked to plt_abc123)
→ Just update: publishablekey:{pk_live_prod456}:platformId → plt_abc123
→ DONE! No data migration needed.
```

---

### **Q: Why only publishableKey in end-user JWT (not plan)?**

**A:** Separation of concerns.

**The Flow:**
1. End-user signs up (free plan)
2. Developer creates user in end-user-api: `publicMetadata.publishableKey = pk_live_xyz`
3. End-user JWT has: `{"publishableKey": "pk_live_xyz"}`
4. When end-user upgrades to Pro:
   - Developer calls: POST /checkout (with tier: "pro")
   - Stripe checkout redirects to dev's success URL
   - Stripe webhook updates: `publicMetadata.plan = "pro"`
5. End-user JWT now has SAME publishableKey, but metadata has new plan

**Why not put plan in JWT?**
- JWT only refreshes on re-login or token expiry
- Metadata can be updated immediately via Clerk API
- Developer can query Clerk API to get current plan without waiting for JWT refresh

---

### **Q: Why D1 database (not just KV)?**

**A:** KV is fast but not queryable.

**What KV is good for:**
- Fast key-value lookups (50-100ms globally)
- Usage tracking (increment counters)
- Tier limit checks (read config, check count)

**What KV is BAD for:**
- "Show me all customers on Pro plan" → Can't filter
- "Show me revenue by month" → Can't aggregate
- "Export CSV of all customers" → Can't iterate efficiently

**Solution: Dual-write strategy**
- Write to KV (fast runtime lookups)
- Write to D1 (queryable analytics)
- Dashboard queries D1, API uses KV

---

### **Q: Why copy tierConfig to api-multi namespace?**

**A:** Performance. Every API call to api-multi needs to check tier limits.

**Without duplication:**
```
1. API call: POST /customers
2. Hash secretKey → pk_live_xyz789
3. Lookup platformId from front-auth-api TOKENS_KV (cross-namespace query)
4. Lookup tierConfig from front-auth-api TOKENS_KV
5. Enforce limit
→ 2 cross-namespace queries PER API CALL
```

**With duplication:**
```
1. API call: POST /customers
2. Hash secretKey → pk_live_xyz789
3. Lookup platformId from api-multi TOKENS_KV (same namespace)
4. Lookup tierConfig from api-multi TOKENS_KV (same namespace)
5. Enforce limit
→ 0 cross-namespace queries
```

**Trade-off:**
- More storage (negligible - KV is cheap)
- Data sync risk (if tier config changes, need to update both)
- MUCH faster API responses (20-30ms saved per call)

---

## 🚧 CURRENT STATUS (Dec 5, 2025 - Evening Session)

### ✅ COMPLETED TODAY:
1. ✅ Generated platformId IMMEDIATELY after login (before payment)
2. ✅ Created /credentials page to display keys + price IDs
3. ✅ Fixed KV lookup paths (user:{userId}:* instead of platform:{platformId}:*)
4. ✅ Added tier limits to Stripe product/price metadata
5. ✅ Added dual-save for Stripe tokens (user + platform keys)
6. ✅ Updated /get-credentials to return products array
7. ✅ Cleaned up all test data from KV
8. ✅ Removed console.log security risks

### 🎯 READY TO TEST:
- Full signup flow: signup → payment → OAuth → tier config → credentials
- Tier limits are saved to:
  - ✅ Stripe product metadata
  - ✅ Stripe price metadata
  - ✅ api-multi TOKENS_KV (platform:{platformId}:tierConfig)

### 📋 TODO TOMORROW:
1. 🔲 Test full signup flow with fresh account
2. 🔲 Verify tier limits appear in KV after tier config
3. 🔲 Test JWT contains publishableKey (end-user-api)
4. 🔲 Build api-multi endpoints:
   - POST /customers (create user in end-user-api)
   - POST /checkout (create Stripe checkout on dev's account)
5. 🔲 Setup D1 database (customers table)
6. 🔲 Build dashboard UI (customer list, MRR, analytics)

---

## 🧪 LOCAL DEVELOPMENT

### **Start All Services:**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev  # :5173

# Terminal 2: Platform API
cd front-auth-api && npm run dev  # :8788

# Terminal 3: OAuth API
cd oauth-api && npm run dev  # :8789

# Terminal 4: Multi-tenant API (not used yet)
cd api-multi && npm run dev  # :8787
```

### **Environment Variables:**

**front-auth-api/.dev.vars:**
```bash
CLERK_SECRET_KEY=sk_test_...              # dream-api Clerk app
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...            # For Stripe webhook verification
STRIPE_SECRET_KEY=sk_test_...             # YOUR Stripe account
STRIPE_PRICE_ID=price_...                 # $15/mo subscription product
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

**oauth-api/.dev.vars:**
```bash
STRIPE_CLIENT_ID=ca_...                   # Stripe Connect app
STRIPE_CLIENT_SECRET=sk_test_...          # NOT rk_... (restricted key)
CLERK_SECRET_KEY=sk_test_...              # dream-api app (for updating metadata)
CLERK_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
```

**api-multi/.dev.vars:**
```bash
CLERK_SECRET_KEY=sk_test_...              # end-user-api Clerk app
CLERK_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:5173
```

---

## 🧠 DIFFICULT CONCEPTS (RE-READ IF CONFUSED)

### **Concept 1: Why TWO Clerk apps?**

**WRONG MENTAL MODEL:**
"One Clerk app per developer. Developer A has app A, Developer B has app B."

**CORRECT MENTAL MODEL:**
```
YOUR PLATFORM:
  - dream-api Clerk app (YOUR developers who pay YOU)
    └── user_dev1, user_dev2, user_dev3

SHARED END-USER APP:
  - end-user-api Clerk app (ALL developers' customers in ONE app)
    ├── user_cust1 (publishableKey: pk_live_devA)
    ├── user_cust2 (publishableKey: pk_live_devA)
    ├── user_cust3 (publishableKey: pk_live_devB)
    └── user_cust4 (publishableKey: pk_live_devB)
```

**Why this way?**
- Only need to maintain ONE Clerk app for all end-users
- Data isolation via JWT claim (publishableKey)
- No Clerk app creation/deletion complexity

---

### **Concept 2: When is publishableKey empty?**

**Timeline:**
```
1. Dev signs up → JWT has: {"plan": "free"}
   publishableKey: undefined (not created yet)

2. Dev pays $15/mo → JWT has: {"plan": "paid"}
   publishableKey: undefined (still not created)

3. Dev connects Stripe → JWT has: {"plan": "paid"}
   publishableKey: undefined (still not created)

4. Dev configures tiers → oauth-api generates keys
   → Clerk metadata updated: publicMetadata.publishableKey = pk_live_xyz
   → JWT STILL has: {"plan": "paid"}
   publishableKey: undefined (JWT not refreshed yet!)

5. Dev logs out and back in → JWT refreshed
   → JWT now has: {"plan": "paid"}
   → Still no publishableKey in JWT (because it's NOT in the JWT template!)
```

**IMPORTANT:** dream-api JWT does NOT include publishableKey! Only end-user-api JWT does.

---

### **Concept 3: Tier configs in TWO namespaces**

**Stripe Product/Price:**
```json
{
  "id": "price_abc123",
  "product": "prod_xyz789",
  "unit_amount": 2900,
  "metadata": {
    "platformId": "plt_abc123",
    "tierName": "pro",
    "limit": "10000"
  }
}
```

**front-auth-api TOKENS_KV:**
```javascript
user:{userId}:products → [
  {tier: "free", priceId: "price_free123", productId: "prod_free456"},
  {tier: "pro", priceId: "price_pro789", productId: "prod_pro012"}
]
```

**api-multi TOKENS_KV:**
```javascript
platform:{platformId}:tierConfig → {
  tiers: [
    {name: "free", limit: 100, price: 0, priceId: "price_free123", productId: "prod_free456", features: "..."},
    {name: "pro", limit: 10000, price: 29, priceId: "price_pro789", productId: "prod_pro012", features: "..."}
  ]
}
```

**Why three places?**
- Stripe: Source of truth for billing
- front-auth-api: Developer's view (what products they created)
- api-multi: Fast tier limit enforcement (no cross-namespace queries)

---

### **Concept 4: Free tier - $0 or no Stripe product?**

**QUESTION:** "Do we create a Stripe product for the free tier?"

**ANSWER:** YES! Here's why:

**Scenario:**
1. End-user signs up on free plan (100 req/mo)
2. Developer calls: POST /customers with plan: "free"
3. api-multi sets: publicMetadata.plan = "free"
4. End-user uses app (tracked in usage:{publishableKey}:{userId})
5. End-user hits 100 req/mo limit
6. Developer wants to upgrade: POST /checkout with tier: "pro"
7. **WHERE DO WE GET THE PRICE ID?**

**With free tier product:**
```javascript
platform:{platformId}:tierConfig → {
  tiers: [
    {name: "free", limit: 100, price: 0, priceId: null},
    {name: "pro", limit: 10000, price: 29, priceId: "price_pro789"}
  ]
}

// Checkout creation
const tier = tierConfig.tiers.find(t => t.name === "pro");
stripe.checkout.sessions.create({
  line_items: [{price: tier.priceId, quantity: 1}]
});
```

**Without free tier product:**
```javascript
// HOW DO YOU KNOW WHAT PLANS EXIST???
// Developer has to hardcode plan names???
// NO BUENO.
```

**ALSO:** Free tier has a $0 price in Stripe, but you still create a "product" so:
- Developer can see it in their Stripe dashboard
- Metadata includes tier limits (for reference)
- Consistent structure (all tiers have productId + priceId)

**EXCEPTION:** If free tier truly has NO Stripe product, then priceId is `null` and we skip Stripe checkout. But we still save the tier config to KV!

---

---

## 🚧 CURRENT STATUS (Dec 6, 2025 - Late Night Session)

### ✅ COMPLETED:
1. **Full signup → credentials flow WORKS**
   - Signup → payment → Stripe Connect OAuth → tier config
   - Products created on dev's Stripe account
   - publishableKey + secretKey generated
   - Keys saved to KV (verified in Cloudflare dashboard)
   - Credentials page displays keys correctly

2. **Test credentials generated:**
   ```
   publishableKey: pk_live_[REDACTED]
   secretKey: sk_live_[REDACTED]
   platformId: plt_[REDACTED]
   ```

3. **KV structure verified:**
   - front-auth-api TOKENS_KV has all user keys ✅
   - api-multi TOKENS_KV should have copies (NOT VERIFIED YET)

### ❌ BLOCKING ISSUE:
**API call fails with "Invalid API key"**

**Problem:** oauth-api saves keys to TWO namespaces:
- PLATFORM_TOKENS_KV (front-auth-api) - CONFIRMED working
- CUSTOMER_TOKENS_KV (api-multi) - NOT VERIFIED

**Test curl that's failing:**
```bash
curl -X POST http://localhost:8787/api/data \
  -H 'Authorization: Bearer YOUR_SECRET_KEY' \
  -H 'X-User-Id: test_user_123' \
  -H 'X-User-Plan: free' \
  -H 'Content-Type: application/json'
```

**Error:** `{"error":"Invalid API key","message":"API key not found or expired"}`

**Root cause:** api-multi looks up `secretkey:{hash}:publishableKey` in its TOKENS_KV namespace, but the key might not exist there.

### 🔍 NEXT STEPS (Tomorrow):

1. **Verify api-multi KV namespace** (`a9f3331b0c8b48d58c32896482484208`)
   - Check if `secretkey:e92f843d2b35ef9d63b7be19a3529a2b615c07f045ae404a4616db629163ca3e:publishableKey` exists
   - Check if `publishablekey:pk_live_0a989c5299c14ba9af0a33a42ea39c81:platformId` exists
   - Check if `platform:plt_d221455be7e14342a380e35e1c00d40d:tierConfig` exists

2. **If keys missing:** oauth-api didn't write to CUSTOMER_TOKENS_KV
   - Check oauth-api logs during product creation
   - Verify CUSTOMER_TOKENS_KV binding in oauth-api wrangler.toml
   - Re-run product creation and watch for writes

3. **If keys exist:** api-multi can't read them
   - Check TOKENS_KV binding in api-multi wrangler.toml
   - Verify namespace IDs match
   - Add debug logging to api-multi/src/middleware/apiKey.ts

4. **Once API call works:**
   - Build Clerk webhook (end-user-api → D1)
   - Build Stripe webhook (subscription updates → D1)
   - Create D1 schema
   - Build dashboard API (GET /customers)
   - Test full end-to-end flow

### 📝 KEY FILES MODIFIED TODAY:
- `frontend/src/main.tsx` - Removed hardcoded Clerk key
- `api-multi/src/middleware/apiKey.ts` - Updated to use secretkey/publishablekey lookups

### 🎯 WHAT THIS PROVES:
The core architecture works. We can:
- Generate credentials via oauth-api ✅
- Save to KV namespaces ✅
- Display to developers ✅

Just need to fix the KV namespace bridge between oauth-api and api-multi.

---

*Last updated: Dec 6, 2025 - API testing in progress. Keys generated, verifying KV replication next.*
