<p align="center">
  <img src="https://raw.githubusercontent.com/Fruitloop24/dream-membership-basic/main/public/dream-logo.svg" alt="Dream API" width="120" />
</p>

<h1 align="center">Dream Membership Template</h1>

<p align="center">
  <strong>Your content. Your community. Payments handled.</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#why-dream-api">Why Dream API</a> •
  <a href="#manual-setup">Manual Setup</a> •
  <a href="#deploy">Deploy</a>
</p>

---

## Quick Start

Open this project in **Claude Code**, **Cursor**, or **Windsurf** and run:

```
/setup
```

That's it. The AI walks you through everything:
- 🔑 **API Key** - Paste your publishable key, done
- 🎯 **Positioning** - Tell it your niche, it writes headlines that convert
- ✍️ **Copy** - Describe your value, it writes the sales pitch
- 💬 **Testimonials** - It'll even draft social proof for you to customize
- 🎨 **Vibe** - Premium? Friendly? Exclusive? Just tell it

**"I teach indie hackers how to validate ideas fast"** → Done. Branded. Ready to sell.

---

## Why Dream API?

You've got content people will pay for. Courses, tutorials, exclusive access, community - whatever your thing is. You don't want to wire up Stripe subscriptions or build auth flows. You want to create.

**Dream API handles the business stuff.** You handle the magic.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   You create ────────►  YOUR CONTENT                    │
│                         Courses · Videos · Downloads    │
│                         Community · Coaching            │
│                                                         │
│   We handle ─────────►  Auth · Subscriptions            │
│                         Content gating · Billing        │
│                         Member management               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**This template is the foundation. You build your empire on top.**

---

## Make It Installable

Want members to install your site like an app? Run:

```
/pwa
```

This is huge for memberships:
- 📱 **One tap access** - Members open your content instantly
- 🔔 **Coming soon: Push notifications** - Notify members of new content
- 📲 **QR codes** - Add to your social bio, email signature, business cards

Your membership in their pocket. Always accessible.

---

## Your Dashboard

Your Dream API dashboard controls the business:

- **Tier prices** ($9/mo, $29/mo) → Pricing page updates automatically
- **Tier names** (Free, Pro, VIP) → Plan badges update
- **Features per tier** → Gating updates automatically

**Change prices → Site updates. No deploy needed.**

---

## Content Gating

The magic is dead simple:

```tsx
const hasPaidAccess = plan !== 'free';

{hasPaidAccess ? (
  <YourPremiumContent />
) : (
  <LockedPreview />
)}
```

Free users see the tease. Paid members see everything.

---

## Manual Setup

Prefer doing it yourself? No problem.

```bash
git clone https://github.com/Fruitloop24/dream-membership-basic.git my-membership
cd my-membership
npm install
cp .env.example .env.local
```

Add your publishable key to `.env.local`:
```
VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
```

```bash
npm run dev
```

Open http://localhost:5173 - your membership site is running.

### The Config File

Everything lives in `src/config.ts`:

```typescript
export const config = {
  appName: 'Validate Fast',
  tagline: 'Stop building. Start testing.',
  theme: 'light',
  accentColor: 'violet',  // emerald, sky, violet, rose, amber, zinc

  testimonials: {
    enabled: true,
    items: [
      { quote: 'Saved me 3 months of building the wrong thing', name: 'Sarah K.' },
    ],
  },
}
```

---

## The Stack

```
React + Vite          Fast dev, fast builds
Tailwind CSS          Style anything
Dream API SDK         Auth, billing, gating - done
Clerk (under hood)    Battle-tested auth
Stripe (under hood)   Battle-tested subscriptions
```

You don't configure Clerk. You don't touch Stripe. You just create.

---

## Deploy

```bash
npm run build
```

**Cloudflare Pages** (recommended):
```bash
npx wrangler pages deploy dist
```

**Vercel/Netlify**: Connect repo, add `VITE_DREAM_PUBLISHABLE_KEY` env var. Done.

---

## Self-Host the Backend

Want to run your own Dream API instance?

Check out **[plug-saas](https://github.com/Fruitloop24/plug-saas)** - the open source backend. Deploy your own auth + billing infrastructure on Cloudflare Workers.

---

## We Want to Hear From You

This is how we think memberships should work:
- **AI writes your copy** - You describe, it sells
- **Config over code** - Change a string, not a component
- **Subscriptions just work** - Stripe under the hood, you never touch it

**What's missing? What would make you switch from Gumroad/Patreon/Memberful?**

Open an issue. Tweet at us. We're building this for creators.

---

<p align="center">
  <strong>MIT License</strong> - Do whatever you want. Build something cool.
</p>

<p align="center">
  <sub>Built with ☕ by developers who believe creators should create, not code payment forms.</sub>
</p>
