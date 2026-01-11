# dream-store-basic

E-commerce store template powered by Dream API. One API key, one config file, infinite customization.

## The Pitch

**One key. One config. Then customize with AI.**

This template is designed to work seamlessly with AI coding tools (Claude Code, Cursor, Windsurf). Get your API key from the dashboard, drop it in `.env.local`, and start customizing with natural language.

## How It Works

1. **Get API key** from [Dream API Dashboard](https://dream-frontend-dyn.pages.dev/)
2. **Add products** in the dashboard (name, price, images, inventory)
3. **Clone template** and add your key to `.env.local`
4. **Customize** with AI - just describe what you want

Products sync automatically. No code changes needed for inventory or pricing.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add: VITE_DREAM_PUBLISHABLE_KEY=pk_test_xxx
npm run dev
```

Open http://localhost:5173 and you've got a working store.

## The Config File

**Everything customizable lives in `src/config.ts`**. This is the single source of truth for branding.

When adding new pages or components, ALWAYS use config.ts:

```typescript
import { CONFIG, getThemeClasses, getAccentClasses } from '../config'

export default function MyNewPage() {
  const theme = getThemeClasses()
  const accent = getAccentClasses()
  const { storeName } = CONFIG

  return (
    <div className={theme.pageBg}>
      <h1 className={`font-serif ${theme.heading}`}>{storeName}</h1>
      <button className={`${accent.bg} ${accent.buttonText}`}>
        Click Me
      </button>
    </div>
  )
}
```

### Config Structure

```typescript
CONFIG = {
  // Basic info
  storeName: 'Your Store',
  tagline: 'Your tagline',
  description: 'One sentence about your store',

  // Demo mode (shows test card banner)
  demoMode: true,  // Set false for production

  // Visuals
  logo: null,  // '/logo.png' or null for emoji
  heroImage: 'https://images.unsplash.com/...',
  theme: 'light',  // 'light' or 'dark'
  accentColor: 'amber',  // zinc, emerald, sky, violet, rose, amber

  // Content sections
  footer: { tagline, links },
  about: { headline, content },
  contact: { headline, email, response },
  team: { headline, subheadline, members[] },
  mission: { headline, statement, values[] },
}
```

### Theme Classes

Use `getThemeClasses()` for all styling. Never hardcode colors:

```typescript
const theme = getThemeClasses()

// Backgrounds
theme.pageBg      // Page background
theme.cardBg      // Card/panel background
theme.headerBg    // Header background
theme.footerBg    // Footer background

// Text
theme.heading     // Headings (high contrast)
theme.body        // Body text
theme.muted       // Secondary text
theme.price       // Price display

// Interactive
theme.link        // Link styling
theme.buttonSecondary  // Secondary buttons
theme.divider     // Border/divider color

// Inputs
theme.inputBg
theme.inputFocus
theme.inputPlaceholder
```

### Accent Classes

Use `getAccentClasses()` for brand color elements:

```typescript
const accent = getAccentClasses()

accent.bg         // Background color
accent.bgHover    // Hover state
accent.text       // Text in accent color
accent.buttonText // Text on accent background
accent.border     // Border in accent color
```

## Adding New Pages

1. Create file in `src/pages/NewPage.tsx`
2. Import config utilities at the top
3. Use theme/accent classes for ALL styling
4. Add route in `App.tsx`
5. Add nav link in `Layout.tsx` NAV_LINKS array

Example new page:

```typescript
import { CONFIG, getThemeClasses, getAccentClasses } from '../config'

export default function NewPage() {
  const theme = getThemeClasses()
  const accent = getAccentClasses()

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className={`font-serif text-3xl md:text-4xl font-medium ${theme.heading} mb-6`}>
        Page Title
      </h1>
      <p className={`${theme.body} mb-8`}>
        Page content goes here.
      </p>
      <a
        href="/contact"
        className={`inline-block px-6 py-3 rounded-lg ${accent.bg} ${accent.buttonText} ${accent.bgHover} font-medium transition-colors`}
      >
        Call to Action
      </a>
    </div>
  )
}
```

## File Structure

```
src/
├── config.ts          # ALL branding - edit this
├── App.tsx            # Routes, hero, products, cart
├── components/
│   └── Layout.tsx     # Header, nav, footer
└── pages/
    ├── About.tsx      # About page
    ├── Team.tsx       # Team + mission
    ├── Community.tsx  # Community features
    └── Contact.tsx    # Contact form
```

## What NOT to Modify

- Product fetching logic (API handles it)
- Cart/checkout logic (SDK handles it)
- `useDreamAPI` hook internals

## Typography

- `font-serif` = Cormorant Gainsway (headings)
- Default = Inter (body)

Use `font-serif` for all major headings to maintain the premium feel.

## Images

Unsplash URLs work great and are free:
```typescript
heroImage: 'https://images.unsplash.com/photo-xxx?w=1600&q=80'
// Team photos
image: 'https://images.unsplash.com/photo-xxx?w=400&q=80'
```

## Deployment Checklist

Before going live:
1. Set `demoMode: false` in config.ts
2. Switch to live key: `pk_live_xxx`
3. Update all placeholder content
4. Test checkout flow

Deploy anywhere:
```bash
npm run build
# Then deploy dist/ to Cloudflare Pages, Vercel, Netlify, etc.
```

## SDK Reference

```typescript
// List products
const { products } = await api.products.list()

// Guest checkout
const { url } = await api.products.cartCheckout({
  items: [{ priceId: 'price_xxx', quantity: 1 }],
  successUrl: window.location.origin + '?success=true',
  cancelUrl: window.location.origin + '?canceled=true',
})
```

## AI Customization Tips

When users ask for custom styling:
1. Check if it's a config value first (storeName, colors, content)
2. For advanced theming, modify the THEMES object in config.ts
3. For layout changes, edit the specific page component
4. Always use theme/accent classes, never hardcode colors

The two-layer system:
- **User config** (~60 lines) - what users edit directly
- **THEMES object** - full Tailwind classes AI can modify for advanced customization
