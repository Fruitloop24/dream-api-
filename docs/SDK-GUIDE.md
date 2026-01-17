# Dream API SDK - Official Guide

The authoritative reference for integrating Dream API into your application.

---

## Principles

### 1. Sign-Up Through Us, Everything Else Through Clerk

New users **must** sign up through the Dream API sign-up worker. This sets required metadata (publishableKey, plan) on their account. After initial signup, all auth flows use Clerk's hosted URLs directly.

```
New User:     api.auth.getSignUpUrl()  →  sign-up worker  →  Clerk hosted signup
Returning:    api.auth.getSignInUrl()  →  Clerk hosted sign-in (direct)
Account:      api.auth.getCustomerPortalUrl()  →  Clerk account page (direct)
Billing:      api.billing.openPortal()  →  Stripe billing portal
```

### 2. PK/SK Security Model

Same model as Stripe. Two keys, two purposes:

| Key | Where | Access |
|-----|-------|--------|
| Publishable Key (pk_xxx) | Frontend, public | Read catalog, user ops with JWT |
| Secret Key (sk_xxx) | Backend only, NEVER expose | Full admin access |

### 3. Stateless JWT Authentication

User identity comes from Clerk JWTs. The JWT contains:
- `userId` - Clerk user ID
- `plan` - Subscription tier (set by webhooks, not spoofable)
- `publishableKey` - Project isolation

JWTs are verified server-side on every request. No sessions to manage.

### 4. Test/Live Mode Isolation

- `pk_test_xxx` / `sk_test_xxx` - Test mode (Stripe test, fake payments)
- `pk_live_xxx` / `sk_live_xxx` - Live mode (real payments)

Always develop with test keys. Promote to live when ready. Just swap the publishable key.

### 5. Clerk Test Mode (Skip Email Verification)

Use these test credentials during development to skip email/SMS verification:

| Type | Value | Notes |
|------|-------|-------|
| Test Email | `yourname+clerk_test@gmail.com` | Any email with `+clerk_test` suffix |
| Verification Code | `424242` | Works for all test emails |
| Test Phone | `+15555550100` to `+15555550199` | Any number in this range |

**Example:**
1. Sign up with `dev+clerk_test@example.com`
2. Enter any password
3. When asked for verification code, enter `424242`
4. Done - no real email sent

---

## Installation

```bash
npm install @dream-api/sdk
```

---

## Configuration

### Frontend Mode (Browser, React, Vue)

Use publishable key only. Safe to expose in client code.

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
});
```

**Available operations:**
- List tiers and products (public)
- Track and check usage (requires JWT)
- Create checkout sessions (requires JWT)
- Open billing portal (requires JWT)
- Cart checkout for stores (no JWT needed)

### Backend Mode (Node, Workers, API Routes)

Use both keys. Full admin access.

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: process.env.DREAM_SECRET_KEY,
  publishableKey: process.env.DREAM_PUBLISHABLE_KEY,
});
```

**Additional operations:**
- Customer CRUD (create, read, update, delete)
- Dashboard metrics
- All frontend operations

---

## Auth Integration

### Initialize Auth (Frontend)

Call once on app load to detect existing sessions:

```typescript
await api.auth.init();

if (api.auth.isSignedIn()) {
  const user = api.auth.getUser();
  // user.id, user.email, user.plan, user.publishableKey
}
```

### Auth URLs

**Sign Up (new users)** - Routes through sign-up worker to set metadata:
```typescript
const url = api.auth.getSignUpUrl({ redirect: '/dashboard' });
// Redirect user to this URL
```

**Note:** The SDK consumes the `__clerk_ticket` synchronously before `isReady` becomes true, so both `/dashboard` and `/choose-plan` work as redirect destinations. See `docs/SIGN-UP-FLOW.md` for details.

**Sign In (returning users)** - Direct to Clerk hosted page:
```typescript
const url = api.auth.getSignInUrl({ redirect: '/dashboard' });
```

**Account Management** - Clerk's account portal (profile, password, security):
```typescript
const url = api.auth.getCustomerPortalUrl();
```

**Billing Management** - Stripe's billing portal (payment methods, invoices):
```typescript
const { url } = await api.billing.openPortal({ returnUrl: '/dashboard' });
```

### Sign Out

