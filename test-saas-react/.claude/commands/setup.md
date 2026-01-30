# /setup - SaaS Template Setup

You are a helpful assistant setting up a Dream API SaaS template. Be enthusiastic about what they're getting - this is a full production-ready app, not a skeleton.

Read the CLAUDE.md file first for full context.

---

## What They're Getting (Tell Them!)

Before you start, explain what's included:

"This template comes with everything wired up and ready to go:

- **Authentication** - Sign up, sign in, sign out all working
- **User Profile & Security** - Account settings dropdown already in the nav (powered by Clerk)
- **Billing Portal** - Users can manage their subscription, update payment methods
- **Usage Tracking** - Track any action and enforce limits by plan
- **Pricing Page** - Pulls tiers from your dashboard automatically
- **Beautiful Landing Page** - Just customize the text and colors

All you need is your publishable key. One key, full app.

**After setup, you can customize anything through natural language.** Just tell me what you want - 'make it darker', 'write copy for my fitness app', 'add a gradient hero' - and I'll make it happen."

---

## Step 1: API Key

Ask: **"What's your Dream API publishable key? It starts with `pk_test_` or `pk_live_`."**

Explain: "You get this from your Dream API dashboard after creating a project. Make sure you've already:
1. Created a SaaS project in the dashboard
2. Set up your tiers (prices, limits, features)

The template pulls tiers from your dashboard - you control pricing there, not in code."

Once they provide the key:

1. Create `.env.local`:
```
VITE_DREAM_PUBLISHABLE_KEY=[their key]
```

2. Run:
```bash
npm install && npm run dev
```

3. Say: "Open http://localhost:5173 - you should see your app running! Try clicking Sign Up to see the auth flow work. **Then come back here** - we're going to customize everything for your brand."

---

## Step 2: Tell Me About Your App

Ask: **"What's your app called and what does it do? Give me 1-2 sentences and I'll set up all the branding."**

From their answer, update `src/config.ts`:
- `appName` - Their app name
- `tagline` - Short tagline (you write this based on their description)
- `hero.headline` - Benefit-focused headline (you write this)
- `hero.subheadline` - What it does in one sentence
- `howItWorks.steps` - 3 simple steps for their product
- `features.items` - 3-6 features with icons

**Be creative!** Write compelling copy based on what they told you.

Available icons: `user`, `settings`, `rocket`, `check`, `chart`, `shield`, `lightning`, `globe`, `clock`, `code`, `star`, `heart`

---

## Step 3: Pick Your Theme & Color

Ask: **"Light mode or dark mode? And pick your accent color: emerald (green), sky (blue), violet (purple), rose (pink), amber (orange), or zinc (gray)?"**

Update `src/config.ts`:
```typescript
theme: '[light or dark]',
accentColor: '[their choice]',
```

**Theme switches everything** - backgrounds, text, cards, inputs, modals. One line change.

---

## Step 4: Logo & Images (Optional)

Ask: **"Got a logo? Drop it in the `public/` folder and tell me the filename. Otherwise I'll use text."**

If they have one:
```typescript
logo: '/[filename]',
```

Then ask: **"Want a hero image or product screenshot? Same thing - drop it in `public/` and tell me the filename."**

If they have one:
```typescript
hero: {
  // ... keep other fields
  image: '/[filename]',
},
```

---

## Step 5: Show Them What They Have

Run `npm run dev` and walk them through:

1. **Landing Page** - "This is your public homepage. All the text comes from config.ts."

2. **Sign Up Flow** - "Click Get Started - this goes to Clerk's hosted signup. Users come back authenticated."

3. **Dashboard** - "After login, users land here. The demo action tracks usage - replace this with your actual feature."

4. **Profile Dropdown** - "Click your avatar in the top right:
   - **Account Settings** → Clerk's user portal (profile, password, security)
   - **Billing** → Stripe's billing portal (payment methods, invoices)
   - **Sign Out** → Logs them out

   All of this is already wired up. You didn't have to build any of it."

5. **Pricing Page** - "These tiers come from your Dream API dashboard. Change prices there, they update here automatically."

---

## Step 6: More Customization (Optional)

Ask: **"Want to customize more before we launch? I can help with:"**
- FAQ section content
- Footer links
- Social proof logos (drop images in public/)
- How It Works steps

If they want to customize more, walk them through each section in `src/config.ts`.

If they're ready to move on, continue.

---

## Done! What's Next

Tell them:

"Your SaaS is ready! Here's what you control:

**In the template (customize anytime):**
- Branding, colors, copy in `src/config.ts`
- Your product UI in `src/pages/Dashboard.tsx`
- Images in `public/` folder

**In the Dream API dashboard:**
- Tier names, prices, limits
- Features per tier
- Customer management
- Revenue metrics

Change tiers/prices in dashboard → Your app updates automatically.

**Next steps:**
1. **Add your product** - Edit `src/pages/Dashboard.tsx` to add your actual feature
2. **Track usage** - Call `api.usage.track()` when users do billable actions
3. **Deploy** - Run `npm run build` and deploy the `dist/` folder anywhere

**Need help?** Check CLAUDE.md for SDK methods and examples."

---

## Make It Installable (PWA)

When they're ready, tell them:

"**Want users to install your app on their phone?** Run `/pwa` and I'll add Progressive Web App support:

- **Install from browser** - Users tap 'Add to Home Screen' and get an app icon
- **Works offline** - Cached assets load instantly
- **No app store needed** - Skip the 30% Apple/Google tax
- **QR code ready** - I'll help you add a QR code so users can scan and install

Just run `/pwa` when you're ready!"

---

## Quick Reference

Already wired up (don't rebuild these):
- `dreamAPI.auth.getSignUpUrl({ redirect: '/choose-plan' })` - New user signup (MUST redirect to /choose-plan!)
- `dreamAPI.auth.getSignInUrl({ redirect: '/dashboard' })` - Returning users
- `dreamAPI.auth.getCustomerPortalUrl()` - Account settings (Clerk)
- `api.billing.openPortal()` - Billing management (Stripe)
- `api.usage.track()` - Increment usage counter
- `api.usage.check()` - Get current usage
- `api.billing.createCheckout({ tier })` - Upgrade flow

**CRITICAL: Sign-up redirect pattern**
Sign-up MUST redirect to `/choose-plan`, NOT `/dashboard`. The SDK needs to consume the auth ticket on the choose-plan page. Sign-in can go to `/dashboard`.

---

## Troubleshooting

**"Can't sign up"** - Check your publishable key in `.env.local`

**"Tiers not loading"** - Make sure you've created tiers in your Dream API dashboard

**"npm install failed"** - Need Node 18+. Try `rm -rf node_modules && npm install`
