import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: 'public',
  envDir: '../',
  publicDir: '../static',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    VitePWA({
      // 'prompt' mode gives us control over the update flow via swUpdateManager.js
      // instead of silently auto-updating (which doesn't work reliably on iOS)
      registerType: 'prompt',
      
      // We handle registration manually in swUpdateManager.js
      injectRegister: false,
      
      // Let VitePWA fully manage the manifest so it can rewrite icon paths
      // to the correct hashed/copied output paths
      manifest: {
        name: 'Ascend',
        short_name: 'Ascend',
        id: '/',
        description: 'Plan smarter. Grow daily. Your personal companion for productivity and growth with Ascend.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        lang: 'en',
        scope: '/',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Add Task',
            short_name: 'Add',
            description: 'Quickly add a new task',
            url: '/?action=add-task',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Dashboard',
            short_name: 'Home',
            description: 'View your dashboard',
            url: '/',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      // Inject the manifest link automatically into index.html
      injectManifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        // We DON'T use clientsClaim + skipWaiting here anymore.
        // The swUpdateManager handles this via postMessage('SKIP_WAITING') 
        // after showing the user an update prompt.
        clientsClaim: true,
        skipWaiting: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,woff,ttf}'],
        
        // Don't precache the SW registration script itself
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        
        // Runtime caching for external resources (fonts, Firebase CDN)
        runtimeCaching: [
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Google Fonts webfont files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Firebase SDK (CDN loaded modules)
            urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-sdk',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Firebase Auth UI assets (Google sign-in button image, etc.)
            urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/ui\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-ui-assets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
});
