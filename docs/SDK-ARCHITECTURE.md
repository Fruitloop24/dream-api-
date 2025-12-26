# SDK Architecture - Shared Clerk App Model

## Overview

Dream-api is a middleware layer. Developers using the SDK only need two keys:
- `secretKey` (sk_test_xxx or sk_live_xxx)
- `publishableKey` (pk_test_xxx or pk_live_xxx)

No Clerk keys. No Stripe keys. Everything is abstracted.

---

## The Shared Clerk App

All end-users across all developers share a single Clerk app: `end-user-api`.

**Tenant isolation** is achieved via `publicMetadata` on each user:
```json
{
  "publishableKey": "pk_test_xxx",
  "plan": "free"
}
```

This metadata is:
- Set by the sign-up worker during registration
- Read from the JWT on every API call
- Updated by webhooks when users upgrade

---

## Two Integration Paths

### 1. SDK Path (URL-based, no Clerk setup)

For developers who want zero Clerk complexity.

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: 'sk_test_xxx',
  publishableKey: 'pk_test_xxx',
});

// Auth - redirect to URLs
window.location.href = api.auth.getSignUpUrl({ redirect: '/dashboard' });
window.location.href = api.auth.getSignInUrl({ redirect: '/dashboard' });
window.location.href = api.auth.getCustomerPortalUrl();

// After sign-in, get JWT from Clerk and set it
api.setUserToken(clerkJWT);

// Now make API calls
await api.usage.track();
const { url } = await api.billing.createCheckout({ tier: 'pro' });
```

### 2. Full Integration Path (Clerk React components)

For developers who want more control (like fs-template).

```typescript
import { SignIn, SignUp, UserButton } from '@clerk/clerk-react';

// Use Clerk components directly
<SignIn routing="path" path="/sign-in" />
<SignUp routing="path" path="/sign-up" />
<UserButton />

// Still use SDK for API calls
await api.usage.track();
await api.billing.openPortal();
```

---

## URL Mapping

### Auth URLs (Clerk)

| SDK Method | URL |
|------------|-----|
| `api.auth.getSignUpUrl({ redirect })` | `https://sign-up.../signup?pk=xxx&redirect=...` |
| `api.auth.getSignInUrl({ redirect })` | `https://composed-blowfish-76.accounts.dev/sign-in?redirect_url=...` |
| `api.auth.getCustomerPortalUrl()` | `https://composed-blowfish-76.accounts.dev/user` |

**Note:** Sign-up uses the custom worker to set metadata. Sign-in and account use Clerk's hosted pages directly.

### Billing URLs (Stripe)

| SDK Method | Endpoint | Returns |
|------------|----------|---------|
| `api.billing.createCheckout({ tier })` | `POST /api/create-checkout` | Stripe Checkout URL |
| `api.billing.openPortal()` | `POST /api/customer-portal` | Stripe Billing Portal URL |

---

## Flow Diagrams

### New User Sign-Up

```
Developer's App
    │
    │ api.auth.getSignUpUrl({ redirect: '/dashboard' })
    ▼
Sign-Up Worker (/signup?pk=xxx&redirect=...)
    │
    │ 1. Clerk SDK creates user (OAuth or email/password)
    │ 2. Set publicMetadata: { publishableKey, plan: 'free' }
    │ 3. Sync to D1 database
    ▼
Redirect to Developer's App
    │
    │ User signs in (cross-domain = separate session)
    ▼
Developer's App (user authenticated)
```

### Returning User Sign-In

```
Developer's App
    │
    │ api.auth.getSignInUrl({ redirect: '/dashboard' })
    ▼
Clerk Hosted Sign-In
    │
    │ User authenticates (metadata already exists)
    ▼
Redirect to Developer's App
    │
    │ Clerk session established
    │ Developer gets JWT: await Clerk.session.getToken()
    ▼
API calls with JWT
    │
    │ api.setUserToken(jwt)
    │ await api.usage.track()
```

### Subscription Upgrade

```
Developer's App
    │
    │ api.billing.createCheckout({ tier: 'pro' })
    ▼
POST /api/create-checkout
    │
    │ Returns Stripe Checkout URL
    ▼
Stripe Checkout Page
    │
    │ User enters payment info
    ▼
Stripe Webhook → API Worker
    │
    │ 1. Update Clerk publicMetadata: { plan: 'pro' }
    │ 2. Update D1 subscriptions table
    ▼
User's next JWT has updated plan
```

---

## Configuration

### SDK Defaults

```typescript
const api = new DreamAPI({
  secretKey: 'sk_test_xxx',
  publishableKey: 'pk_test_xxx',
  // Optional overrides:
  // baseUrl: 'https://api-multi.k-c-sheffield012376.workers.dev',
  // signupUrl: 'https://sign-up.k-c-sheffield012376.workers.dev',
  // clerkBaseUrl: 'https://composed-blowfish-76.accounts.dev',
});
```

### For Production

Override `clerkBaseUrl` if the Clerk app URL changes:

```typescript
const api = new DreamAPI({
  secretKey: process.env.DREAM_SK,
  publishableKey: process.env.DREAM_PK,
  clerkBaseUrl: process.env.CLERK_BASE_URL, // Production Clerk URL
});
```

---

## Key Concepts

1. **Devs don't need Clerk setup** - SDK handles everything via URLs
2. **One Clerk app for all users** - Isolated by `publishableKey` metadata
3. **Two portals, separate concerns**:
   - Clerk portal = Account settings (profile, password)
   - Stripe portal = Billing management (payment, invoices)
4. **Sign-up is special** - Uses custom worker to set metadata
5. **Sign-in is standard** - Uses Clerk's hosted pages directly
