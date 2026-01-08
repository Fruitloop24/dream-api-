# Dream API

Auth, billing, and usage tracking in one SDK. No Clerk components. No Stripe components. Just your publishable key.

---

## Contents

- [Quick Start](#quick-start)
- [SaaS Apps](#saas-apps)
  - [Setup](#saas-setup)
  - [Auth](#saas-auth)
  - [Usage Tracking](#usage-tracking)
  - [Billing](#billing)
  - [Complete Example](#saas-complete-example)
- [Store Apps](#store-apps)
  - [Setup](#store-setup)
  - [Products](#products)
  - [Cart Checkout](#cart-checkout)
  - [Complete Example](#store-complete-example)
- [Framework Examples](#framework-examples)
  - [React](#react)
  - [Next.js](#nextjs)
  - [Vue](#vue)
- [Gotchas](#gotchas)
- [AI Prompts](#ai-prompts)
- [Admin API](#admin-api)
- [Templates](#templates)

---

## Quick Start

```bash
npm install @dream-api/sdk
```

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: 'pk_test_xxx' // ← your only config
});

await api.auth.init();
```

**That's it.** No Clerk provider, no Stripe keys, no environment variables besides your one key.

---

## SaaS Apps

For subscription-based apps with usage tracking (AI wrappers, tools, platforms).

### SaaS Setup

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({ publishableKey: 'pk_test_xxx' });

// Call once on app load
await api.auth.init();
```

### SaaS Auth

Auth is just URLs. No components needed.

```typescript
// Sign up (new users)
const signupUrl = api.auth.getSignUpUrl({ redirect: '/dashboard' });

// Sign in (returning users)
const signinUrl = api.auth.getSignInUrl({ redirect: '/dashboard' });

// Account settings (Clerk hosted)
const accountUrl = api.auth.getCustomerPortalUrl();

// Check auth state
if (api.auth.isSignedIn()) {
  const user = api.auth.getUser();
  // user = { id, email, plan, publishableKey }
}

// Sign out
await api.auth.signOut();
```

Use these URLs in links or buttons:
```html
<a href={signupUrl}>Sign Up</a>
<a href={signinUrl}>Sign In</a>
```

### Usage Tracking

Track when users do billable actions. Limits are enforced automatically based on their plan.

```typescript
// Track an action (increments counter)
const result = await api.usage.track();

if (result.success) {
  // User has remaining quota
  console.log(`${result.usage.remaining} left`);
} else {
  // Limit reached - show upgrade prompt
}

// Check without incrementing
const usage = await api.usage.check();
// usage = { usageCount, limit, remaining, plan }
```

### Billing

```typescript
// Get pricing tiers (for your pricing page)
const { tiers } = await api.products.listTiers();
// tiers = [{ name, displayName, price, limit, features }]

// Create checkout (upgrade/subscribe)
const { url } = await api.billing.createCheckout({
  tier: 'pro',
  successUrl: '/dashboard?upgraded=true',
  cancelUrl: '/pricing'
});
window.location.href = url;

// Open billing portal (manage subscription)
const { url } = await api.billing.openPortal({
  returnUrl: '/dashboard'
});
window.location.href = url;
```

### SaaS Complete Example

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({ publishableKey: 'pk_test_xxx' });

// On app load
async function init() {
  await api.auth.init();

  if (api.auth.isSignedIn()) {
    const user = api.auth.getUser();
    console.log(`Welcome ${user.email}, plan: ${user.plan}`);
  }
}

// When user does a billable action
async function doAction() {
  const result = await api.usage.track();

  if (!result.success) {
    // Show upgrade modal
    return;
  }

  // Do the actual action
  await performAction();
}

// Upgrade flow
async function upgrade(tierName: string) {
  const { url } = await api.billing.createCheckout({
    tier: tierName,
    successUrl: window.location.origin + '/dashboard',
    cancelUrl: window.location.origin + '/pricing'
  });
  window.location.href = url;
}

init();
```

---

## Store Apps

For e-commerce with product catalog and guest checkout.

### Store Setup

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({ publishableKey: 'pk_test_xxx' });
// No auth.init() needed for guest checkout
```

### Products

```typescript
const { products } = await api.products.list();

// Each product:
// {
//   name: 'tshirt',
//   displayName: 'Classic T-Shirt',
//   description: '100% cotton',
//   price: 29,              // in dollars
//   priceId: 'price_xxx',   // use this for checkout
//   imageUrl: 'https://...',
//   inventory: 50,          // null = unlimited
//   soldOut: false,
//   features: ['Feature 1', 'Feature 2']
// }
```

### Cart Checkout

Guest checkout - no auth required. Stripe collects customer info.

```typescript
const { url } = await api.products.cartCheckout({
  items: [
    { priceId: 'price_xxx', quantity: 2 },
    { priceId: 'price_yyy', quantity: 1 }
  ],
  customerEmail: 'optional@example.com', // optional
  successUrl: '/thank-you',
  cancelUrl: '/cart'
});

window.location.href = url;
```

### Store Complete Example

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({ publishableKey: 'pk_test_xxx' });

// Load products
async function loadProducts() {
  const { products } = await api.products.list();
  return products.filter(p => !p.soldOut);
}

// Cart state (local)
let cart: Array<{ priceId: string; quantity: number }> = [];

function addToCart(priceId: string) {
  const existing = cart.find(i => i.priceId === priceId);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ priceId, quantity: 1 });
  }
}

// Checkout
async function checkout() {
  const { url } = await api.products.cartCheckout({
    items: cart,
    successUrl: window.location.origin + '/thank-you',
    cancelUrl: window.location.origin + '/cart'
  });
  window.location.href = url;
}
```

---

## Framework Examples

### React

```tsx
// hooks/useDreamAPI.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY
});

const DreamContext = createContext<any>(null);

export function DreamProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.auth.init().then(() => {
      setUser(api.auth.getUser());
      setReady(true);
    });
  }, []);

  const signOut = async () => {
    await api.auth.signOut();
    setUser(null);
  };

  return (
    <DreamContext.Provider value={{ api, ready, user, signOut }}>
      {children}
    </DreamContext.Provider>
  );
}

export const useDreamAPI = () => useContext(DreamContext);
export { api as dreamAPI };
```

```tsx
// Usage in component
function Dashboard() {
  const { api, user } = useDreamAPI();

  const handleAction = async () => {
    const result = await api.usage.track();
    if (!result.success) {
      // show upgrade modal
    }
  };

  return <button onClick={handleAction}>Do Action</button>;
}
```

**Full template:** [dream-saas-react/CLAUDE.md](../dream-saas-basic/CLAUDE.md)

### Next.js

```tsx
// lib/dream-api.ts
import { DreamAPI } from '@dream-api/sdk';

export const api = new DreamAPI({
  publishableKey: process.env.NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY!
});
```

```tsx
// app/providers.tsx
'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { api } from '@/lib/dream-api';

const DreamContext = createContext<any>(null);

export function DreamProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.auth.init().then(() => {
      setUser(api.auth.getUser());
      setReady(true);
    });
  }, []);

  return (
    <DreamContext.Provider value={{ api, ready, user }}>
      {children}
    </DreamContext.Provider>
  );
}

export const useDream = () => useContext(DreamContext);
```

```tsx
// app/layout.tsx
import { DreamProvider } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DreamProvider>{children}</DreamProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/dashboard/page.tsx
'use client';

import { useDream } from '../providers';

export default function Dashboard() {
  const { api, user, ready } = useDream();

  if (!ready) return <div>Loading...</div>;

  return <div>Welcome {user?.email}</div>;
}
```

**Note:** `auth.init()` must be called client-side. It's SSR-safe (returns early on server).

### Vue

```typescript
// composables/useDreamAPI.ts
import { ref, onMounted } from 'vue';
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY
});

const ready = ref(false);
const user = ref<any>(null);

export function useDreamAPI() {
  onMounted(async () => {
    if (!ready.value) {
      await api.auth.init();
      user.value = api.auth.getUser();
      ready.value = true;
    }
  });

  const signOut = async () => {
    await api.auth.signOut();
    user.value = null;
  };

  return { api, ready, user, signOut };
}
```

```vue
<!-- components/Dashboard.vue -->
<script setup lang="ts">
import { useDreamAPI } from '@/composables/useDreamAPI';

const { api, user, ready } = useDreamAPI();

async function handleAction() {
  const result = await api.usage.track();
  if (!result.success) {
    // show upgrade modal
  }
}
</script>

<template>
  <div v-if="ready">
    <p>Welcome {{ user?.email }}</p>
    <button @click="handleAction">Do Action</button>
  </div>
  <div v-else>Loading...</div>
</template>
```

---

## Gotchas

### Image URLs

Product images must be full URLs. If using our dashboard, images are stored in R2 and you get full URLs automatically.

```typescript
// ✓ Correct
imageUrl: 'https://your-r2-bucket.com/image.jpg'

// ✗ Wrong
imageUrl: '/images/product.jpg'
```

### Prices in Dollars

Prices are in **dollars**, not cents. Set $29 in dashboard, get `29` in API.

```typescript
const { tiers } = await api.products.listTiers();
// tier.price = 29 (not 2900)

// Display directly
<span>${tier.price}/mo</span>
```

### auth.init() is Client-Side Only

The `auth.init()` method loads Clerk in the browser. It's SSR-safe (returns early on server), but won't do anything server-side.

```typescript
// ✓ Works - client component
useEffect(() => {
  api.auth.init();
}, []);

// ✓ Works - but does nothing on server
await api.auth.init(); // safe to call, just returns early
```

### Features is an Array

Tier/product features come as an array, not a comma-separated string.

```typescript
// ✓ Correct
tier.features.map(f => <li>{f}</li>)

// ✗ Wrong
tier.features.split(',')
```

### Auth URLs Work Everywhere

`getSignUpUrl()` and `getSignInUrl()` just return strings. They work in server components, API routes, anywhere.

```typescript
// Works in Next.js Server Component
export default function Page() {
  const url = api.auth.getSignUpUrl({ redirect: '/dashboard' });
  return <a href={url}>Sign Up</a>;
}
```

---

## AI Prompts

Paste these into ChatGPT, Claude, or Cursor for context.

### General Context

```
I'm using Dream API SDK (@dream-api/sdk) for auth, billing, and usage tracking.

Setup:
const api = new DreamAPI({ publishableKey: 'pk_xxx' });
await api.auth.init();

Key methods:
- api.auth.getSignUpUrl({ redirect }) - returns URL for new user signup
- api.auth.getSignInUrl({ redirect }) - returns URL for sign in
- api.auth.isSignedIn() - boolean
- api.auth.getUser() - returns { id, email, plan }
- api.usage.track() - increment usage, returns { success, usage }
- api.usage.check() - read usage without increment
- api.billing.createCheckout({ tier }) - returns { url } to Stripe
- api.billing.openPortal() - returns { url } to billing portal
- api.products.listTiers() - returns { tiers }

Rules:
- Call auth.init() once on app load (client-side)
- Prices are in dollars, not cents
- features is an array, not a string
- Auth URLs (getSignUpUrl, etc) work anywhere, just return strings
```

### SaaS Prompt

```
I'm building a SaaS app with Dream API. The pattern is:

1. Initialize: await api.auth.init()
2. Auth links: api.auth.getSignUpUrl({ redirect: '/dashboard' })
3. Track usage: await api.usage.track() when user does billable action
4. Upgrade: await api.billing.createCheckout({ tier: 'pro' })

User object: { id, email, plan, publishableKey }
Usage object: { usageCount, limit, remaining, plan }

Help me [YOUR REQUEST HERE]
```

### Store Prompt

```
I'm building a store with Dream API. The pattern is:

1. Load products: const { products } = await api.products.list()
2. Build cart locally: [{ priceId, quantity }]
3. Checkout: await api.products.cartCheckout({ items, successUrl, cancelUrl })

Product object: { name, displayName, price, priceId, imageUrl, inventory, soldOut }

No auth needed for guest checkout. Stripe handles customer info.

Help me [YOUR REQUEST HERE]
```

---

## Admin API

Backend-only methods. Require secret key.

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: process.env.DREAM_SECRET_KEY,
  publishableKey: process.env.DREAM_PUBLISHABLE_KEY
});
```

### Customers

```typescript
// Create
const { customer } = await api.customers.create({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  plan: 'free'
});

// Get
const { customer } = await api.customers.get('user_xxx');

// Update plan
const { customer } = await api.customers.update('user_xxx', {
  plan: 'pro'
});

// Delete
const { deleted } = await api.customers.delete('user_xxx');
```

### Dashboard

```typescript
// Get metrics for one project
const metrics = await api.dashboard.get();
// SaaS: { activeSubscriptions, mrr, usageThisPeriod, customers, tiers }
// Store: { totalRevenue, totalSales, avgOrderValue, products, orders }

// Get totals across all projects
const totals = await api.dashboard.getTotals();
// { totalRevenue, totalCustomers, totalMRR }
```

---

## Templates

Ready-to-use templates with `/setup` command for AI-assisted configuration.

### SaaS Templates

| Template | Framework | Features |
|----------|-----------|----------|
| [dream-saas-basic](../dream-saas-basic/) | React + Vite | Auth, billing, usage, landing page, PWA support |
| dream-saas-next | Next.js | Coming soon |
| dream-saas-vue | Vue 3 | Coming soon |

### Store Templates

| Template | Framework | Features |
|----------|-----------|----------|
| [dream-store-basic](../dream-store-basic/) | React + Vite | Products, cart, guest checkout |

### Template Commands

Each template includes AI commands:

- `/setup` - Interactive setup with AI assistance
- `/pwa` - Add Progressive Web App support (React only)

### Template Docs

See the CLAUDE.md in each template for full documentation:
- [dream-saas-basic/CLAUDE.md](../dream-saas-basic/CLAUDE.md)
- [dream-store-basic/CLAUDE.md](../dream-store-basic/CLAUDE.md)

---

## Self-Host

Want to run your own infrastructure? See the worker deployment docs:

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design
- [API-REFERENCE.md](../API-REFERENCE.md) - All endpoints
- [D1-SCHEMA.md](../D1-SCHEMA.md) - Database schema
