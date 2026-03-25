import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: 'public',
  publicDir: '../static',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      // Let VitePWA fully manage the manifest so it can rewrite icon paths
      // to the correct hashed/copied output paths
      manifest: {
        name: 'Your Day',
        short_name: 'Your Day',
        id: '/',
        description: 'Plan smarter. Grow daily. Your personal companion for productivity and growth.',
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
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
});
