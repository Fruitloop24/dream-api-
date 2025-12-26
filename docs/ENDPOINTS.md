# API Endpoints Reference

## Authentication

All endpoints require authentication via headers:

| Header | Value | Required For |
|--------|-------|--------------|
| `Authorization` | `Bearer sk_xxx` | All endpoints |
| `X-Clerk-Token` | JWT from Clerk | User-specific endpoints |
| `X-Publishable-Key` | `pk_xxx` | Override project filter |

---

## api-multi Endpoints

**Base URL:** `https://api-multi.k-c-sheffield012376.workers.dev`

### Customers (SK Only)

| Method | Endpoint | Description | SDK Method |
|--------|----------|-------------|------------|
| `POST` | `/api/customers` | Create customer in Clerk | `api.customers.create()` |
| `GET` | `/api/customers/:id` | Get customer by ID | `api.customers.get()` |
| `PATCH` | `/api/customers/:id` | Update customer plan | `api.customers.update()` |
| `DELETE` | `/api/customers/:id` | Delete customer + cleanup | `api.customers.delete()` |

**Create Customer Request:**
```json
{
  "email": "user@example.com",
  "password": "optional",
  "firstName": "John",
  "lastName": "Doe",
  "plan": "free"
}
```

**Create Customer Response:**
```json
{
  "success": true,
  "customer": {
    "id": "user_xxx",
    "email": "user@example.com",
    "plan": "free",
    "publishableKey": "pk_test_xxx",
    "createdAt": 1703980800000
  }
}
```

---

### Usage Tracking (SK + JWT)

| Method | Endpoint | Description | SDK Method |
|--------|----------|-------------|------------|
| `POST` | `/api/data` | Increment usage counter | `api.usage.track()` |
| `GET` | `/api/usage` | Check current usage | `api.usage.check()` |

**Usage Check Response:**
```json
{
  "usage": {
    "used": 5,
    "limit": 100,
    "plan": "pro",
    "periodStart": "2025-12-01",
    "periodEnd": "2025-12-31",
    "remaining": 95,
    "percentUsed": 5
  }
}
```

**Track Usage Response:**
```json
{
  "success": true,
  "usage": {
    "used": 6,
    "limit": 100,
    "remaining": 94
  }
}
```

**Limit Exceeded Response (403):**
```json
{
  "error": "Usage limit exceeded",
  "usage": { "used": 100, "limit": 100 }
}
```

---

### Billing (SK + JWT)

| Method | Endpoint | Description | SDK Method |
|--------|----------|-------------|------------|
| `POST` | `/api/create-checkout` | Create Stripe checkout | `api.billing.createCheckout()` |
| `POST` | `/api/customer-portal` | Open Stripe portal | `api.billing.openPortal()` |

**Create Checkout Request:**
```json
{
  "tier": "pro",
  "priceId": "price_xxx",
  "successUrl": "https://app.com/success",
  "cancelUrl": "https://app.com/cancel"
}
```

**Checkout Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### Products - Store Mode (SK Only)

| Method | Endpoint | Description | SDK Method |
|--------|----------|-------------|------------|
| `GET` | `/api/products` | List one-off products | `api.products.list()` |
| `POST` | `/api/cart/checkout` | Cart checkout | `api.products.cartCheckout()` |

**Products Response:**
```json
{
  "products": [
    {
      "id": "prod_xxx",
      "name": "t-shirt",
      "displayName": "Cool T-Shirt",
      "description": "A very cool shirt",
      "price": 29.99,
      "currency": "usd",
      "imageUrl": "/api/assets/plt_xxx/123-shirt.png",
      "inventory": 50,
      "soldOut": false,
      "priceId": "price_xxx",
      "productId": "prod_xxx",
      "features": ["100% cotton", "Machine washable"]
    }
  ]
}
```

**Cart Checkout Request:**
```json
{
  "items": [
    { "priceId": "price_xxx", "quantity": 2 },
    { "priceId": "price_yyy", "quantity": 1 }
  ],
  "email": "buyer@example.com",
  "successUrl": "https://store.com/success",
  "cancelUrl": "https://store.com/cart"
}
```

---

### Tiers - SaaS Mode (SK Only)

| Method | Endpoint | Description | SDK Method |
|--------|----------|-------------|------------|
| `GET` | `/api/tiers` | List subscription tiers | `api.products.listTiers()` |

**Tiers Response:**
```json
{
  "tiers": [
    {
      "name": "free",
      "displayName": "Free",
      "price": 0,
      "limit": 100,
      "priceId": null,
      "productId": null,
      "features": ["100 API calls/month"]
    },
    {
      "name": "pro",
      "displayName": "Pro",
      "price": 29,
      "limit": 10000,
      "priceId": "price_xxx",
      "productId": "prod_xxx",
      "features": ["10,000 API calls/month", "Priority support"],
      "popular": true
    }
  ]
}
```

---

### Dashboard (SK Only)

| Method | Endpoint | Description | SDK Method |
|--------|----------|-------------|------------|
| `GET` | `/api/dashboard` | Platform metrics | `api.dashboard.get()` |
| `GET` | `/api/dashboard/totals` | Aggregate totals | `api.dashboard.getTotals()` |

