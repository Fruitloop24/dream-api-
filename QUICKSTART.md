# Quick Start - Tomorrow's Session

## Where We Are

**✅ Completed Today:**
- Created shared Clerk app for end-users (composed-blowfish-76)
- Updated api-multi with new Clerk keys
- Created JWT template: `end-user-api` with `platformId` + `plan` claims
- Documented 4 KV namespace separation strategy
- Tested local dev setup (frontend + front-auth-api working)

**🎯 Tomorrow's Goal:**
Complete the developer upgrade flow (payment → OAuth → tier config)

---

## Start Services

```bash
# Terminal 1: Frontend
cd frontend && npm run dev  # Port 5173

# Terminal 2: Platform API
cd front-auth-api && npm run dev  # Port 8788
```

Open: http://localhost:5173

---

## Tomorrow's Tasks

### 1. Wire Up oauth-api (2 hours)

**File:** `oauth-api/src/index.ts`

**Changes needed:**
- Strip out GitHub and Cloudflare OAuth
- Add KV bindings (PLATFORM_KV + CUSTOMER_KV)
- Implement Stripe Connect OAuth flow
- Create Stripe products via API
- Save tier config to api-multi TOKENS_KV

**Test:**
- OAuth flow redirects correctly
- Stripe tokens saved to KV
- Products created on developer's Stripe account

---

### 2. Update Webhook Handler (30 min)

**File:** `front-auth-api/src/webhook.ts`

**Changes needed:**
```typescript
if (event.type === 'checkout.session.completed') {
  const userId = session.metadata?.userId;

  // Update plan
  await clerkClient.users.updateUser(userId, {
    publicMetadata: { plan: 'paid', subscribed: true }
  });

  // Redirect to Stripe OAuth (not dashboard)
  // Store redirect URL in KV or session
}
```

---

### 3. Add Tier Config UI (1 hour)

**New file:** `frontend/src/pages/TierConfig.tsx`

**Form fields:**
- How many tiers? (number input)
- For each tier:
  - Name (text)
  - Limit (number)
  - Price (number, $0 = free)

**Submit:**
- POST to oauth-api
- Create Stripe products
- Save tier config
- Display API key

---

### 4. Test Full Flow (30 min)

1. Sign up new developer
2. Click subscribe ($29/mo)
3. Pay with test card
4. Redirect to Stripe OAuth
5. Configure tiers
6. Get API key
7. Make API call to api-multi
8. Verify usage tracking works

---

## Four KV Namespace Reference

**front-auth-api (YOUR platform):**
- USAGE_KV: `6a3c39a8ee9b46859dc237136048df25`
- TOKENS_KV: `d09d8bf4e63a47c495384e9ed9b4ec7e`

**api-multi (THEIR platform):**
- USAGE_KV: `10cc8b9f46f54a6e8d89448f978aaa1f`
- TOKENS_KV: `a9f3331b0c8b48d58c32896482484208`

**oauth-api needs both:**
```toml
[[kv_namespaces]]
binding = "PLATFORM_KV"
id = "d09d8bf4e63a47c495384e9ed9b4ec7e"

[[kv_namespaces]]
binding = "CUSTOMER_KV"
id = "a9f3331b0c8b48d58c32896482484208"
```

---

## Files to Touch Tomorrow

```
oauth-api/
├── src/index.ts          # Strip GitHub/CF, add Stripe OAuth
└── wrangler.toml         # Add KV bindings

front-auth-api/
└── src/webhook.ts        # Redirect to OAuth after payment

frontend/
└── src/pages/
    └── TierConfig.tsx    # NEW - Tier configuration form
```

---

*Get some sleep. We got this tomorrow. 🚀*
