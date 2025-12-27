# SaaS Project Guide

Building a SaaS app with subscription billing using `@dream-api/sdk`.

---

## Overview

SaaS projects use **subscription billing** - users sign up, pick a plan, and get billed monthly. This requires authentication because we need to know WHO is subscribing.

**Key difference from Store:** Users MUST be signed in before they can subscribe.

---

## Auth Flow (Required)

SaaS billing requires a signed-in user. Here's the flow:

```
1. User clicks "Sign Up" → redirects to sign-up worker
2. User creates account (email/password or OAuth)
3. User redirected back to your app with session
4. User clicks "Upgrade to Pro" → now billing.createCheckout() works
5. After payment, webhook updates their plan in metadata
```

### Getting the Sign-Up URL

```typescript
const api = new DreamAPI({
  secretKey: process.env.DREAM_SECRET_KEY,
  publishableKey: 'pk_test_xxx',
});

// Generate sign-up URL
const signupUrl = api.auth.getSignUpUrl({
  redirect: '/dashboard', // where to go after signup
});

// Use in your app
<a href={signupUrl}>Sign Up</a>
```

### Setting User Token After Sign-In

After user signs in via Clerk, you MUST set their token:

```typescript
// After Clerk sign-in
const token = await clerk.session.getToken();
api.setUserToken(token);

// NOW billing methods work
const { url } = await api.billing.createCheckout({ tier: 'pro' });
```

---

## Subscription Checkout

**REQUIRES:** User must be signed in (token set)

```typescript
// This will FAIL without setUserToken() first
const result = await api.billing.createCheckout({
  tier: 'pro',                    // tier name from your dashboard
  priceId: 'price_xxx',           // optional: override with specific price
  successUrl: '/dashboard?upgraded=true',
  cancelUrl: '/pricing',
});

// Redirect to Stripe
window.location.href = result.url;  // NOT result.checkoutUrl
```

### Common Error

```
Error: Requires user authentication
```

**Fix:** Call `api.setUserToken(clerkJWT)` before billing methods.

---

## Usage Tracking

Track API usage for metered billing:

```typescript
// Check usage (requires auth)
const usage = await api.usage.check();
console.log(`${usage.usageCount} / ${usage.limit} used`);

// Track a usage event (requires auth)
const { usage } = await api.usage.track();
if (usage.remaining <= 0) {
  // Show upgrade prompt
}
```

---

## Customer Portal

Let users manage their subscription:

```typescript
// Open Stripe billing portal (requires auth)
const { url } = await api.billing.openPortal({
  returnUrl: '/dashboard',
});
window.location.href = url;
```

---

## Listing Tiers (Pricing Page)

This does NOT require auth - use it for your public pricing page:

```typescript
const { tiers } = await api.products.listTiers();

// tiers = [
//   { name: 'free', displayName: 'Free', price: 0, limit: 100, ... },
//   { name: 'pro', displayName: 'Pro', price: 29, limit: 10000, popular: true, ... },
// ]
```

### Tier Fields

```typescript
interface Tier {
  name: string;           // internal name (used in createCheckout)
  displayName: string;    // shown to users
  price: number;          // in DOLLARS (not cents!)
  limit: number;          // API calls per month (-1 = unlimited)
  priceId: string;        // Stripe price ID
  productId: string;      // Stripe product ID
  features?: string[];    // feature list (ARRAY, not string)
  popular?: boolean;      // highlight this tier
  billingMode: 'subscription';  // always subscription for SaaS
}
```

---

## Environment Setup

```env
# .env.local (gitignored)
DREAM_SECRET_KEY=sk_test_xxx
VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
```

```typescript
// Backend (Node/API routes)
const api = new DreamAPI({
  secretKey: process.env.DREAM_SECRET_KEY!,
  publishableKey: process.env.VITE_DREAM_PUBLISHABLE_KEY,
});

// Frontend (after user auth)
api.setUserToken(await clerk.session.getToken());
```

---

## Full SaaS Flow Example

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: import.meta.env.VITE_DREAM_SECRET_KEY,
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
});

// 1. Show pricing (no auth needed)
async function loadPricing() {
  const { tiers } = await api.products.listTiers();
  return tiers.filter(t => t.billingMode === 'subscription');
}

// 2. After user signs in via Clerk
function onUserSignIn(clerkSession) {
  const token = clerkSession.getToken();
  api.setUserToken(token);
}

// 3. Upgrade to paid plan (auth required)
async function upgradeToPro() {
  const { url } = await api.billing.createCheckout({
    tier: 'pro',
    successUrl: '/dashboard?upgraded=true',
    cancelUrl: '/pricing',
  });
  window.location.href = url;
}

// 4. Check usage in your app (auth required)
async function checkUserUsage() {
  const usage = await api.usage.check();
  if (usage.remaining <= 0) {
    showUpgradeModal();
  }
}

// 5. Track usage when they use your API (auth required)
async function trackAPICall() {
  await api.usage.track();
}

// 6. Manage subscription (auth required)
async function openBillingPortal() {
  const { url } = await api.billing.openPortal({ returnUrl: '/dashboard' });
  window.location.href = url;
}
```

---

## Gotchas

| Issue | Solution |
|-------|----------|
| "Requires user authentication" | Call `api.setUserToken(jwt)` first |
| `result.checkoutUrl` undefined | Use `result.url` |
| `tier.features.split()` fails | `features` is an array, not string |
| Price shows $0.29 instead of $29 | Price is already in dollars, don't divide |
| Tiers empty | Check you're using SaaS project keys (not Store) |

---

## See Also

- [SDK-GOTCHAS.md](./SDK-GOTCHAS.md) - General SDK issues
- [STORE-GUIDE.md](./STORE-GUIDE.md) - For cart/product checkout (no auth needed)
