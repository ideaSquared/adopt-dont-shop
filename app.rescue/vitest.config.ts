import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setup-tests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@adopt-dont-shop/components': path.resolve(__dirname, '../lib.components/src/index.ts'),
      '@adopt-dont-shop/lib-auth': path.resolve(__dirname, '../lib.auth/src/index.ts'),
      '@adopt-dont-shop/lib-pets': path.resolve(__dirname, '../lib.pets/src/index.ts'),
      '@adopt-dont-shop/lib-applications': path.resolve(
        __dirname,
        '../lib.applications/src/index.ts'
      ),
      '@adopt-dont-shop/lib-rescue': path.resolve(__dirname, '../lib.rescue/src/index.ts'),
      '@adopt-dont-shop/lib-api': path.resolve(__dirname, '../lib.api/src/index.ts'),
      '@adopt-dont-shop/lib-chat': path.resolve(__dirname, '../lib.chat/src/index.ts'),
      '@adopt-dont-shop/lib-analytics': path.resolve(__dirname, '../lib.analytics/src/index.ts'),
      '@adopt-dont-shop/lib-notifications': path.resolve(
        __dirname,
        '../lib.notifications/src/index.ts'
      ),
      '@adopt-dont-shop/lib-feature-flags': path.resolve(
        __dirname,
        '../lib.feature-flags/src/index.ts'
      ),
      '@adopt-dont-shop/lib-permissions': path.resolve(
        __dirname,
        '../lib.permissions/src/index.ts'
      ),
      '@adopt-dont-shop/lib-search': path.resolve(__dirname, '../lib.search/src/index.ts'),
      '@adopt-dont-shop/lib-discovery': path.resolve(__dirname, '../lib.discovery/src/index.ts'),
      '@adopt-dont-shop/lib-validation': path.resolve(__dirname, '../lib.validation/src/index.ts'),
      '@adopt-dont-shop/lib-utils': path.resolve(__dirname, '../lib.utils/src/index.ts'),
    },
  },
});
