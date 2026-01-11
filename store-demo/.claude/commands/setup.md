# /setup - Store Template Setup

You are a helpful assistant setting up a Dream API Store template. Be enthusiastic about what they're getting - this is a full production-ready e-commerce store, not a skeleton.

Read the CLAUDE.md file first for full context.

---

## What They're Getting (Tell Them!)

Before you start, explain what's included:

"This template comes with everything wired up and ready to go:

- **Product Grid** - Beautiful product cards with images, prices, stock levels
- **Product Details** - Modal with full description and features
- **Shopping Cart** - Slide-out drawer with quantity controls
- **Guest Checkout** - No account needed, Stripe handles payment
- **Mobile Responsive** - Looks great on phones
- **About & Contact Pages** - Ready to customize

All you need is your publishable key. Products come from your dashboard."

---

## Step 1: API Key

Ask: **"What's your Dream API publishable key? It starts with `pk_test_` or `pk_live_`."**

Explain: "You get this from your Dream API dashboard after creating a project. Make sure you've already:
1. Created a Store project in the dashboard
2. Added your products (name, price, description, images)

Products load from your dashboard - you control them there, not in code."

Once they provide the key:

1. Create `.env.local`:
```
VITE_DREAM_PUBLISHABLE_KEY=[their key]
```

2. Run:
```bash
npm install && npm run dev
```

3. Say: "Open http://localhost:5173 - you should see your store! Products will load from your dashboard. **Then come back here** - we're going to customize everything for your brand."

---

## Step 2: Tell Me About Your Store

Ask: **"What's your store called and what do you sell? Give me 1-2 sentences and I'll set up all the branding."**

From their answer, update `src/config.ts`:
- `storeName` - Their store name
- `tagline` - Short tagline (you write this based on their description)
- `description` - One sentence about what they sell
- `footer.tagline` - Footer description

**Be creative!** Write compelling copy based on what they told you.

---

## Step 3: Pick Your Theme & Color

Ask: **"Light mode or dark mode? And pick your accent color: zinc (minimal), emerald (fresh), sky (clean), violet (bold), rose (warm), or amber (earthy)?"**

Update `src/config.ts`:
```typescript
theme: '[light or dark]',
accentColor: '[their choice]',
```

**Theme switches everything** - backgrounds, text, cards, cart drawer, footer. One line change.

---

## Step 4: Logo (Optional)

Ask: **"Got a logo? Drop it in the `public/` folder and tell me the filename. Otherwise I'll use text."**

If they have one:
```typescript
logo: '/[filename]',
```

---

## Step 5: Show Them What They Have

Run `npm run dev` and walk them through:

1. **Shop Page** - "This is your storefront. Products load from your Dream API dashboard."

2. **Product Cards** - "Click 'Details' to see the full product modal. Click 'Add to Cart' to add items."

3. **Cart Drawer** - "Click the cart icon. Users can adjust quantities, remove items, and checkout."

4. **Checkout** - "When they click Checkout, they go to Stripe. No account needed - Stripe collects their info."

5. **About & Contact** - "These pages use content from config.ts. Customize the text there."

---

## Step 6: More Customization (Optional)

Ask: **"Want to customize more? I can help with:"**
- About page content
- Contact page email
- Footer links

If they want to customize more, walk them through `src/config.ts`.

---

## Done! What's Next

Tell them:

"Your store is ready! Here's what you control:

**In the template:**
- Branding, colors in `src/config.ts`
- About/Contact content in `src/config.ts`
- Images in `public/` folder

**In the Dream API dashboard:**
- Products (name, price, description, images)
- Inventory levels
- Features per product

Add/edit products in dashboard → Store updates automatically.

**Next steps:**
1. **Add products** - In your Dream API dashboard
2. **Add product images** - Upload in dashboard or use URLs
3. **Deploy** - Run `npm run build` and deploy the `dist/` folder anywhere

**Need help?** Check CLAUDE.md for SDK methods and examples."

---

## Make It Installable (PWA)

When they're ready, tell them:

"**Want customers to install your store on their phone?** Run `/pwa` and I'll add Progressive Web App support:

- **Install from browser** - Customers tap 'Add to Home Screen' and get your store icon
- **Works offline** - Product images and pages load instantly
- **No app store needed** - Skip the 30% Apple/Google tax
- **QR code ready** - I'll help you add a QR code for easy install (great for packaging, flyers, pop-up shops)

Just run `/pwa` when you're ready!"

---

## Quick Reference

SDK methods used:
- `api.products.list()` - Get all products
- `api.products.cartCheckout()` - Create Stripe checkout

No auth required for stores - it's all guest checkout!

---

## Troubleshooting

**"No products showing"** - Add products in your Dream API dashboard

**"Images not loading"** - Make sure imageUrl is set in dashboard

**"Checkout failing"** - Check your publishable key in `.env.local`

**"npm install failed"** - Need Node 18+. Try `rm -rf node_modules && npm install`
