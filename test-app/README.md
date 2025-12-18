# Dream API Test Console

A local testing tool for validating SaaS and Store integrations with secure JWT authentication.

## Setup

1. Copy `config.example.js` to `config.js`
2. Fill in your keys:
   - **clerkPublishableKey**: From `api-multi/.dev.vars` (end-user Clerk app)
   - **secretKey**: From your project after creating products in the dashboard

```js
window.TEST_CONFIG = {
  clerkPublishableKey: 'pk_test_...',
  secretKey: 'sk_test_...',
  apiUrl: 'https://api-multi.k-c-sheffield012376.workers.dev',
};
```

3. Open `index.html` with Live Server or any local HTTP server

## Testing SaaS Flow

1. **Initialize Clerk** - Click the button to load Clerk authentication
2. **Sign In** - Use your test user credentials (created via POST /api/customers)
3. **Track Usage** - Click "POST /api/data" to increment usage
4. **Hit Limit** - Click "Spam Until Limit" to quickly hit the tier limit
5. **Upgrade** - Click "Upgrade to Pro" to test Stripe checkout

## Testing Store Flow

1. Switch to **Store Mode** tab
2. **Load Products** - Fetches products from your store project
3. **Add to Cart** - Click a product to set its priceId
4. **Checkout** - Enter email and click Checkout for Stripe

## Security Model

- **JWT Required**: Usage tracking (`/api/data`, `/api/usage`) requires a valid Clerk JWT
- **Plan in Token**: User's plan is embedded in JWT's `publicMetadata.plan` - cannot be spoofed
- **SK Only**: Product listing, cart checkout, and customer creation only need the secret key

## Creating Test Users

```bash
curl -X POST https://api-multi.k-c-sheffield012376.workers.dev/api/customers \
  -H "Authorization: Bearer sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "plan": "free"
  }'
```

Then sign in with those credentials in the test app.
