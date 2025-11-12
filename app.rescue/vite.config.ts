import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Check if we're running in Docker (service-backend hostname is available)
  const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';

  // Development aliases for all libraries to use source files directly
  const libraryAliases =
    mode === 'development'
      ? {
          '@adopt-dont-shop/components': resolve(__dirname, '../lib.components/src'),
          '@adopt-dont-shop/lib-analytics': resolve(__dirname, '../lib.analytics/src'),
          '@adopt-dont-shop/lib-api': resolve(__dirname, '../lib.api/src'),
          '@adopt-dont-shop/lib-applications': resolve(__dirname, '../lib.applications/src'),
          '@adopt-dont-shop/lib-auth': resolve(__dirname, '../lib.auth/src'),
          '@adopt-dont-shop/lib-chat': resolve(__dirname, '../lib.chat/src'),
          '@adopt-dont-shop/lib-discovery': resolve(__dirname, '../lib.discovery/src'),
          '@adopt-dont-shop/lib-feature-flags': resolve(__dirname, '../lib.feature-flags/src'),
          '@adopt-dont-shop/lib-notifications': resolve(__dirname, '../lib.notifications/src'),
          '@adopt-dont-shop/lib-permissions': resolve(__dirname, '../lib.permissions/src'),
          '@adopt-dont-shop/lib-pets': resolve(__dirname, '../lib.pets/src'),
          '@adopt-dont-shop/lib-rescue': resolve(__dirname, '../lib.rescue/src'),
          '@adopt-dont-shop/lib-search': resolve(__dirname, '../lib.search/src'),
          '@adopt-dont-shop/lib-utils': resolve(__dirname, '../lib.utils/src'),
          '@adopt-dont-shop/lib-validation': resolve(__dirname, '../lib.validation/src'),
          '@adopt-dont-shop/lib-invitations': resolve(__dirname, '../lib.invitations/src'),
        }
      : {};

  return {
    plugins: [react()],
    envDir: resolve(__dirname, '..'), // Load .env from monorepo root
    cacheDir: '/tmp/.vite-app-rescue',
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@/components': resolve(__dirname, './src/components'),
        '@/hooks': resolve(__dirname, './src/hooks'),
        '@/utils': resolve(__dirname, './src/utils'),
        '@/types': resolve(__dirname, './src/types'),
        '@/services': resolve(__dirname, './src/services'),
        '@/contexts': resolve(__dirname, './src/contexts'),
        '@/pages': resolve(__dirname, './src/pages'),
        ...libraryAliases,
      },
      dedupe: ['styled-components', 'react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['styled-components'],
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
      port: 3000, // Container internal port (mapped to 3002 externally via Docker)
      watch: {
        usePolling: true,
        interval: 100,
        // Don't ignore library source folders - we want to watch them for changes
        ignored: ['!**/lib.*/src/**'],
      },
      hmr: {
        overlay: true,
      },
      // Use proxy for local development outside Docker
      proxy: !isDocker
        ? {
            '/api': {
              target: 'http://localhost:5000',
              changeOrigin: true,
              secure: false,
            },
            '/health': {
              target: 'http://localhost:5000',
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    define: {
      'process.env': '{}',
    },
  };
});
