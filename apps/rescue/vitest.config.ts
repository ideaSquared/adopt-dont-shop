import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import { getLibraryAliases, veCssMock } from '../../vite.shared.config';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { compilationMode: 'annotation' }]],
      },
    }),
    veCssMock,
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setup-tests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      // ADS-947: json-summary is read by scripts/ci/coverage-delta.mjs to
      // post the PR coverage-delta comment.
      reporter: ['text', 'json', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
      ],
      // ratcheted to measured baseline (2026-06-16); buffered for CI variance
      thresholds: {
        statements: 40,
        branches: 37,
        functions: 35,
        lines: 40,
      },
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
      // ADS-762: theme sub-path must be declared before the lib.components
      // alias below so vite resolves it first.
      '@adopt-dont-shop/lib.components/theme': path.resolve(
        __dirname,
        '../../packages/lib.components/src/theme.ts'
      ),
      // ADS-762: all @adopt-dont-shop/lib.* aliases come from the shared
      // getLibraryAliases() helper — the single source of truth also used
      // by each app's vite.config.ts and verified by the workspace-drift
      // CI guard. Do not hand-roll new lib aliases here.
      ...getLibraryAliases(__dirname, 'development'),
    },
  },
});
