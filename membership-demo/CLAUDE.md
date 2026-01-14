# FitFlow - Membership Demo

Demo of Dream API membership template. Full auth + billing working out of the box.

## The Flow (Important!)

```
Landing page
    │
    └─► "Start Free Trial" button
            │
            └─► getSignUpUrl({ redirect: '/choose-plan' })
                    │
                    └─► sign-up worker → Clerk hosted signup → callback
                            │
                            └─► Sets metadata: { publishableKey, plan: 'free' }
                                    │
                                    └─► Redirects to /choose-plan
                                            │
                                            └─► ChoosePlanPage (spinning page)
                                                    │
                                                    └─► Waits for SDK to be ready
                                                            │
                                                            └─► Creates Stripe checkout
                                                                    │
                                                                    └─► User pays → /dashboard?success=true
                                                                            │
                                                                            └─► Dashboard shows content
```

**Key insight:**
- Sign-up worker gets users into Clerk with `plan='free'`
- ChoosePlanPage is the "spinning page" that waits for SDK and creates checkout
- Dashboard is for paid members only

## File Structure

```
src/
├── config.ts              # EDIT THIS - all branding + content
├── App.tsx                # Router
├── components/
│   ├── Nav.tsx            # Shared nav with profile dropdown
│   └── Icons.tsx          # Feature icons
├── hooks/
│   └── useDreamAPI.tsx    # SDK integration (DON'T MODIFY)
└── pages/
    ├── Landing.tsx        # Public homepage
    ├── ChoosePlanPage.tsx # Spinning page - waits for SDK, creates checkout
    └── Dashboard.tsx      # Member area (paid users only)
```

## How It Works

### 1. Sign-Up (via sign-up worker)
All new users go through: `dreamAPI.auth.getSignUpUrl({ redirect: '/choose-plan' })`

This routes to the sign-up worker which:
- Validates the publishable key
- Redirects to Clerk hosted signup
- After signup, sets `publicMetadata: { publishableKey, plan: 'free' }`
- Syncs user to D1
- Redirects to `/choose-plan`

### 2. ChoosePlanPage (The Spinning Page)
This is critical - it properly waits for the SDK:
```typescript
// Wait for SDK to be ready
if (!isReady) return;

// Wait for tier to load
if (!paidTier) return;

// Now we know auth state - create checkout
const result = await api.billing.createCheckout({...});
window.location.href = result.url;
```

User sees a spinner while this happens. No race conditions.

### 3. After Payment
Stripe redirects to `/dashboard?success=true` → Dashboard shows member content.

## SDK Usage

```typescript
const { api, isReady, isSignedIn, user, signOut } = useDreamAPI();

// User info
user?.email
user?.plan  // 'free' or 'pro'

// Auth URLs
dreamAPI.auth.getSignUpUrl({ redirect: '/choose-plan' })  // New users
dreamAPI.auth.getSignInUrl({ redirect: '/dashboard' })    // Returning users
dreamAPI.auth.getCustomerPortalUrl()                      // Account settings (Clerk)

// Billing
api.billing.createCheckout({ tier, priceId, successUrl, cancelUrl })
api.billing.openPortal({ returnUrl })  // Stripe billing portal
```

## Content Gating (Simple)

```typescript
const plan = user?.plan || 'free';
const hasPaidAccess = plan !== 'free';

{hasPaidAccess ? <YourContent /> : <UpgradePrompt />}
```

**No usage tracking needed.** Just check plan.

## Customization

Edit `src/config.ts`:
- `appName` - Site name
- `theme` - 'light' or 'dark'
- `accentColor` - emerald, sky, violet, rose, amber, zinc
- `hero` - Landing page headline
- `memberContent` - Cards shown to paid members
- `testimonials` - Social proof
- `faq` - FAQ items

## Commands

- `/setup` - AI-guided configuration wizard
- `/pwa` - Add installable app support

## Don't Modify

1. `src/hooks/useDreamAPI.tsx` - SDK integration is wired up
2. Auth flow - Don't build custom sign-up forms
3. ChoosePlanPage flow - It properly waits for SDK

## Environment

```
VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
```

Get your key from the Dream API dashboard.

## Demo Mode

This demo uses Dream API's own test keys. You can:
- Sign up with any email
- Use test card `4242 4242 4242 4242`
- Complete the full checkout flow

## Deployment

```bash
npm run build
# Deploy dist/ to Cloudflare Pages, Vercel, or Netlify
```

Set `VITE_DREAM_PUBLISHABLE_KEY` as environment variable.
