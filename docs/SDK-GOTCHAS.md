# SDK & API Gotchas

Common issues encountered when building with `@dream-api/sdk`.

**Project-specific guides:**
- [SAAS-GUIDE.md](./SAAS-GUIDE.md) - Subscription billing (requires auth)
- [STORE-GUIDE.md](./STORE-GUIDE.md) - Cart checkout (no auth needed)

---

## Which Project Type?

| Building... | Project Type | Auth Required | Checkout Method |
|-------------|--------------|---------------|-----------------|
| SaaS with subscriptions | SaaS | Yes (Clerk JWT) | `api.billing.createCheckout()` |
| E-commerce store | Store | No (guest OK) | `api.products.cartCheckout()` |

**Using wrong keys?** SaaS keys won't have products. Store keys won't have subscription tiers.

---

## Setup

### Key Placement
```
Backend .env (server-side only):
  DREAM_SECRET_KEY=sk_test_xxx      # NEVER in frontend!

Frontend .env (compiled into bundle, that's OK):
  VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
```

**Never commit `.env` files. Never put SK in frontend code.**

### Two SDK Modes

```typescript
// FRONTEND (React, Vue, browser) - PK only, safe to expose
const api = new DreamAPI({
  publishableKey: 'pk_test_xxx',
});
// Can access: tiers, products, usage (with JWT), billing (with JWT)
// Cannot access: customers, dashboard (requires SK)

// BACKEND (Node, Workers, API routes) - Full access
const api = new DreamAPI({
  secretKey: process.env.DREAM_SECRET_KEY,
  publishableKey: 'pk_test_xxx',
});
// Can access: everything
```

---

## API Response Gotchas

### 1. Prices are in DOLLARS, not cents

**Wrong:**
```typescript
${(product.price / 100).toFixed(2)}  // Shows $0.49 instead of $49.00
```

**Right:**
```typescript
${product.price.toFixed(2)}  // Shows $49.00
```

### 2. Image field is `imageUrl`, not `image`

**Wrong:**
```typescript
<img src={product.image} />  // undefined
```

**Right:**
```typescript
<img src={product.imageUrl} />  // works
```

### 3. Product type includes these fields

```typescript
interface Product {
  id?: string;
  name: string;
  displayName?: string;
  description?: string;
  price: number;          // dollars, not cents
  currency?: string;
  priceId: string;
  productId: string;
  imageUrl?: string;      // not "image"
  inventory?: number | null;
  soldOut?: boolean;
  features?: string[];
}
```

---

## SDK Method Gotchas

### 4. Cart checkout is on `products`, not `billing`

**Wrong:**
```typescript
await api.billing.cartCheckout({...})  // doesn't exist
```

**Right:**
```typescript
await api.products.cartCheckout({...})
```

### 5. Checkout returns `url`, not `checkoutUrl`

**Wrong:**
```typescript
window.location.href = result.checkoutUrl  // undefined
```

**Right:**
```typescript
window.location.href = result.url
```

### 6. Cart checkout email is optional

```typescript
await api.products.cartCheckout({
  items: [{ priceId: 'price_xxx', quantity: 1 }],
  customerEmail: 'optional@example.com',  // optional
  successUrl: '/success',
  cancelUrl: '/cart',
})
```

### 7. Features is an ARRAY, not a string

**Wrong:**
```typescript
tier.features.split(',').map(...)  // TypeError: split is not a function
```

**Right:**
```typescript
// features is already an array
tier.features.map(feature => <li>{feature}</li>)

// Or handle both (legacy compatibility):
const featureList = Array.isArray(tier.features)
  ? tier.features
  : tier.features?.split(',') || [];
```

---

## API Behavior Gotchas

### 8. Products require X-Publishable-Key header

The SDK handles this automatically, but if calling API directly:

```bash
curl -H "Authorization: Bearer sk_xxx" \
     -H "X-Publishable-Key: pk_xxx" \
     https://api-multi.../api/products
```

Without PK header, returns empty `{ products: [] }`.

### 9. Inventory updates don't auto-refresh in frontend

When you update inventory in dashboard, frontend won't see it until page refresh.
Products API always returns fresh data from D1.

### 10. soldOut is computed from inventory

`soldOut` is calculated as `inventory <= 0`, not stored separately.
If product has `inventory: 5`, it's not sold out regardless of any stored value.

---

## Tailwind v4 (if using)

### 11. Tailwind v4 PostCSS plugin moved

**Old (v3):**
```javascript
// postcss.config.js
plugins: { tailwindcss: {} }
```

**New (v4):**
```javascript
// postcss.config.js
plugins: { '@tailwindcss/postcss': {} }
```

And CSS imports:
```css
/* Old */
@tailwind base;

/* New */
@import "tailwindcss";
```

---

## Quick Reference

| What you might try | What actually works |
|--------------------|---------------------|
| `product.image` | `product.imageUrl` |
| `price / 100` | `price` (already dollars) |
| `result.checkoutUrl` | `result.url` |
| `api.billing.cartCheckout()` | `api.products.cartCheckout()` |
| `customerEmail` required | `customerEmail` optional |
| `features.split(',')` | `features` (already array) |
| SaaS checkout without auth | Must call `setUserToken()` first |

---

## Environment Setup Template

```env
# .env.local (gitignored)
DREAM_SECRET_KEY=sk_test_xxx
VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
```

```typescript
// app.ts
const api = new DreamAPI({
  secretKey: process.env.DREAM_SECRET_KEY!,
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
})
```
