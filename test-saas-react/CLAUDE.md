# dream-saas-basic

SaaS starter template powered by Dream API. Auth, billing, and usage tracking included.

## IMPORTANT - How This Works

**Dashboard First:** Before using this template, set up your project in the Dream API dashboard:
1. Create a project (SaaS type)
2. Configure your tiers (prices, limits, features)
3. Get your publishable key

**The template pulls everything from your dashboard.** Tiers, prices, limits - all controlled there. Change them anytime and your app updates automatically.

**The SDK is on npm.** Just `npm install` to get `@dream-api/sdk`.

**The publishable key (pk_xxx) is safe for frontend.** Like Stripe's publishable key - designed for browser code.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add your publishable key to .env.local
npm run dev
```

**That's it.** Your SaaS app now has:
- User authentication (sign up, sign in, sign out)
- Stripe billing (subscriptions, payment portal)
- Usage tracking (metered billing ready)
- Pricing page (pulls tiers from your dashboard)

Go check it out at **http://localhost:5173** - click around, try signing up. It all works. **Then come back here** - that was just the foundation.

## Testing with Clerk Test Mode

Skip email verification during development:

| Type | Value |
|------|-------|
| Test Email | Any email with `+clerk_test` (e.g., `you+clerk_test@gmail.com`) |
| Verification Code | `424242` |
| Test Phone | `+15555550100` to `+15555550199` |

**Example:** Sign up with `dev+clerk_test@example.com`, enter any password, use code `424242`. No real email sent.

## Let's Customize This Thing

**Now I can customize almost anything for you:**
- Brand name, colors, theme (dark/light)
- Headlines, copy, and messaging for YOUR product
- Feature lists with custom icons
- Pricing descriptions and tier benefits
- Hero images, logos, custom sections
- Layouts, spacing, styling tweaks
- Usage dashboard customization

**Just tell me what you're building.** "I'm building an AI writing tool" or "Make it feel more enterprise" - I'll rewrite the copy, pick the right icons, adjust the styling.

Run `/setup` for a guided walkthrough, or just start asking me to change things. This is where it gets fun.

## AI Commands

Commands for AI editors (Claude Code, Cursor, Windsurf) are in `.claude/commands/`:

- **`.claude/commands/setup.md`** - Interactive setup wizard for branding, API key, theme
- **`.claude/commands/pwa.md`** - Add Progressive Web App support (installable, works offline)

## File Structure

```
src/
├── config.ts              # EDIT THIS - all branding in one place
├── App.tsx                # Router
├── components/
│   ├── Nav.tsx            # Shared nav with profile dropdown
│   └── Icons.tsx          # Feature icons
├── hooks/
│   └── useDreamAPI.tsx    # SDK integration (DON'T MODIFY)
└── pages/
    ├── Landing.tsx        # Homepage (uses config.ts)
    ├── Dashboard.tsx      # User dashboard
    └── ChoosePlanPage.tsx # Plan selection
```

## What To Customize

### src/config.ts (MAIN FILE)
All branding is here:
- `appName` - Your app name
- `theme` - 'light' or 'dark' (one toggle switches entire app)
- `accentColor` - emerald, sky, violet, rose, amber, zinc
- `logo` - Path to logo in public/ folder
- `hero` - Headline, subheadline, image
- `socialProof` - Company logos
- `howItWorks` - 3 steps with icons
- `features` - Feature grid with icons
- `faq` - Questions and answers
- `footer` - Links

**Theme system:** Change `theme: 'dark'` to `theme: 'light'` and the entire app switches - backgrounds, text, cards, inputs, everything. No other changes needed.

### Dashboard.tsx - YOUR PRODUCT GOES HERE

The dashboard has a placeholder card marked `YOUR PRODUCT GOES HERE`.

**To add your product:**

1. Open `src/pages/Dashboard.tsx`
2. Find the comment block `YOUR PRODUCT GOES HERE`
3. Replace the demo card with your product UI
4. Keep the `api.usage.track()` call - this is how billing works

**Example - Adding a PDF Generator:**

```tsx
// Replace the demo card with:
<div className={`${theme.cardBg} rounded-xl p-6`}>
  <h2>Generate PDF</h2>
  <form onSubmit={async (e) => {
    e.preventDefault();

    // 1. Call YOUR product API
    const res = await fetch('https://your-api.com/generate-pdf', {
      method: 'POST',
      body: formData,
    });

    // 2. Track usage (THIS IS THE MAGIC LINE)
    if (res.ok) {
      await api.usage.track();  // Limits enforced automatically
      // Show success, download link, etc.
    }
  }}>
    <input type="file" name="document" />
    <button type="submit">Generate</button>
  </form>