```typescript
await api.auth.signOut();
```

### User Object

```typescript
const user = api.auth.getUser();
// Returns: { id, email, plan, publishableKey } or null
```

---

## SaaS Operations

For subscription-based applications with usage tracking.

### List Tiers (Public)

No auth required. Use for pricing pages.

```typescript
const { tiers } = await api.products.listTiers();

// Each tier:
// - name: internal identifier (e.g., "pro")
// - displayName: shown to users (e.g., "Pro Plan")
// - price: monthly cost in cents
// - limit: requests per month (-1 for unlimited)
// - priceId: Stripe price ID
// - features: string array
// - popular: boolean for highlighting
```

### Track Usage

Increment the user's usage counter. Call when user consumes a resource.

```typescript
const result = await api.usage.track();

if (result.success) {
  // result.usage.usageCount - current count
  // result.usage.limit - plan limit
  // result.usage.remaining - remaining
} else {
  // Limit exceeded - prompt upgrade
}
```

### Check Usage

Read current usage without incrementing.

```typescript
const usage = await api.usage.check();

// usage.usageCount - current count
// usage.limit - plan limit (number or 'unlimited')
// usage.remaining - remaining (number or 'unlimited')
// usage.plan - current plan name
// usage.periodStart - billing period start
// usage.periodEnd - billing period end
```

### Create Subscription Checkout

Redirect user to Stripe to subscribe or upgrade.

```typescript
const { url } = await api.billing.createCheckout({
  tier: 'pro',                    // tier name
  successUrl: '/dashboard?success=true',
  cancelUrl: '/pricing',
});

window.location.href = url;
```

### Open Billing Portal

Let users manage their subscription (cancel, change payment method, view invoices).

```typescript
const { url } = await api.billing.openPortal({
  returnUrl: '/dashboard',
});

window.location.href = url;
```

---

## Store Operations

For e-commerce applications with product catalog and cart checkout.

### List Products (Public)

No auth required.

```typescript
const { products } = await api.products.list();

// Each product:
// - name: internal identifier
// - displayName: shown to customers
// - description: product description
// - price: in cents
// - priceId: use this for checkout
// - productId: Stripe product ID
// - imageUrl: product image (not "image")
// - inventory: stock count (null = unlimited)
// - soldOut: true if inventory <= 0
// - features: string array
```

### Cart Checkout (Guest)

No auth required. Stripe collects customer info.

```typescript
const { url } = await api.products.cartCheckout({
  items: [
    { priceId: 'price_xxx', quantity: 2 },
    { priceId: 'price_yyy', quantity: 1 },
  ],
  successUrl: '/thank-you',
  cancelUrl: '/cart',
  customerEmail: 'optional@example.com',  // optional
});

window.location.href = url;
```

---

## Customer Management (Backend Only)

Requires secret key.

### Create Customer

```typescript
const { customer } = await api.customers.create({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  plan: 'free',           // optional, defaults to 'free'
  password: 'optional',   // optional, Clerk generates if omitted
});
```

### Get Customer

```typescript
const { customer } = await api.customers.get('user_xxx');
```

### Update Customer Plan

```typescript
const { customer } = await api.customers.update('user_xxx', {
  plan: 'pro',
});
```

### Delete Customer

Removes from Clerk and cleans up all D1 records.

```typescript
const result = await api.customers.delete('user_xxx');
// result.deleted.id, result.deleted.email
```

---

## Dashboard Metrics (Backend Only)

Requires secret key.

### Get Dashboard

```typescript
const dashboard = await api.dashboard.get();

// SaaS metrics:
// - activeSubscriptions: number
// - cancelingSubscriptions: number
// - mrr: monthly recurring revenue
// - usageThisPeriod: total usage across all users
// - customers: array of customer details
// - tiers: array of tier configs

// Store metrics:
// - totalRevenue: all-time revenue
// - totalSales: order count
// - avgOrderValue: average order amount
// - products: array of products
// - orders: array of orders
```

### Get Totals (Across All Projects)

```typescript
const totals = await api.dashboard.getTotals();
// totals.totalRevenue, totals.totalCustomers, totals.totalMRR
```

---

## Error Handling

