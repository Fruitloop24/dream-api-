# dream-api - Development Guide

**Last Updated:** 2025-12-01

---

## Current Session Status

### ✅ What We Built Today:

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

## The Four KV Namespaces (CRITICAL!)

**front-auth-api:**
- `USAGE_KV: 6a3c39a8ee9b46859dc237136048df25` - YOUR devs' usage
- `TOKENS_KV: d09d8bf4e63a47c495384e9ed9b4ec7e` - YOUR devs' credentials
- `CUSTOMER_TOKENS_KV: a9f3331b0c8b48d58c32896482484208` - READ ONLY (for Stripe tokens)

**oauth-api:**
- `PLATFORM_TOKENS_KV: d09d8bf4e63a47c495384e9ed9b4ec7e` - READ (get platformId)
- `CUSTOMER_TOKENS_KV: a9f3331b0c8b48d58c32896482484208` - WRITE (save Stripe tokens)

**api-multi:**
- `USAGE_KV: 10cc8b9f46f54a6e8d89448f978aaa1f` - THEIR users' usage
- `TOKENS_KV: a9f3331b0c8b48d58c32896482484208` - THEIR tier configs

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

## Next Session Plan

1. Get Stripe Connect OAuth credentials
2. Test OAuth flow end-to-end
3. Add CUSTOMER_TOKENS_KV to front-auth-api
4. Implement /create-products endpoint
5. Test product creation
6. Decide on preview generation strategy
7. Test full flow: signup → preview → pay → OAuth → tier config → credentials

---

*Context compressed for tomorrow. We're VERY close!*
