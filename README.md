# dream-api

**API-as-a-Service for indie devs.** $15/mo gets you auth, billing, usage tracking, and a dashboard.

## What You Get

- **API Keys** - Publishable + Secret key pair
- **Stripe Billing** - On YOUR Stripe account via Connect
- **Usage Tracking** - Limits enforced per tier
- **Dashboard** - Customers, MRR, usage metrics
- **Webhooks Handled** - We handle everything internally

## Quick Start

1. Sign up at https://dream-frontend-dyn.pages.dev
2. Connect Stripe via OAuth
3. Choose: **SaaS** or **Store** (locked per project)
4. Configure tiers/products
5. Get your API keys
6. Integrate into your app

## API Base URL

```
https://api-multi.k-c-sheffield012376.workers.dev
```

## Authentication

All API calls require your secret key:

```
Authorization: Bearer sk_test_xxx
```

## Test vs Live

- `pk_test_` / `sk_test_` - Stripe test mode
- `pk_live_` / `sk_live_` - Real payments

## SaaS Mode - Subscription Tiers

### 1. Create Customer

```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customers \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "plan": "free"
  }'
```

Response:
```json
{
  "success": true,
  "customer": {
    "id": "user_abc123",
    "email": "user@example.com",
    "plan": "free"
  }
}
```

### 2. Track Usage

Call this on every API request to track and enforce limits:

```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/data \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_abc123" \
  -H "X-User-Plan: free"
```

Success Response:
```json
{
  "success": true,
  "data": { "message": "Request processed successfully" },
  "usage": { "count": 1, "limit": 100, "plan": "free" }
}
```

Limit Reached (403):
```json
{
  "error": "Tier limit reached",
  "usageCount": 100,
  "limit": 100,
  "message": "Please upgrade to unlock more requests"
}
```

### 3. Check Usage

```bash
curl -X GET https://api-multi.k-c-sheffield012376.workers.dev/api/usage \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_abc123" \
  -H "X-User-Plan: free"
```

### 4. Create Upgrade Checkout

```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/create-checkout \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_abc123" \
  -H "Content-Type: application/json" \
  -H "Origin: https://yourapp.com" \
  -d '{"tier": "pro"}'
```

Or with explicit priceId:
```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/create-checkout \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_abc123" \
  -H "Content-Type: application/json" \
  -H "Origin: https://yourapp.com" \
  -d '{"priceId": "price_xxx"}'
```

Response:
```json
{ "url": "https://checkout.stripe.com/c/pay/..." }
```

### 5. Customer Portal (Billing Management)

```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customer-portal \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-User-Id: user_abc123" \
  -H "Origin: https://yourapp.com"
```

## Store Mode - One-Off Products

### List Products

```bash
curl -X GET https://api-multi.k-c-sheffield012376.workers.dev/api/products \
  -H "Authorization: Bearer sk_test_xxx"
```

### Cart Checkout

```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/cart/checkout \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "Content-Type: application/json" \
  -H "Origin: https://yourapp.com" \
  -d '{
    "email": "buyer@example.com",
    "items": [
      { "priceId": "price_xxx", "quantity": 1 }
    ],
    "successUrl": "https://yourapp.com/success",
    "cancelUrl": "https://yourapp.com/cancel"
  }'
```

## Dashboard Endpoint

Get metrics for your platform:

```bash
curl -X GET https://api-multi.k-c-sheffield012376.workers.dev/api/dashboard \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Publishable-Key: pk_test_xxx"
```

## Required Headers Summary

| Endpoint | Required Headers |
|----------|------------------|
| All endpoints | `Authorization: Bearer sk_xxx` |
| `/api/data`, `/api/usage` | + `X-User-Id`, `X-User-Plan` |
| `/api/create-checkout` | + `X-User-Id`, `Origin` |
| `/api/customer-portal` | + `X-User-Id`, `Origin` |
| `/api/cart/checkout` | + `Origin` |
| `/api/dashboard` | + `X-Publishable-Key` |

## Local Development

```bash
cd frontend && npm run dev        # :5173
cd front-auth-api && npm run dev  # :8788
cd oauth-api && npm run dev       # :8789
cd api-multi && npm run dev       # :8787
```

## Deploy

Auto-deploy via GitHub → Cloudflare:
```bash
git add -A && git commit -m "message" && git push
```

## Technical Reference

See [CLAUDE.md](./CLAUDE.md) for architecture, database schemas, and debugging.