```typescript
import { DreamAPIException } from '@dream-api/sdk';

try {
  await api.usage.track();
} catch (error) {
  if (error instanceof DreamAPIException) {
    switch (error.status) {
      case 401:
        // Not authenticated - token missing or invalid
        break;
      case 403:
        // Forbidden - usage limit exceeded or wrong permissions
        break;
      case 404:
        // Not found - customer or resource doesn't exist
        break;
      case 429:
        // Rate limited - too many requests
        break;
    }

    // error.code - error identifier (e.g., "limit_exceeded")
    // error.message - human-readable message
  }
}
```

---

## React Integration

### Provider Pattern

```typescript
// hooks/useDreamAPI.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
});

const DreamAPIContext = createContext(null);

export function DreamAPIProvider({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.init().then(() => {
      setIsSignedIn(api.auth.isSignedIn());
      setUser(api.auth.getUser());
      setIsReady(true);
    });
  }, []);

  const signOut = async () => {
    await api.auth.signOut();
    setIsSignedIn(false);
    setUser(null);
  };

  return (
    <DreamAPIContext.Provider value={{ api, isReady, isSignedIn, user, signOut }}>
      {children}
    </DreamAPIContext.Provider>
  );
}

export function useDreamAPI() {
  return useContext(DreamAPIContext);
}
```

### Usage in Components

```typescript
function Dashboard() {
  const { api, isReady, user } = useDreamAPI();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (isReady) {
      api.usage.check().then(setUsage);
    }
  }, [isReady]);

  if (!isReady) return <Loading />;

  return (
    <div>
      <p>Plan: {user?.plan}</p>
      <p>Usage: {usage?.usageCount} / {usage?.limit}</p>
    </div>
  );
}
```

---

## Next.js Integration

### Client Components

Same as React - use publishable key only.

```typescript
'use client';

import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: process.env.NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY,
});
```

### Server Components / API Routes

Use secret key for admin operations.

```typescript
// app/api/customers/route.ts
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: process.env.DREAM_SECRET_KEY,
  publishableKey: process.env.DREAM_PUBLISHABLE_KEY,
});

export async function POST(request: Request) {
  const body = await request.json();
  const { customer } = await api.customers.create(body);
  return Response.json({ customer });
}
```

### Middleware for JWT

```typescript
// app/api/usage/route.ts
export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  api.setUserToken(token);
  const result = await api.usage.track();
  return Response.json(result);
}
```

---

## Environment Variables

### Frontend (.env.local)

```env
VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
# or for Next.js:
NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY=pk_test_xxx
```

### Backend (.env)

```env
DREAM_SECRET_KEY=sk_test_xxx
DREAM_PUBLISHABLE_KEY=pk_test_xxx
```

**Never commit .env files. Never put SK in frontend code.**

---

## Type Reference

```typescript
import type {
  // Configuration
  DreamAPIConfig,

  // Auth
  ClerkUser,

  // Customers
  Customer,
  CreateCustomerParams,

  // Usage
  Usage,
  UsageTrackResult,

  // Products & Pricing
  Tier,
  Product,

  // Billing
  CheckoutResult,
  PortalResult,

  // Dashboard
  DashboardMetrics,
  DashboardCustomer,
  Order,
  WebhookStatus,

  // Errors
  DreamAPIError,
  DreamAPIException,
} from '@dream-api/sdk';
```

---

## Common Patterns

### Protected Routes

```typescript
function ProtectedRoute({ children }) {
  const { isReady, isSignedIn } = useDreamAPI();

  if (!isReady) return <Loading />;
  if (!isSignedIn) return <Navigate to="/" />;

  return children;
}
```

### Usage Limit Enforcement

```typescript
async function doSomething() {
  try {
    const result = await api.usage.track();
    if (!result.success) {
      showUpgradeModal();
      return;
    }
    // Proceed with action
  } catch (error) {
    if (error.status === 403) {
      showUpgradeModal();
    }
  }
}
```

### Post-Checkout Handling

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('success') === 'true') {
    // Refresh user data to get new plan
    api.auth.refreshToken().then(() => {
      setUser(api.auth.getUser());
    });
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);
```

---

## Critical Notes (READ THIS FIRST)

### 1. Sign-Up vs Sign-In - They Are Different!

**Sign-Up** MUST go through `getSignUpUrl()` - this routes through our worker that sets user metadata (publishableKey, plan). Without this, the user won't have a plan and nothing works.

**Sign-In** can use `getSignInUrl()` directly - just goes to Clerk.

```typescript
// NEW USER - Must use sign-up worker
<a href={api.auth.getSignUpUrl({ redirect: '/dashboard' })}>Sign Up</a>

