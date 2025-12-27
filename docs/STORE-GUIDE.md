# Store Project Guide

Building an e-commerce store with cart checkout using `@dream-api/sdk`.

---

## Overview

Store projects use **one-off payments** - customers buy products, pay once, done. No subscription, no recurring billing.

**Key difference from SaaS:** Customers do NOT need to sign in. Guest checkout works.

---

## No Auth Required

Store checkout is simpler than SaaS:

```
1. Customer browses products
2. Customer adds items to cart
3. Customer clicks "Checkout"
4. Redirected to Stripe (email collected there)
5. Payment complete → webhook fires → inventory updated
```

No sign-up, no Clerk, no JWT tokens needed.

---

## Listing Products

```typescript
const api = new DreamAPI({
  secretKey: import.meta.env.VITE_DREAM_SECRET_KEY,
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
});

// Get all products
const { products } = await api.products.list();
```

### Product Fields

```typescript
interface Product {
  id?: string;
  name: string;
  displayName?: string;
  description?: string;
  price: number;          // in DOLLARS (not cents!)
  currency?: string;      // 'usd'
  priceId: string;        // use this for checkout
  productId: string;
  imageUrl?: string;      // NOT "image"
  inventory?: number | null;
  soldOut?: boolean;      // computed from inventory <= 0
  features?: string[];    // array, not string
}
```

---

## Cart Checkout

**NO AUTH REQUIRED** - guests can checkout:

```typescript
const result = await api.products.cartCheckout({
  items: [
    { priceId: 'price_xxx', quantity: 2 },
    { priceId: 'price_yyy', quantity: 1 },
  ],
  customerEmail: 'customer@example.com',  // OPTIONAL
  successUrl: '/success',
  cancelUrl: '/cart',
});

// Redirect to Stripe
window.location.href = result.url;  // NOT result.checkoutUrl
```

### Key Points

- `customerEmail` is **optional** - Stripe collects it if not provided
- Use `priceId` from the product (not `productId`)
- Method is on `api.products` (NOT `api.billing`)

---

## Displaying Products

```tsx
function ProductCard({ product }) {
  return (
    <div>
      {/* Use imageUrl, NOT image */}
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} />
      )}

      <h3>{product.displayName || product.name}</h3>

      {/* Price is in DOLLARS - don't divide by 100 */}
      <p>${product.price.toFixed(2)}</p>

      {/* Inventory display */}
      {product.inventory !== null && (
        <span>{product.inventory} left</span>
      )}

      {/* soldOut is computed from inventory */}
      <button disabled={product.soldOut}>
        {product.soldOut ? 'Sold Out' : 'Add to Cart'}
      </button>
    </div>
  );
}
```

---

## Full Store Example

```typescript
import { useState, useEffect } from 'react';
import { DreamAPI, Product } from '@dream-api/sdk';

const api = new DreamAPI({
  secretKey: import.meta.env.VITE_DREAM_SECRET_KEY,
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
});

interface CartItem extends Product {
  quantity: number;
}

function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load products
  useEffect(() => {
    api.products.list().then(res => setProducts(res.products));
  }, []);

  // Add to cart
  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.priceId === product.priceId);
      if (existing) {
        return prev.map(item =>
          item.priceId === product.priceId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  // Checkout
  async function checkout() {
    const items = cart.map(item => ({
      priceId: item.priceId,
      quantity: item.quantity,
    }));

    const { url } = await api.products.cartCheckout({
      items,
      successUrl: window.location.origin + '/success',
      cancelUrl: window.location.origin + '/cart',
    });

    window.location.href = url;
  }

  // Calculate total (prices already in dollars)
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div>
      {/* Product Grid */}
      {products.map(product => (
        <div key={product.priceId}>
          {product.imageUrl && <img src={product.imageUrl} alt={product.name} />}
          <h3>{product.name}</h3>
          <p>${product.price.toFixed(2)}</p>
          <button
            onClick={() => addToCart(product)}
            disabled={product.soldOut}
          >
            {product.soldOut ? 'Sold Out' : 'Add to Cart'}
          </button>
        </div>
      ))}

      {/* Cart */}
      {cart.length > 0 && (
        <div>
          <h2>Cart (${total.toFixed(2)})</h2>
          {cart.map(item => (
            <div key={item.priceId}>
              {item.name} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
            </div>
          ))}
          <button onClick={checkout}>Checkout</button>
        </div>
      )}
    </div>
  );
}
```

---

## Inventory Management

- `inventory` - number of items in stock (null = unlimited)
- `soldOut` - **computed** from `inventory <= 0` (not stored)
- Inventory decremented via webhook after successful payment
- Restocking: just update inventory in dashboard, `soldOut` auto-updates

### Inventory Validation

Cart checkout validates:
1. Product exists and has a priceId
2. Product is not sold out
3. Requested quantity doesn't exceed inventory

```typescript
// This will fail if product is sold out or insufficient inventory
const { url } = await api.products.cartCheckout({
  items: [{ priceId: 'price_xxx', quantity: 100 }],  // Error if only 5 in stock
});
```

---

## Environment Setup

```env
# .env.local (gitignored)
VITE_DREAM_SECRET_KEY=sk_test_xxx
VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
```

```typescript
const api = new DreamAPI({
  secretKey: import.meta.env.VITE_DREAM_SECRET_KEY,
  publishableKey: import.meta.env.VITE_DREAM_PUBLISHABLE_KEY,
});
```

**Note:** For stores, you can technically expose the publishable key in frontend code. The secret key should still be in env vars and never committed.

---

## Gotchas

| Issue | Solution |
|-------|----------|
| `product.image` undefined | Use `product.imageUrl` |
| Price shows $0.49 instead of $49 | Price is in dollars, don't divide by 100 |
| `api.billing.cartCheckout()` doesn't exist | Use `api.products.cartCheckout()` |
| `result.checkoutUrl` undefined | Use `result.url` |
| Empty products array | Check X-Publishable-Key header (SDK handles this) |
| "Item sold out" error after restocking | Old bug - now fixed (soldOut computed from inventory) |

---

## Store vs SaaS Comparison

| Feature | Store | SaaS |
|---------|-------|------|
| Auth required | No | Yes |
| Checkout method | `products.cartCheckout()` | `billing.createCheckout()` |
| Payment type | One-time | Subscription |
| Inventory tracking | Yes | No |
| User accounts | Optional | Required |
| Usage tracking | No | Yes |

---

## See Also

- [SDK-GOTCHAS.md](./SDK-GOTCHAS.md) - General SDK issues
- [SAAS-GUIDE.md](./SAAS-GUIDE.md) - For subscription billing (auth required)
