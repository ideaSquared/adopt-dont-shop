import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

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
  // adding a new lib.* only requires editing it in one place).
  const libraryAliases = getLibraryAliases(__dirname, mode);

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', { compilationMode: 'annotation' }]],
        },
      }),
      vanillaExtractPlugin(),
    ],
    envDir: resolve(__dirname, '../..'), // Load .env from monorepo root
    cacheDir: '/tmp/.vite-app-admin',
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@/components': resolve(__dirname, './src/components'),
        '@/hooks': resolve(__dirname, './src/hooks'),
        '@/utils': resolve(__dirname, './src/utils'),
        '@/types': resolve(__dirname, './src/types'),
        '@/pages': resolve(__dirname, './src/pages'),
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
