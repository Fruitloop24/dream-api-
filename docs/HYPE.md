# Dream API

**Auth. Billing. Usage Tracking. One API.**

## What You Get

One SDK. One publishable key. Done.

```bash
npm install @dream-api/sdk
```

```typescript
const api = new DreamAPI({ publishableKey: 'pk_xxx' });
```

That's your entire backend for auth, billing, and usage tracking.

---

## What It Does

### Authentication
- Users sign up and sign in
- JWT-based sessions
- Google, email, 20+ providers
- Account management portal included

### Billing
- Subscription tiers with usage limits
- One-time purchases
- Checkout sessions
- Customer billing portal
- You keep your money (Stripe Connect - funds go direct to you)

### Usage Tracking
- Track any action: API calls, tokens, generations, whatever
- Enforce limits by plan
- Users see their usage
- Automatic reset each billing period

### E-Commerce
- Products with images and inventory
- Guest checkout (no account needed)
- Order tracking
- Stock management

---

## What You Don't Do

| Normally You'd Build | With Dream API |
|---------------------|----------------|
| Auth system | ✓ Handled |
| Stripe integration | ✓ Handled |
| Webhook handlers | ✓ Handled |
| Usage database | ✓ Handled |
| Plan enforcement | ✓ Handled |
| Billing portal | ✓ Handled |
| Customer management | ✓ Handled |
| Multi-tenant isolation | ✓ Handled |

---

## The Dashboard

Manage everything from one place:

**Projects**
- Create SaaS or Store projects
- Get your API keys instantly
- Switch between Test and Live mode

**Tiers & Pricing**
- Set prices, limits, features
- Changes sync to Stripe automatically
- Mark tiers as popular

**Products** (Store mode)
- Add products with images
- Set prices, manage inventory
- Track stock levels

**Customers**
- See all your users
- View their plan, usage, status
- Know who's about to hit limits

**Metrics**
- MRR, active subscriptions
- Usage this period
- Revenue tracking

**Webhooks**
- See every Stripe event
- Know when things happen
- Debug without guessing

---

## How It Works

1. **Sign up** → Connect your Stripe account (OAuth, takes 30 seconds)
2. **Create project** → Get your publishable key
3. **Set up tiers** → Prices and limits in the dashboard
4. **Install SDK** → `npm install @dream-api/sdk`
5. **Add one line** → `new DreamAPI({ publishableKey: 'pk_xxx' })`
6. **Build your thing** → We handle the rest

No webhook endpoints to build. No Stripe SDK to learn. No auth system to maintain.

---

## Test Mode → Live Mode

Start in test mode. Everything works with test data.

When ready:
1. Click "Go Live" in dashboard
2. Get your live keys
3. Deploy

Same code. Same API. Real money.

---

## SDK Methods

```typescript
// Auth
api.auth.getSignUpUrl()      // New user signup
api.auth.getSignInUrl()      // Returning user
api.auth.getCustomerPortalUrl()  // Account settings

// Usage (SaaS)
api.usage.track()            // Count an action
api.usage.check()            // Get usage + remaining

// Billing
api.billing.createCheckout({ tier: 'pro' })  // Upgrade flow
api.billing.openPortal()     // Manage subscription

// Products (Store)
api.products.list()          // Get products
api.products.listTiers()     // Get subscription tiers
api.products.cartCheckout()  // Guest purchase
```

---

## Security

- **Your keys stay safe** - Publishable key is designed for frontend (like Stripe)
- **Plans can't be spoofed** - Stored in signed JWT, set by webhooks only
- **Data is isolated** - Each project's data is separated by API key
- **Payments are secure** - Stripe handles all card data (PCI compliant)

---

## Pricing

You pay Stripe's normal fees. That's it.

We take a small percentage of transactions processed through the API. You make money, we make money.

---

## Free Templates (Optional)

Want a head start? We have React templates:

- **dream-saas-basic** - Usage-metered SaaS starter
- **dream-store-basic** - E-commerce with guest checkout

Templates have AI-assisted setup. Clone, configure with your AI editor, deploy.

But you don't need them. The SDK works with any frontend.

---

## Who It's For

- **SaaS builders** - Usage tracking and subscription billing
- **AI wrapper makers** - Meter tokens, API calls, generations
- **Course creators** - Gated content with subscriptions
- **E-commerce** - Products and guest checkout
- **Side projects** - Ship fast, don't build infrastructure

---

## Get Started

```bash
npm install @dream-api/sdk
```

Sign up at [dashboard URL] → Create project → Get your key → Build.

---

**Dream API** - One key. Full backend.
