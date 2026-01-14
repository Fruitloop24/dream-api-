# /pwa - Add Progressive Web App Support

You are helping add PWA support to this React + Vite template. This will make the app installable on phones and tablets.

Read the CLAUDE.md file first for full context.

---

## Step 1: Install vite-plugin-pwa

Run:
```bash
npm install -D vite-plugin-pwa
```

---

## Step 2: Update vite.config.ts

Add the PWA plugin to the Vite config:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'APP_NAME_HERE',
        short_name: 'APP_SHORT_NAME',
        description: 'APP_DESCRIPTION',
        theme_color: '#10b981',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.clerk\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'clerk-api-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 }
            }
          }
        ]
      }
    })
  ],
})
```

Ask: **"What's your app name?"** - Use it for `name` and `short_name` (short_name max 12 chars)

Ask: **"What color is your brand?"** - Update `theme_color` based on their accent color:
- emerald: `#10b981`
- sky: `#0ea5e9`
- violet: `#8b5cf6`
- rose: `#f43f5e`
- amber: `#f59e0b`
- zinc: `#71717a`

---

## Step 3: Create App Icons

Tell them:

"You need two icon files in the `public/` folder:
- `pwa-192x192.png` (192x192 pixels)
- `pwa-512x512.png` (512x512 pixels)

**Quick options:**
1. Use your logo - resize to both sizes
2. Generate from text - use a tool like [favicon.io](https://favicon.io/favicon-generator/)
3. I can create a simple colored square with your app initial if you want"

If they don't have icons, offer to help them think of what to use, or suggest using a simple initial.

---

## Step 4: Add QR Code for Easy Install

Ask: **"Want to add a QR code so users can easily install on their phone? Great for sharing!"**

If yes, explain:

"Here's how to add an install QR code:

1. **Generate your QR code** - After you deploy, use [QR Code Generator](https://www.qr-code-generator.com/) with your live URL

2. **Add to your landing page** - I can add an 'Install App' section to your landing page with the QR code

3. **Use cases:**
   - Landing page footer
   - Email signatures
   - Social media posts
   - Physical materials (stickers, flyers, business cards)"

If they want to add it to the landing page, offer to add a section like:

```tsx
{/* Install App CTA */}
<section className="py-16 px-6 text-center">
  <h2 className="text-2xl font-light mb-4">Install the App</h2>
  <p className="text-zinc-500 mb-6">Scan to install on your phone - no app store needed</p>
  <img
    src="/qr-code.png"
    alt="Scan to install"
    className="mx-auto w-48 h-48 rounded-lg"
  />
  <p className="text-zinc-600 text-sm mt-4">Works on iPhone, Android, and desktop</p>
</section>
```

Tell them to save their QR code as `public/qr-code.png`.

---

## Step 5: Test PWA

Run:
```bash
npm run build && npm run preview
```

Tell them:

"Open the preview URL in Chrome. You should see:
1. Install icon in the address bar (or menu → 'Install app')
2. Lighthouse PWA audit should pass

**On mobile:**
- iOS Safari: Share → Add to Home Screen
- Android Chrome: Menu → Install app

The app icon will appear on their home screen!"

---

## Done!

Tell them:

"Your app is now installable as a PWA! Users can:

- **Install from browser** - No app store needed
- **Launch from home screen** - Full screen, native feel
- **Work offline** - Cached pages load instantly

**Deployment tips:**
- Make sure you're on HTTPS (required for PWA)
- Cloudflare Pages, Vercel, Netlify all work great
- The service worker caches assets automatically

**QR Code reminder:**
After you deploy to your live URL:
1. Generate a QR code pointing to your site
2. Save as `public/qr-code.png`
3. Add to landing page, emails, or print materials

Users scan → Install → Done. No app store fees, no review process!"

---

## Troubleshooting

**"Install button not showing"**
- Must be on HTTPS (localhost works for testing)
- Check that manifest.json is being generated (look in dist/ after build)

**"Icons not showing"**
- Make sure pwa-192x192.png and pwa-512x512.png are in public/ folder
- Check console for 404 errors

**"Service worker not updating"**
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Clear site data in DevTools → Application → Storage