</div>
```

**The pattern is always:**
1. User does something (uploads file, clicks button, submits form)
2. You call your backend/API
3. On success, call `await api.usage.track()`
4. Limits are automatically enforced based on their plan

## CRITICAL: Sign-Up Redirect Pattern

**Sign-up MUST redirect to `/choose-plan`, NOT `/dashboard`.**

```typescript
// CORRECT - SDK has time to consume the auth ticket
dreamAPI.auth.getSignUpUrl({ redirect: '/choose-plan' })

// WRONG - Can cause auth issues
dreamAPI.auth.getSignUpUrl({ redirect: '/dashboard' })
```

**Why this matters:**
1. After sign-up, user returns with `__clerk_ticket` in URL
2. SDK consumes ticket during `auth.init()` on the choose-plan page
3. User is now signed in and can select their plan
4. Checkout redirects to Stripe, then to dashboard

**Sign-in can redirect to `/dashboard`** - only sign-up needs `/choose-plan`.

## What NOT To Modify

1. **`src/hooks/useDreamAPI.tsx`** - Auth is handled, don't touch
2. **Auth flow** - Don't build custom sign-up/sign-in forms
3. **Pricing display** - Comes from API, don't hardcode
4. **Sign-up redirect** - Must go to `/choose-plan` (see above)

## SDK Reference

```typescript
const { api, isReady, isSignedIn, user, signOut } = useDreamAPI();

// User info
user?.email
user?.plan  // 'free', 'pro', etc.

// Usage tracking
await api.usage.track()     // Increment usage counter
await api.usage.check()     // Get current usage

// Billing
await api.billing.createCheckout({ tier: 'pro' })
await api.billing.openPortal({ returnUrl: '/dashboard' })

// Auth URLs
dreamAPI.auth.getSignUpUrl({ redirect: '/choose-plan' })  // MUST be /choose-plan
dreamAPI.auth.getSignInUrl({ redirect: '/dashboard' })
dreamAPI.auth.getCustomerPortalUrl()  // Account settings

// Public (no auth)
await dreamAPI.products.listTiers()
```

## Deployment

```bash
npm run build
```

Deploy `dist/` anywhere:
- **Cloudflare Pages**: `npx wrangler pages deploy dist`
- **Vercel/Netlify**: Connect repo, set VITE_DREAM_PUBLISHABLE_KEY env var

## What You Control in Dashboard vs Template

| In Dashboard | In Template |
|--------------|-------------|
| Tier names, prices, limits | Branding, colors, copy |
| Features per tier | Landing page content |
| Usage resets | Dashboard UI for your product |
| Customer list | Images in public/ folder |
| Revenue metrics | |

**Change tiers/prices in dashboard → App updates automatically.**

## Don't Do These Things

- Don't hardcode prices (they come from API)
- Don't put secret key in frontend (only PK)
- Don't modify useDreamAPI.tsx
- Don't build custom auth UI
- Don't add "delete account" buttons (use getCustomerPortalUrl())

## Admin Operations

Need to manage customers, view metrics, or use admin API?
That's all in the **Dream API Dashboard** - not in your frontend code.
