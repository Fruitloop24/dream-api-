# dream-api

**Stripe + Auth + Customer Management as a Service**

$15/mo API that handles authentication, billing, and usage tracking for indie developers.

---

## 🎯 What It Does

Developers integrate 3 API endpoints and get:
- ✅ User authentication (Clerk under the hood)
- ✅ Stripe billing (checkout, subscriptions, portal)
- ✅ Usage tracking (tier limits, enforcement)
- ✅ Customer dashboard (see users, revenue, usage)
- ✅ Webhooks handled automatically

**Works for:** SaaS, courses, digital products, API monetization, paywalls

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
- Generate publishableKey + secretKey after payment

**oauth-api/** - Stripe Connect handler (Cloudflare Worker)
- Securely connects developer's Stripe account
- Auto-creates webhook endpoints
- Stores Stripe tokens in KV

**api-multi/** - Multi-tenant API (Cloudflare Worker)
- THEIR end-users authenticate here (Clerk end-user-api app)
- Usage tracking + tier enforcement
- Stripe checkout/portal for THEIR customers
- Webhooks populate D1 dashboard

---

## 🔑 The Key System

**publishableKey** (platformId) - `pk_live_abc123`
- Client-safe identifier (like Stripe's pk_)
- Used to tag end-users in metadata
- Given after $15/mo payment

**secretKey** (apiKey) - `sk_live_xyz789`
- Server-only authentication (like Stripe's sk_)
- Grants API access
- SHA-256 hashed in KV

---

## 💾 Data Storage

### **4 KV Namespaces:**

**TOKENS_KV (front-auth-api)** - `d09d8bf4e63a47c495384e9ed9b4ec7e`
- YOUR developers' credentials
- `user:{userId}:platformId`, `user:{userId}:apiKey`

**USAGE_KV (front-auth-api)** - `6a3c39a8ee9b46859dc237136048df25`
- YOUR developers' usage tracking

**CUSTOMER_TOKENS_KV (api-multi)** - `a9f3331b0c8b48d58c32896482484208`
- THEIR tier configs, Stripe tokens, webhook secrets
- `platform:{platformId}:stripe`, `platform:{platformId}:tierConfig`

**USAGE_KV (api-multi)** - `10cc8b9f46f54a6e8d89448f978aaa1f`
- THEIR end-users' usage tracking
- `usage:{platformId}:{userId}`

### **D1 Database:**

```sql
CREATE TABLE users (
  platform_id TEXT,           -- Which dev
  user_id TEXT,               -- Which end-user
  clerk_email TEXT,           -- From Clerk webhook
  clerk_name TEXT,
  plan TEXT,
  stripe_customer_id TEXT,    -- From Stripe webhook
  subscription_status TEXT,
  mrr REAL,
  usage_count INTEGER,
  last_active TIMESTAMP,
  created_at TIMESTAMP,
  PRIMARY KEY (platform_id, user_id)
);
```

**Purpose:** Dev dashboard queries (user lists, analytics, CSV export)

---

## 🔄 The Developer Flow

```
1. Sign up (Clerk dream-api)
2. Pay $15/mo (Stripe)
3. Connect Stripe (OAuth)
4. Configure tiers (free, pro, enterprise)
5. Get keys:
   - publishableKey: pk_live_abc123
   - secretKey: sk_live_xyz789
6. Integrate SDK
7. View dashboard (their users, usage, revenue)
```

---

## 🎯 JWT Templates (Both Clerk Apps)

**dream-api + end-user-api:**
```json
{
  "userId": "{{user.id}}",
  "platformId": "{{user.public_metadata.platformId}}",
  "plan": "{{user.public_metadata.plan}}"
}
```

**Dual auth:** YOUR devs in one Clerk app, THEIR users in another, but same JWT structure.

---

## 🪝 Webhook Strategy

### **Clerk Webhook** → `api-multi/webhook/clerk`
- Fires when end-user signs up
- Caches profile in KV
- Writes to D1 (if platformId in metadata)

### **Stripe Webhook** → `api-multi/webhook/stripe`
- Auto-created via Connect (oauth-api does this)
- ONE URL for ALL platforms
- Stripe sends `Stripe-Account: acct_xxx` header
- We lookup platformId, verify signature, write to D1

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

# Terminal 5: Stripe CLI (optional)
stripe listen --forward-to localhost:8788/webhook/stripe
```

---

## 📋 Environment Setup

### **front-auth-api/.dev.vars**
```bash
CLERK_SECRET_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...         # $15/mo for YOUR revenue
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

### **oauth-api/.dev.vars**
```bash
STRIPE_CLIENT_ID=ca_...
STRIPE_CLIENT_SECRET=sk_...
FRONTEND_URL=http://localhost:5173
```

### **api-multi/.dev.vars**
```bash
CLERK_SECRET_KEY=sk_test_...      # end-user-api Clerk app
STRIPE_SECRET_KEY=sk_test_...     # For testing (not used in prod)
FRONTEND_URL=http://localhost:5173
```

---

## 🎯 Current State

**✅ Built:**
- Multi-tenant API (usage tracking, checkout, portal)
- Platform auth + payment flow
- Stripe OAuth integration
- Tier configuration

**🚧 Building:**
- D1 dashboard integration
- Automated webhook setup
- Dev dashboard UI (Shadcn)
- SDK package

**📝 Next:**
- Remove preview pages
- Update JWT templates
- Clerk + Stripe webhooks → D1
- Dashboard with user list + CSV export

---

## 📦 Tech Stack

- **Frontend:** React + Vite + Clerk + Tailwind
- **Workers:** Cloudflare Workers (TypeScript)
- **Auth:** Clerk (2 apps: dream-api, end-user-api)
- **Storage:** KV (4 namespaces) + D1 (dashboard)
- **Payments:** Stripe + Stripe Connect
- **Deployment:** Wrangler + Cloudflare Pages

---

See **CLAUDE.md** for detailed session notes and architecture decisions.
