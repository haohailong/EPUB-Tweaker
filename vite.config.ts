import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'EPUB Tweaker',
        short_name: 'EPUB Tweaker',
        description: 'Repair and fine-tune EPUB files privately on your device.',
        theme_color: '#f4f0e7',
        background_color: '#f4f0e7',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/maskable-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  worker: { format: 'es' },
  build: { target: 'es2020', sourcemap: true }
});
