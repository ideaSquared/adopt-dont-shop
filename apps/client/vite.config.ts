import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { getLibraryAliases } from '../../vite.shared.config';

export default defineConfig(({ mode }) => {
  // The gateway fronts /api, /health and /monitoring. In Docker it's reachable
  // by its compose service name; natively it runs on localhost. (Replaces the
  // deleted service-backend monolith — gateway listens on 4000.)
  // Use the 127.0.0.1 literal rather than 'localhost': the gateway binds
  // 0.0.0.0 (IPv4-only) by default, so on IPv6-first hosts 'localhost'
  // resolving to ::1 first would ECONNREFUSED (see docs/DOCKER.md).
  const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
  const backendHost = isDocker ? 'service-gateway' : '127.0.0.1';
  const backendPort = 4000;

  // Development aliases for all libraries to use source files directly
  // (ADS-895: shared with the other two apps via vite.shared.config.ts so
  // adding a new lib.* only requires editing it in one place). This also
  // picks up lib.audit-logs, lib.moderation, and lib.support-tickets, which
  // this app's hand-rolled list had drifted out of sync on.
  const libraryAliases = getLibraryAliases(__dirname, mode);

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
        includeAssets: ['favicon.svg', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png'],
        manifest: {
          id: '/?source=pwa',
          name: "Adopt Don't Shop",
          short_name: 'AdoptDS',
          description: 'Find your next companion through ethical pet adoption.',
          start_url: '/?source=pwa',
          scope: '/',
          lang: 'en-GB',
          dir: 'ltr',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          categories: ['lifestyle', 'social'],
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
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
    envDir: resolve(__dirname, '../..'), // Load .env from monorepo root
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
      entries: [
        './src/**/!(*.test|*.spec).{ts,tsx}',
        '../../packages/lib.*/src/**/!(*.test|*.spec).{ts,tsx}',
      ],
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
          target: `http://${backendHost}:${backendPort}`,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: `http://${backendHost}:${backendPort}`,
          changeOrigin: true,
          secure: false,
        },
        '/monitoring': {
          target: `http://${backendHost}:${backendPort}`,
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
          // ADS-475 / ADS-669: split heavy vendor deps into stable chunks for
          // cacheability and to keep the initial entry chunk under 500 KB.
          // Vite 8 / rolldown rejects the legacy object form — `manualChunks`
          // must be a function.
          manualChunks(id) {
            // Split heavy first-party libs so they load alongside the routes
            // that need them rather than landing in the main entry chunk.
            if (id.includes('lib.legal')) {
              return 'legal-lib';
            }
            if (id.includes('lib.dev-tools')) {
              return 'dev-tools-lib';
            }
            // lib.chat is eagerly imported via ChatProvider for connection
            // state, but the bulk of its surface is chat-page UI. Splitting
            // it into a separate chunk keeps the main entry under 500 KB —
            // the browser fetches both chunks in parallel.
            if (id.includes('lib.chat')) {
              return 'chat-lib';
            }
            if (id.includes('lib.notifications')) {
              return 'notifications-lib';
            }
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
            if (id.includes('react-icons')) {
              return 'icons-vendor';
            }
            if (id.includes('/socket.io')) {
              return 'socket-vendor';
            }
            if (id.includes('zod')) {
              return 'zod-vendor';
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