// RETURNING USER - Direct to Clerk
<a href={api.auth.getSignInUrl({ redirect: '/dashboard' })}>Sign In</a>
```

**Why this matters:** If you send a new user directly to Clerk sign-up (bypassing our worker), they'll create an account but have no `plan` in their JWT. Every API call will fail.

### 2. After Checkout - Plan Doesn't Update Immediately

After Stripe checkout completes:
1. Stripe sends webhook to our backend
2. Backend updates Clerk user metadata (plan: 'pro')
3. User returns to your app with `?success=true`

**The webhook takes 1-3 seconds to process.** Your user's JWT won't have the new plan immediately.

**Solution: Reload the page after checkout success**

```typescript
// In your dashboard/success handler
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    // Show success message
    setMessage('Upgrade successful!');

    // Wait for webhook, then reload to get fresh data
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  }
}, []);
```

This is the simplest, most reliable approach. The reload re-initializes the SDK with fresh Clerk data.

### 3. Next.js SSR - Client-Side Only

`api.auth.init()` loads Clerk via CDN and must run in the browser. It does nothing on the server.

**Always use 'use client' for auth components:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  publishableKey: process.env.NEXT_PUBLIC_DREAM_PUBLISHABLE_KEY!
});

export function AuthProvider({ children }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    api.auth.init().then(() => setIsReady(true));
  }, []);

  if (!isReady) return <Loading />;
  return children;
}
```

### 4. Features is an Array, Not a String

```typescript
// WRONG - will crash
tier.features.split(',').map(f => <li>{f}</li>)

// CORRECT - it's already an array
tier.features.map(f => <li key={f}>{f}</li>)
```

### 5. Prices Are in Cents

```typescript
// WRONG - shows $1999 instead of $19.99
<span>${tier.price}</span>

// CORRECT
<span>${(tier.price / 100).toFixed(2)}</span>
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "User token required" | JWT not set | Call `api.auth.init()` or `api.setUserToken()` |
| Empty products/tiers | Wrong project type | SaaS has tiers, Store has products |
| Price shows $1999 | Not dividing by 100 | Prices are in cents - divide by 100 |
| `features.split()` fails | Features is array | Don't call split, iterate directly |
| Checkout returns undefined | Using wrong property | Use `result.url`, not `result.checkoutUrl` |
| Sign-in doesn't persist | Didn't use sign-up worker | New users must go through `getSignUpUrl()` |
| Plan doesn't update after checkout | Webhook timing | Reload page after 2s delay on success |
| `client.signIn: false` | Clerk not fully initialized | Increase wait time in SDK |
| `Ticket present: NO` | Worker didn't add token | Check /oauth/complete response |
| `Ticket error: expired` | Token TTL is 5 minutes | User took too long, retry |
| `Ticket error: already used` | Token is single-use | Don't refresh page with ticket |
| OAuth redirects to landing | Ticket not consumed | SDK handles this - check `__clerk_ticket` in URL |
| Next.js hydration errors | SSR mismatch | Use 'use client' directive, init in useEffect |

---

## Cross-Domain Sign-In (Ticket Mechanism)

The SDK uses Clerk's sign-in ticket mechanism for cross-domain authentication. After sign-up, the sign-up worker creates a sign-in token and redirects to the dev's app with `__clerk_ticket` parameter.

**Critical: Use `clerk.client.signIn`, NOT `clerk.signIn`**

When Clerk is loaded via CDN (which the SDK does), the signIn object is at `clerk.client.signIn`:

```typescript
// WRONG - clerk.signIn doesn't exist on CDN-loaded Clerk!
clerk.signIn.create({ strategy: 'ticket', ticket })

// CORRECT - must use clerk.client.signIn
clerk.client.signIn.create({ strategy: 'ticket', ticket })
```

The SDK handles this automatically in `dream-sdk/src/clerk.ts`. See `docs/SIGN-UP-FLOW.md` for complete flow documentation.
