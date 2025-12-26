# @dream-api/sdk

Official SDK for Dream API - Auth, billing, and usage tracking in one API.

## Installation

```bash
npm install @dream-api/sdk
```

## Quick Start

```typescript
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: process.env.DREAM_API_SECRET_KEY,
  publishableKey: process.env.DREAM_API_PUBLISHABLE_KEY,
});
```

## Backend Operations (SK Only)

These operations only require your secret key:

### Create Customer

```typescript
const { customer } = await api.customers.create({
  email: 'user@example.com',
  firstName: 'John',
  plan: 'free',
});
```

### Delete Customer

```typescript
await api.customers.delete(customerId);
```

### Get Dashboard Metrics

```typescript
const dashboard = await api.dashboard.get();
console.log(`MRR: $${dashboard.mrr}`);
console.log(`Active subs: ${dashboard.activeSubscriptions}`);
```

### List Products/Tiers

```typescript
const { tiers } = await api.products.listTiers();
const { products } = await api.products.list();
```

## Frontend Operations (Requires User Token)

After user signs in via Clerk, set the token:

```typescript
// Get token from Clerk
const token = await clerk.session.getToken();
api.setUserToken(token);
```

### Track Usage

```typescript
const { usage } = await api.usage.track();
console.log(`Used ${usage.used} of ${usage.limit}`);
```

### Check Usage

```typescript
const usage = await api.usage.check();
if (usage.remaining <= 0) {
  // Show upgrade prompt
}
```

### Create Checkout (Subscription Upgrade)

```typescript
const { url } = await api.billing.createCheckout({
  tier: 'pro',
  successUrl: 'https://yourapp.com/success',
  cancelUrl: 'https://yourapp.com/pricing',
});
window.location.href = url;
```

### Open Customer Portal

```typescript
const { url } = await api.billing.openPortal({
  returnUrl: 'https://yourapp.com/dashboard',
});
window.location.href = url;
```

## Auth URL Helpers

### Sign Up URL

```typescript
const signupUrl = api.auth.getSignUpUrl({
  redirect: 'https://yourapp.com/dashboard',
});

// Use in your app
<a href={signupUrl}>Sign Up</a>
```

### Sign In URL

After initial signup, users sign in via your Clerk instance directly.

## Store/E-commerce

### Cart Checkout (Guest)

```typescript
const { url } = await api.products.cartCheckout({
  items: [
    { priceId: 'price_xxx', quantity: 2 },
    { priceId: 'price_yyy', quantity: 1 },
  ],
  customerEmail: 'buyer@example.com',
  customerName: 'Jane Doe',
  successUrl: 'https://yourapp.com/success',
  cancelUrl: 'https://yourapp.com/cart',
});
```

## Error Handling

```typescript
import { DreamAPIException } from '@dream-api/sdk';

try {
  await api.usage.track();
} catch (error) {
  if (error instanceof DreamAPIException) {
    if (error.status === 403) {
      // Usage limit exceeded
      console.log('Upgrade required');
    } else if (error.status === 401) {
      // Token expired or invalid
      console.log('Please sign in again');
    }
  }
}
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  Customer,
  Usage,
  Tier,
  DashboardMetrics,
  DreamAPIConfig,
} from '@dream-api/sdk';
```

## Environment Variables

```env
DREAM_API_SECRET_KEY=sk_test_xxx
DREAM_API_PUBLISHABLE_KEY=pk_test_xxx
```

## Framework Examples

### React

```tsx
import { DreamAPI } from '@dream-api/sdk';
import { useAuth } from '@clerk/clerk-react';

const api = new DreamAPI({
  secretKey: import.meta.env.VITE_DREAM_API_SECRET_KEY,
  publishableKey: import.meta.env.VITE_DREAM_API_PUBLISHABLE_KEY,
});

function Dashboard() {
  const { getToken } = useAuth();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    async function loadUsage() {
      const token = await getToken();
      api.setUserToken(token);
      const data = await api.usage.check();
      setUsage(data);
    }
    loadUsage();
  }, []);

  return <div>Used: {usage?.used} / {usage?.limit}</div>;
}
```

### Next.js (API Route)

```typescript
// app/api/track/route.ts
import { DreamAPI } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: process.env.DREAM_API_SECRET_KEY!,
});

export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  api.setUserToken(token!);

  const result = await api.usage.track();
  return Response.json(result);
}
```

## Support

- Documentation: https://docs.dream-api.com
- Issues: https://github.com/dream-api/sdk/issues
