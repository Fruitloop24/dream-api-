# dream-api - Final Architecture

**Date:** 2025-11-26
**Status:** ✅ Correct separation, ready to build

---

## The Two Systems

### **System 1: YOUR Payment Platform**

**Purpose:** Customers sign up, pay YOU, configure their API

**Stack:**
- `frontend/` - Marketing site + dashboard
- `front-auth-api/` - Auth for YOUR customers
- Uses **Clerk App #1** (YOUR app, separate from shared)

**Flow:**
1. Customer visits dream-api.com
2. Signs up (Clerk App #1)
3. Pays YOU $29/mo (YOUR Stripe)
4. JWT unlocks config page
5. Customer configures:
   - Pricing tiers
   - Connects their Stripe
   - Sets up products
6. You generate and give them:
   - `platformId` (plt_abc123)
   - `API key` (pk_live_xyz...)
   - Optionally: Clerk secret for shared app

**What's Stored in KV:**
```
apikey:{hash}                    → platformId
platform:{platformId}:stripe     → Their Stripe keys
platform:{platformId}:webhook    → Their webhook secret
user:{platformId}:tierConfig     → Their pricing tiers
```

---

### **System 2: The Multi-Tenant API**

**Purpose:** Track usage for customers' end-users

**Stack:**
- `api-multi/` - Usage tracking API
- Uses **API key authentication** (no Clerk needed here!)

**Flow:**
1. Customer's end-user logs into THEIR app (their auth, not yours)
2. Customer's backend calls your API:
   ```
   POST https://api.dream-api.com/api/data
   Authorization: Bearer pk_live_xyz...
   X-User-Id: user_123
   X-User-Plan: free
   ```
3. You verify API key → get platformId
4. Track usage: `usage:{platformId}:{user_123}`
5. Enforce tier limits from their config
6. Return success

**Endpoints:**
```
POST /api/data              - Track usage
GET  /api/usage             - Check limits
POST /api/create-checkout   - Stripe checkout
POST /api/customer-portal   - Billing portal
POST /webhook/stripe        - Stripe webhooks
```

---

## Clean Separation

```
┌─────────────────────────────────────┐
│ YOUR PLATFORM (dream-api.com)      │
│                                     │
│ Customer signs up HERE:             │
│ - frontend/                         │
│ - front-auth-api/                   │
│ - Clerk App #1                      │
│ - YOUR Stripe                       │
│                                     │
│ Customer configures:                │
│ - Their tiers                       │
│ - Their Stripe keys                 │
│ - Gets: platformId + API key        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ THEIR APP                           │
│                                     │
│ Their end-users:                    │
│ - Use THEIR auth (Clerk/custom)     │
│ - Their backend calls YOUR API      │
│ - Sends: API key + userId + plan    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ api-multi/                          │
│                                     │
│ - Verifies API key                  │
│ - Tracks usage per platform         │
│ - Enforces tier limits              │
│ - Handles Stripe billing            │
│   (using customer's Stripe keys)    │
└─────────────────────────────────────┘
```

---

## Webhooks Strategy

**Multiple Stripe accounts → ONE webhook URL**

```
POST /webhook/stripe

Receives webhooks from ALL customers' Stripe accounts
Identifies which customer by payload data
Uses stored webhook secret per platform
```

**How it works:**
1. Customer connects Stripe on YOUR dashboard
2. You create webhook in THEIR Stripe account
3. Webhook URL points to: `https://api.dream-api.com/webhook/stripe`
4. When event fires:
   - Get customer ID from payload
   - Look up `platform:{platformId}:webhook` in KV
   - Verify signature with their secret
   - Process event (subscription created, etc.)
   - Update their tier config

---

## Example Usage

### Customer Setup (on YOUR dashboard):
```javascript
// After customer pays YOU and configures:

// You generate:
const platformId = "plt_abc123"
const apiKey = "pk_live_xyz789..."

// You store in KV:
await KV.put(`apikey:{hash}`, platformId)
await KV.put(`platform:plt_abc123:stripe`, JSON.stringify({
  secretKey: "sk_live_customer_stripe...",
  webhookSecret: "whsec_..."
}))
await KV.put(`user:plt_abc123:tierConfig`, JSON.stringify({
  tiers: [
    { id: "free", price: 0, limit: 100 },
    { id: "pro", price: 29, limit: 1000, stripePriceId: "price_..." }
  ]
}))

// You show customer:
// "Your API key: pk_live_xyz789..."
// "Your platform ID: plt_abc123"
```

### Customer Uses API (in THEIR app):
```javascript
// Their backend:
const response = await fetch('https://api.dream-api.com/api/data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pk_live_xyz789...',
    'X-User-Id': 'user_from_their_app',
    'X-User-Plan': 'free'
  }
})

// Returns:
{
  "success": true,
  "usage": {
    "count": 45,
    "limit": 100,
    "remaining": 55
  }
}
```

---

## What's Left to Build

### Phase 1: Frontend (YOUR platform)
- [ ] Signup flow (Clerk App #1)
- [ ] Payment page (YOUR Stripe)
- [ ] Config page (unlocked after payment)
  - Generate platformId + API key
  - Connect customer's Stripe
  - Configure tiers
  - Create products in their Stripe
  - Display API key (one time only)

### Phase 2: Testing
- [ ] Test with Stripe test keys
- [ ] Test webhook flow
- [ ] Test multi-tenant isolation
- [ ] Test usage tracking

### Phase 3: Polish
- [ ] Dashboard stats (show customer their usage)
- [ ] Key regeneration
- [ ] Stripe Connect OAuth (oauth-api)

---

## Key Points

✅ **Two separate Clerk apps:**
- App #1: YOUR customers (front-auth-api)
- App #2: Optional, if customer wants to use shared Clerk

✅ **Customer flexibility:**
- They can use Clerk (shared app)
- Or Supabase
- Or Auth0
- Or custom auth
- We don't care - just need userId

✅ **One webhook URL:**
- All customers point to same endpoint
- We identify by payload + stored secrets

✅ **Clean separation:**
- YOUR auth ≠ THEIR auth
- YOUR Stripe ≠ THEIR Stripe
- api-multi is just usage tracking

---

## Next: Build the Frontend!

Now we build:
1. Signup page
2. Payment flow
3. Config page (generate keys, connect Stripe)
4. Dashboard (show their stats)

Ready when you are! 🚀
