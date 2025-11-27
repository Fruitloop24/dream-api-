# dream-api

**API-as-a-Service platform**: Auth + Billing + Usage Tracking in 5 lines of code.

> "Don't trust me - trust Clerk, Stripe, and Cloudflare. I'm just the glue."

---

## 🎯 The Goal

Let indie developers add Clerk auth + Stripe billing + usage limits to their apps without building infrastructure.

**Success Metric:** 100 paying developers @ $29/mo = $2,900/mo MRR

---

## 🏗️ Architecture

### Three Services:

1. **frontend/** - React dashboard (Vite + Clerk + Tailwind)
   - Developer signs up
   - Configures tiers & pricing
   - Gets preview link
   - Connects Stripe (OAuth)

2. **front-auth-api/** - Platform auth & payment (Cloudflare Worker)
   - **YOUR developers** pay YOU
   - Usage tracking: Free (5 calls/month), Paid (500 calls/month)
   - Credential generation (platformId + API key)
   - Stripe webhook integration

3. **api-multi/** - Multi-tenant usage API (Cloudflare Worker)
   - **Customer's end-users** hit this
   - Preview mode (YOUR Stripe) OR Production mode (THEIR Stripe)
   - Per-tenant tier configuration
   - Usage tracking with limits

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account
- Clerk account
- Stripe account

### Local Development

```bash
# 1. Clone repo
git clone https://github.com/yourusername/dream-api
cd dream-api

# 2. Install dependencies
cd front-auth-api && npm install
cd ../frontend && npm install
cd ../api-multi && npm install

# 3. Set up environment variables
# Copy .dev.vars.example to .dev.vars in each worker
# Copy .env.example to .env in frontend
# Fill in your Clerk and Stripe keys

# 4. Start services
cd front-auth-api && npm run dev  # Port 8788
cd frontend && npm run dev         # Port 5173
cd api-multi && npm run dev        # Port 8787
```

---

## 📊 Current Status

### ✅ What Works (2025-11-26)

- **front-auth-api:**
  - ✅ Clerk JWT verification
  - ✅ Usage tracking (free: 5 calls, paid: 500 calls)
  - ✅ Monthly billing period resets
  - ✅ Rate limiting (100 req/min)
  - ✅ Stripe checkout ($29/mo)
  - ✅ Webhook handler (upgrades plan)
  - ✅ Credential generation

- **api-multi:**
  - ✅ Multi-tenant usage tracking
  - ✅ Tier configuration per platform
  - ✅ Stripe checkout/webhooks/portal
  - ✅ Monthly resets
  - ✅ Rate limiting

- **frontend:**
  - ✅ Landing page
  - ✅ Authentication (Clerk)
  - ✅ Basic dashboard
  - ⚠️ Needs tier config UI
  - ⚠️ Needs usage stats display
  - ⚠️ Needs preview link generation

### 🔨 What's Next

1. **Dashboard improvements** (frontend)
   - Show usage stats (X/5 calls this month)
   - Tier configuration UI
   - Preview link generation
   - Stripe OAuth button

2. **Preview mode** (api-multi)
   - Use YOUR Stripe for free tier previews
   - Watermark responses
   - Limit to 100 end-users in preview

3. **Production mode** (api-multi)
   - Stripe OAuth integration
   - Use customer's Stripe keys
   - Remove watermarks

4. **Deployment**
   - Deploy workers to Cloudflare
   - Deploy frontend to Cloudflare Pages
   - Set up custom domain

---

## 🔐 Environment Variables

### front-auth-api/.dev.vars
```bash
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

### frontend/.env
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_FRONT_AUTH_API_URL=http://localhost:8788
```

### api-multi/.dev.vars
```bash
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
CLERK_JWT_TEMPLATE=pan-api
```

---

## 📦 KV Namespaces

**4 separate namespaces for complete isolation:**

- `front-auth-api-USAGE_KV` - Developer usage tracking
- `front-auth-api-TOKENS_KV` - Developer credentials
- `api-multi-USAGE_KV` - End-user usage tracking
- `api-multi-TOKENS_KV` - Customer configs

---

## 🧪 Testing

```bash
# Test front-auth-api health
curl http://localhost:8788/health

# Sign up at http://localhost:5173
# Make API calls from browser console
const token = await window.Clerk.session.getToken();
const res = await fetch('http://localhost:8788/verify-auth', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log(await res.json());
```

---

## 📝 Documentation

- **CLAUDE.md** - Full development guide
- **IMPLEMENTATION_SUMMARY.md** - What was just built
- **KV_SETUP.md** - KV namespace details
- **STARTUP_GUIDE.md** - How to run locally

---

## 🤝 Contributing

This is a private project. Contact the owner for access.

---

## 📄 License

Proprietary - All rights reserved

---

*Last Updated: 2025-11-26*
*Status: MVP complete, ready for dashboard UI*
