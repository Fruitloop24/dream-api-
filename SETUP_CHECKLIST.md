# Dream-API Setup Checklist

**Last Updated:** 2025-12-05 (Evening Session Complete)

---

## ✅ **COMPLETED TODAY (Dec 5):**

### 1. **Platform ID Generation**
- ✅ platformId generated IMMEDIATELY after login (before payment)
- ✅ Endpoint: POST /generate-platform-id (front-auth-api)
- ✅ Saved to KV: `user:{userId}:platformId → plt_abc123`
- ✅ Bidirectional mapping: `platform:{platformId}:userId → userId`

### 2. **Credential Generation Flow**
- ✅ Stripe OAuth saves token to BOTH keys:
  - `user:{userId}:stripeToken`
  - `platform:{platformId}:stripeToken`
- ✅ Product creation generates publishableKey + secretKey
- ✅ Keys saved to front-auth-api TOKENS_KV:
  - `user:{userId}:publishableKey → pk_live_xyz789`
  - `user:{userId}:secretKey → sk_live_abc123`
  - `user:{userId}:products → [{tier, priceId, productId}]`
- ✅ Reverse lookups created:
  - `publishablekey:{pk_live_xyz}:platformId → plt_abc123`
  - `secretkey:{hash}:publishableKey → pk_live_xyz789`

### 3. **Tier Configuration**
- ✅ Tier limits saved to Stripe product metadata
- ✅ Tier limits saved to Stripe price metadata
- ✅ Tier config copied to api-multi TOKENS_KV:
  - `platform:{platformId}:tierConfig → {tiers: [...]}`
  - Each tier includes: name, limit, price, priceId, productId, features

### 4. **Frontend Updates**
- ✅ Created `/credentials` page
- ✅ Displays publishableKey, secretKey, and price IDs
- ✅ ApiTierConfig redirects to `/credentials` after success
- ✅ Added products array to /get-credentials endpoint
- ✅ Clean UX flow: login → pay → OAuth → tier config → credentials

### 5. **Security Fixes**
- ✅ Removed console.log statements exposing Clerk keys
- ✅ Fixed Quick Start code examples (use placeholders, not real keys)
- ✅ Fixed KV lookup paths (user:{userId}:* instead of platform:{platformId}:*)

### 6. **Data Cleanup**
- ✅ Deleted all test data from KV namespaces
- ✅ Verified KV is clean and ready for fresh testing

---

## 🎯 **READY TO TEST:**

### **Full Signup Flow:**
```
1. Sign up (Clerk dream-api)
   → Frontend calls: POST /generate-platform-id
   → Backend generates: platformId = plt_abc123
   ↓
2. Pay $15/mo (Stripe checkout)
   → Stripe webhook updates plan: 'paid'
   ↓
3. Connect Stripe (OAuth)
   → OAuth reads platformId from KV
   → Saves Stripe token to both user and platform keys
   ↓
4. Configure tiers (/api-tier-config)
   → Free: $0, 100 req/mo
   → Pro: $29, 10k req/mo
   → Enterprise: $99, unlimited
   ↓
5. Submit to /create-products
   → Creates Stripe products on THEIR account
   → Generates publishableKey + secretKey
   → Saves to front-auth-api TOKENS_KV
   → Copies tier config to api-multi TOKENS_KV
   ↓
6. Redirect to /credentials
   → Displays publishableKey, secretKey, price IDs
   → Dev copies credentials
```

### **Verification Steps:**
```bash
# 1. Check platformId was created
npx wrangler kv key list --namespace-id=d09d8bf4e63a47c495384e9ed9b4ec7e | grep platformId

# 2. Check tier config was copied to api-multi
npx wrangler kv key get "platform:plt_XXX:tierConfig" --namespace-id=a9f3331b0c8b48d58c32896482484208

# 3. Verify tier limits are in the config
# Should see: {tiers: [{name: "free", limit: 100, ...}, {name: "pro", limit: 10000, ...}]}
```

---

## 📋 **TODO TOMORROW:**

