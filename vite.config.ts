import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the project site from https://<user>.github.io/<repo>/.
// Override with VITE_BASE=/ when deploying to a custom domain or user site.
const base = process.env.VITE_BASE ?? '/yt-loop/';

// GitHub Pages has no SPA rewrite rule, so it serves 404.html for any path that
// is not a real file. Shipping a copy of index.html there makes deep links work.
function spaFallback(): Plugin {
  return {
    name: 'gh-pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      const out = fileURLToPath(new URL('dist/', import.meta.url));
      copyFileSync(`${out}index.html`, `${out}404.html`);
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // No includeAssets: the workbox globPatterns below already pick up
      // everything in public/, and listing them twice duplicates precache entries.
      manifest: {
        name: 'YouTube Loop',
        short_name: 'YT Loop',
        description:
          'Build playlists of YouTube videos and replay selected segments continuously.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#fdfbf7',
        theme_color: '#fdfbf7',
        categories: ['music', 'entertainment', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // 404.html is a byte-for-byte copy of index.html; precaching it too
        // would just double the shell in the cache.
        globIgnores: ['**/404.html'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbnails',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Keep the service worker out of the way during `npm run dev`.
        enabled: false,
      },
    }),
    spaFallback(),
  ],
});
