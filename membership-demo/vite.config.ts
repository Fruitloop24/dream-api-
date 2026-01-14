import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/fitflow-fav.png'],
      manifest: {
        name: 'FitFlow - Transform Your Life',
        short_name: 'FitFlow',
        description: 'Your personal fitness coach. 500+ workouts, meal plans, and progress tracking.',
        theme_color: '#e11d48',
        background_color: '#09090b',
        display: 'standalone',
        icons: [
          {
            src: '/assets/fitflow-fav.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/fitflow-fav.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