### 1. **Test Complete Flow**
- 🔲 Fresh signup with new account
- 🔲 Verify platformId generated immediately
- 🔲 Complete payment ($15/mo test card)
- 🔲 Connect Stripe via OAuth
- 🔲 Configure tiers and create products
- 🔲 Verify credentials page shows all keys + price IDs
- 🔲 Verify tier limits saved to KV

### 2. **Update End-User-API JWT Template**
Go to Clerk Dashboard → end-user-api app → JWT Templates

**Change to:**
```json
{
  "publishableKey": "{{user.public_metadata.publishableKey}}"
}
```

**Why?**
- publishableKey isolates customers between different devs
- platformId is internal - NEVER goes in JWT
- When dev creates customer via api-multi, we set: `publicMetadata.publishableKey = pk_live_xyz`

### 3. **Build api-multi Endpoints**
- 🔲 POST /customers (create user in end-user-api Clerk app)
- 🔲 POST /checkout (create Stripe checkout on dev's account)
- 🔲 Implement usage tracking and tier enforcement
- 🔲 Test with generated secretKey

### 4. **Setup D1 Database**
- 🔲 Create customers table
- 🔲 Setup Clerk webhook (end-user-api → D1)
- 🔲 Setup Stripe webhook (write to D1)
- 🔲 Build dashboard queries

### 5. **Build Dashboard UI**
- 🔲 Customer list (filtered by publishableKey)
- 🔲 Analytics (MRR, active users, churn)
- 🔲 CSV export functionality

---

## 🗄️ **KV DATA STRUCTURE (FINAL)**

### **front-auth-api TOKENS_KV** - `d09d8bf4e63a47c495384e9ed9b4ec7e`
```
# Platform ID mappings (created at login)
user:{userId}:platformId → plt_abc123
platform:{platformId}:userId → userId

# Stripe OAuth (created after OAuth)
user:{userId}:stripeToken → {accessToken, stripeUserId}
platform:{platformId}:stripeToken → {accessToken, stripeUserId}

# API Keys (created after tier config)
user:{userId}:publishableKey → pk_live_xyz789
user:{userId}:secretKey → sk_live_abc123  # PLAINTEXT for dev to copy
user:{userId}:products → [{tier, priceId, productId}]

# Reverse lookups (created after tier config)
publishablekey:{pk_live_xyz}:platformId → plt_abc123
secretkey:{sha256hash}:publishableKey → pk_live_xyz789
```

### **api-multi TOKENS_KV** - `a9f3331b0c8b48d58c32896482484208`
```
# Tier configuration (copied from front-auth-api)
platform:{platformId}:tierConfig → {
  tiers: [
    {name: "free", limit: 100, price: 0, priceId: "price_xxx", productId: "prod_xxx", features: "..."},
    {name: "pro", limit: 10000, price: 29, priceId: "price_yyy", productId: "prod_yyy", features: "..."}
  ]
}

# Reverse lookups (copied from front-auth-api)
publishablekey:{pk_live_xyz}:platformId → plt_abc123
secretkey:{sha256hash}:publishableKey → pk_live_xyz789
```

**Why duplicate data?**
- api-multi needs to look up tier limits FAST
- No cross-namespace queries = 20-30ms saved per API call
- KV storage is cheap, latency is expensive

---

## 🔐 **SECURITY CHECKLIST:**

- ✅ platformId is internal - NEVER exposed to frontend or JWT
- ✅ publishableKey is safe to expose (like Stripe's pk_live_)
- ✅ secretKey is server-only (like Stripe's sk_live_)
- ✅ secretKey is SHA-256 hashed in KV (except user:{userId}:secretKey for display)
- ✅ Stripe tokens stored securely in KV
- ✅ All secrets use wrangler secret (not committed to git)
- ✅ No console.log statements exposing keys
- ✅ Code examples use placeholders, not real keys

---

## 📝 **PRODUCTION DEPLOYMENT CHECKLIST:**

### **Workers Deployed:**
- ✅ front-auth-api: `https://config-api.k-c-sheffield012376.workers.dev`
- ✅ oauth-api: `https://oauth-api.k-c-sheffield012376.workers.dev`
- 🔲 api-multi: (not deployed yet)

### **KV Namespaces Bound:**
- ✅ front-auth-api TOKENS_KV: `d09d8bf4e63a47c495384e9ed9b4ec7e`
- ✅ front-auth-api USAGE_KV: `6a3c39a8ee9b46859dc237136048df25`
- ✅ api-multi TOKENS_KV: `a9f3331b0c8b48d58c32896482484208`
- ✅ api-multi USAGE_KV: `10cc8b9f46f54a6e8d89448f978aaa1f`

### **Secrets Configured:**

**oauth-api:**
```bash
npx wrangler secret put STRIPE_CLIENT_ID          # ca_...
npx wrangler secret put STRIPE_CLIENT_SECRET      # sk_test_... (NOT rk_...)
npx wrangler secret put CLERK_SECRET_KEY          # dream-api app
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put FRONTEND_URL              # Production frontend URL
```

**front-auth-api:**
```bash
npx wrangler secret put CLERK_SECRET_KEY          # dream-api app
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put STRIPE_SECRET_KEY         # YOUR Stripe account
npx wrangler secret put STRIPE_PRICE_ID           # $15/mo product
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put FRONTEND_URL
```

**api-multi** (when ready):
```bash
npx wrangler secret put CLERK_SECRET_KEY          # end-user-api app
npx wrangler secret put CLERK_PUBLISHABLE_KEY     # pk_test_Y29tcG9zZWQtYmxvd2Zpc2gtNzYuY2xlcmsuYWNjb3VudHMuZGV2JA
npx wrangler secret put FRONTEND_URL
```

---

## 🧠 **KEY CONCEPTS TO REMEMBER:**

### **The Key System:**
```
platformId: plt_abc123 (internal, stable, NEVER changes)
    ↓
    ├── publishableKey #1 (production) → pk_live_prod123
    │   └── secretKey #1 → sk_live_prod456
    ├── publishableKey #2 (staging) → pk_live_staging789
    │   └── secretKey #2 → sk_live_staging012
    └── publishableKey #3 (test) → pk_live_test345
        └── secretKey #3 → sk_live_test678
```

**Why?**
- Developer can have MULTIPLE keys for different environments
- All keys link to SAME platformId
- Allows key rotation without losing customer data
- Can query ALL customers by platformId (regardless of which key was used)

### **The Two Clerk Apps:**
1. **dream-api** - YOUR developers (who pay YOU $15/mo)
2. **end-user-api** - THEIR customers (who pay THEM)

**The Magic:**
- All end-users from ALL developers share ONE Clerk app (end-user-api)
- Data isolation via JWT claim: `publishableKey`
- Dashboard queries: `WHERE publishable_key = 'pk_live_xyz789'`

### **Tier Config in Three Places:**
1. **Stripe metadata** - Source of truth for billing
2. **front-auth-api KV** - Developer's view (what products they created)
3. **api-multi KV** - Fast tier limit enforcement (no cross-namespace queries)

---

## 🚀 **YOU'RE HERE NOW:**

**What's Working:**
- ✅ Signup → platformId generation
- ✅ Payment → plan upgrade
- ✅ OAuth → Stripe token saved
- ✅ Tier config → products created on dev's Stripe
- ✅ Credential generation → publishableKey + secretKey
- ✅ Credentials page → displays everything dev needs

**What's Next:**
- 🎯 Test the complete flow (most important!)
- 🎯 Build api-multi endpoints (customer creation, checkout)
- 🎯 Setup D1 database (dashboard data)
- 🎯 Build dashboard UI (customer list, analytics)

**You're 80% done with the core flow!** 🔥

---

## 📚 **DOCUMENTATION:**

- **CLAUDE.md** - Detailed session notes, difficult concepts, mental models
- **README.md** - High-level architecture, tech stack, key insights
- **SETUP_CHECKLIST.md** - This file (current state, next steps, verification)

---

*Last updated: Dec 5, 2025 - Evening session. KV cleaned, credentials working, ready to test.*
