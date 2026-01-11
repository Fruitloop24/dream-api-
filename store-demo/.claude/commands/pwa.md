# /pwa - Add Progressive Web App Support

You are helping add PWA support to this React + Vite store template. This will make the store installable on phones and tablets.

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
        name: 'STORE_NAME_HERE',
        short_name: 'STORE_SHORT',
        description: 'STORE_DESCRIPTION',
        theme_color: '#18181b',
        background_color: '#09090b',
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
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|webp|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],
})
```

Ask: **"What's your store name?"** - Use it for `name` and `short_name` (short_name max 12 chars)

Ask: **"What color is your brand?"** - Update `theme_color` based on their accent color:
- zinc: `#18181b`
- emerald: `#10b981`
- sky: `#0ea5e9`
- violet: `#8b5cf6`
- rose: `#f43f5e`
- amber: `#f59e0b`

---

## Step 3: Create Store Icons

Tell them:

"You need two icon files in the `public/` folder:
- `pwa-192x192.png` (192x192 pixels)
- `pwa-512x512.png` (512x512 pixels)

**Quick options:**
1. Use your logo - resize to both sizes
2. Generate from text - use a tool like [favicon.io](https://favicon.io/favicon-generator/)
3. Use a simple store icon or your initials"

If they don't have icons, offer to help them think of what to use.

---

## Step 4: Add QR Code for Easy Install

Ask: **"Want to add a QR code so customers can easily install your store? Perfect for packaging, flyers, and pop-up shops!"**

If yes, explain:

"Here's how to add an install QR code:

1. **Generate your QR code** - After you deploy, use [QR Code Generator](https://www.qr-code-generator.com/) with your live URL

2. **Use everywhere:**
   - Product packaging & inserts
   - Business cards
   - Pop-up shop displays
   - Social media posts
   - Email receipts
   - Flyers & stickers

3. **Add to your store** - I can add a footer section with the QR code"

If they want to add it to the footer, offer to add:

```tsx
{/* Install App Section */}
<div className="border-t border-zinc-800 mt-8 pt-8 text-center">
  <h3 className="text-sm font-medium mb-2">Shop from Your Phone</h3>
  <p className="text-zinc-500 text-xs mb-4">Scan to install - no app store needed</p>
  <img
    src="/qr-code.png"
    alt="Scan to install"
    className="mx-auto w-32 h-32 rounded-lg"
  />
</div>
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
2. Your store as a standalone app when installed

**On mobile:**
- iOS Safari: Share → Add to Home Screen
- Android Chrome: Menu → Install app

Your store icon will appear on their home screen!"

---

## Done!

Tell them:

"Your store is now installable as a PWA! Customers can:

- **Install from browser** - No app store needed
- **Launch from home screen** - Your store, one tap away
- **Browse offline** - Cached products load instantly
- **Get notified** - Ready for push notifications later

**QR Code Ideas:**

Print your QR code everywhere:
- **Product inserts** - 'Shop more at [store]' card in packages
- **Packaging** - QR code on boxes, bags, labels
- **Pop-up shops** - Table display with 'Scan to Shop'
- **Business cards** - Front: brand, Back: QR code
- **Receipts** - 'Install our app' at bottom

Customers scan → Install → Shop. Zero friction, zero app store fees!"

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