**Dashboard Response (SaaS):**
```json
{
  "activeSubscriptions": 15,
  "cancelingSubscriptions": 2,
  "mrr": 435,
  "usageThisPeriod": 1250,
  "customers": [
    {
      "id": "user_xxx",
      "email": "customer@example.com",
      "plan": "pro",
      "usage": 45,
      "limit": 10000,
      "status": "active",
      "renewsAt": "2025-01-15"
    }
  ],
  "tiers": [...],
  "webhookStatus": {
    "url": "https://api-multi.../webhook/stripe",
    "lastEvent": "2025-12-26T14:30:00Z",
    "recentEvents": [
      { "type": "customer.subscription.created", "timestamp": "..." }
    ]
  }
}
```

**Dashboard Response (Store):**
```json
{
  "totalSales": 127,
  "totalRevenue": 3825.50,
  "avgOrderValue": 30.12,
  "products": [...],
  "orders": [
    {
      "customer": "John Doe",
      "email": "buyer@example.com",
      "amount": 59.98,
      "paymentId": "pi_xxx",
      "date": "2025-12-26T10:30:00Z"
    }
  ],
  "webhookStatus": {...}
}
```

---

### Assets (SK Only)

| Method | Endpoint | Description | SDK Method |
|--------|----------|-------------|------------|
| `POST` | `/api/assets` | Upload image to R2 | Not in SDK yet |
| `GET` | `/api/assets/:key` | Get image from R2 | Direct URL |

**Upload Request:**
```json
{
  "filename": "product.png",
  "contentType": "image/png",
  "data": "base64encodeddata..."
}
```

**Upload Response:**
```json
{
  "key": "plt_xxx/1703980800000-product.png",
  "url": "/api/assets/plt_xxx/1703980800000-product.png"
}
```

---

### Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhook/stripe` | Stripe Connect webhook |

**Handled Events:**
- `checkout.session.completed` - Update plan, decrement inventory
- `customer.subscription.created` - Record subscription
- `customer.subscription.updated` - Update plan in Clerk
- `customer.subscription.deleted` - Downgrade to free

---

## oauth-api Endpoints

**Base URL:** `https://oauth-api.k-c-sheffield012376.workers.dev`

**Auth:** Clerk JWT (dev user)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/authorize` | Start Stripe Connect OAuth |
| `GET` | `/callback` | Stripe OAuth callback |
| `POST` | `/create-products` | Create project with products/tiers |
| `GET` | `/tiers` | List tiers for platform |
| `PUT` | `/tiers` | Update tier properties |
| `POST` | `/tiers/add` | Add new tier to project |
| `DELETE` | `/tiers` | Delete a tier |
| `POST` | `/promote-to-live` | Promote test project to live |

---

## front-auth-api Endpoints

**Base URL:** `https://front-auth-api.k-c-sheffield012376.workers.dev`

**Auth:** Clerk JWT (dev user)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/credentials` | Get dev's API keys |
| `POST` | `/credentials/regenerate` | Regenerate secret key |
| `GET` | `/projects` | List dev's projects |
| `POST` | `/projects` | Create new project |
| `DELETE` | `/projects/:pk` | Delete project + cleanup |
| `POST` | `/webhook/clerk` | Clerk webhook for dev events |

---

## sign-up Endpoints

**Base URL:** `https://sign-up.k-c-sheffield012376.workers.dev`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/signup?pk=xxx&redirect=url` | Render signup page |
| `GET` | `/complete` | OAuth callback |
| `POST` | `/oauth/complete` | Set metadata + D1 sync |
| `GET` | `/verify` | Email verification callback |
| `POST` | `/sync` | Manual D1 sync |

---

## SDK Coverage

| Endpoint | In SDK | Method |
|----------|--------|--------|
| `POST /api/customers` | Yes | `api.customers.create()` |
| `GET /api/customers/:id` | Yes | `api.customers.get()` |
| `PATCH /api/customers/:id` | Yes | `api.customers.update()` |
| `DELETE /api/customers/:id` | Yes | `api.customers.delete()` |
| `POST /api/data` | Yes | `api.usage.track()` |
| `GET /api/usage` | Yes | `api.usage.check()` |
| `POST /api/create-checkout` | Yes | `api.billing.createCheckout()` |
| `POST /api/customer-portal` | Yes | `api.billing.openPortal()` |
| `GET /api/products` | Yes | `api.products.list()` |
| `GET /api/tiers` | Yes | `api.products.listTiers()` |
| `POST /api/cart/checkout` | Yes | `api.products.cartCheckout()` |
| `GET /api/dashboard` | Yes | `api.dashboard.get()` |
| `GET /api/dashboard/totals` | Yes | `api.dashboard.getTotals()` |
| `POST /api/assets` | **No** | - |
| `GET /api/assets/:key` | **No** | Direct URL |
| Sign-up URL | Yes | `api.auth.getSignUpUrl()` |

---

## Error Responses

All errors follow this format:

```json
{
  "error": "error_code",
  "message": "Human readable message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Invalid or missing authentication |
| 403 | Usage limit exceeded / forbidden |
| 404 | Resource not found |
| 500 | Server error |
