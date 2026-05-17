import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Check if we're running in Docker (service-backend hostname is available)
  const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
  const backendHost = isDocker ? 'service-backend' : '127.0.0.1';

  // Development aliases for all libraries to use source files directly
  const libraryAliases =
    mode === 'development'
      ? {
          '@adopt-dont-shop/lib.components': resolve(__dirname, '../lib.components/src'),
          '@adopt-dont-shop/lib.analytics': resolve(__dirname, '../lib.analytics/src'),
          '@adopt-dont-shop/lib.api': resolve(__dirname, '../lib.api/src'),
          '@adopt-dont-shop/lib.applications': resolve(__dirname, '../lib.applications/src'),
          '@adopt-dont-shop/lib.auth': resolve(__dirname, '../lib.auth/src'),
          '@adopt-dont-shop/lib.chat': resolve(__dirname, '../lib.chat/src'),
          '@adopt-dont-shop/lib.dev-tools': resolve(__dirname, '../lib.dev-tools/src'),
          '@adopt-dont-shop/lib.discovery': resolve(__dirname, '../lib.discovery/src'),
          '@adopt-dont-shop/lib.feature-flags': resolve(__dirname, '../lib.feature-flags/src'),
          '@adopt-dont-shop/lib.legal': resolve(__dirname, '../lib.legal/src'),
          '@adopt-dont-shop/lib.notifications': resolve(__dirname, '../lib.notifications/src'),
          '@adopt-dont-shop/lib.observability': resolve(__dirname, '../lib.observability/src'),
          '@adopt-dont-shop/lib.permissions': resolve(__dirname, '../lib.permissions/src'),
          '@adopt-dont-shop/lib.types': resolve(__dirname, '../lib.types/src'),
          '@adopt-dont-shop/lib.pets': resolve(__dirname, '../lib.pets/src'),
          '@adopt-dont-shop/lib.rescue': resolve(__dirname, '../lib.rescue/src'),
          '@adopt-dont-shop/lib.search': resolve(__dirname, '../lib.search/src'),
          '@adopt-dont-shop/lib.utils': resolve(__dirname, '../lib.utils/src'),
          '@adopt-dont-shop/lib.validation': resolve(__dirname, '../lib.validation/src'),
        }
      : {};

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', { compilationMode: 'annotation' }]],
        },
      }),
      vanillaExtractPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: "Adopt Don't Shop",
          short_name: 'AdoptDS',
          description: 'Find your next companion through ethical pet adoption.',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          // Skip caching real-time + auth-bearing endpoints; runtime cache only
          // for read-mostly listing endpoints and CDN-served imagery.
          runtimeCaching: [
            {
              urlPattern: ({ url }: { url: URL }) =>
                /\/api\/v1\/pets(?:\/|\?|$)/.test(url.pathname),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pets-list',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              },
            },
            {
              urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    envDir: resolve(__dirname, '..'), // Load .env from monorepo root
    cacheDir: '/tmp/.vite-app-client',
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        ...libraryAliases,
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      exclude: [
        '@testing-library/dom',
        '@testing-library/react',
        '@testing-library/user-event',
        '@testing-library/jest-dom',
      ],
      // Include library source files in dependency optimization for HMR
      entries: ['./src/**/!(*.test|*.spec).{ts,tsx}', '../lib.*/src/**/!(*.test|*.spec).{ts,tsx}'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      watch: {
        usePolling: true,
        interval: 100,
        // Don't ignore library source folders - we want to watch them for changes
        ignored: ['!**/lib.*/src/**'],
      },
      hmr: {
        overlay: true,
      },
      proxy: {
        '/api': {
          target: `http://${backendHost}:5000`,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: `http://${backendHost}:5000`,
          changeOrigin: true,
          secure: false,
        },
        '/monitoring': {
          target: `http://${backendHost}:5000`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      // ADS-447 / ADS-461: hidden source maps so Sentry can resolve stack traces
      // without exposing them publicly. CI uploads the maps to Sentry then the
      // .map files are stripped from the deployed artifact.
      sourcemap: 'hidden',
      rollupOptions: {
        output: {
          // ADS-475: split heavy vendor deps into stable chunks for cacheability.
          // Vite 8 / rolldown rejects the legacy object form — `manualChunks`
          // must be a function. Match the same boundaries as the previous map.
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }
            if (id.includes('@sentry/')) {
              return 'sentry';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('react-dom') || /\/react\//.test(id)) {
              return 'react-vendor';
            }
            return undefined;
          },
        },
      },
    },
  };
});
