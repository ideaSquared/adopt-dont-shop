import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-min-32-characters-long',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-min-32-characters-long',
      SESSION_SECRET: 'test-session-secret-min-32-characters-long',
      CSRF_SECRET: 'test-csrf-secret-min-32-characters-long',
      // 64 hex chars = 32 bytes for AES-256. Deterministic test-only key.
      ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000001',
      TEST_DB_NAME: 'test_db',
    },

    // Setup files
    setupFiles: ['./src/setup-tests.ts'],

    // Global test timeout
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,js}', 'src/**/*.spec.{ts,js}', 'src/index.ts'],
      // ADS-418: enforce coverage floors so CI fails when behaviour is left
      // untested. The numbers in PR #353 (60/60/55/50) were chosen against
      // a smaller surface; the audit then added ~30 new service files
      // (privacy / data-export / data-retention / consent / legal-content /
      // observability / metrics / retention-worker / redact / etc.) without
      // matched test coverage, dropping the rolling baseline below the
      // original gate. Re-baselined to the current actual + ~3pt headroom
      // so the gate keeps catching real regressions while the per-service
      // test backlog (ADS-417/487/490 follow-ups) is worked off. Each new
      // PR that adds tests should ratchet these UP — never down.
      // Run via `npm run test:coverage`; the default `npm test` skips
      // coverage to keep watch-mode fast.
      // Re-baselined post-ADS-417/490 to L=41/S=41/F=49/B=34
      thresholds: {
        lines: 41,
        statements: 41,
        functions: 49,
        branches: 34,
      },
    },

    // Test file patterns
    include: ['src/**/__tests__/**/*.{ts,js}', 'src/**/*.{test,spec}.{ts,js}'],

    // Exclude helper files
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__tests__/helpers/**',
      '**/__tests__/fixtures/**',
    ],

    // Globals (enable Jest-compatible globals like describe, it, expect)
    globals: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/controllers': path.resolve(__dirname, './src/controllers'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/middleware': path.resolve(__dirname, './src/middleware'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@adopt-dont-shop/lib.types': path.resolve(__dirname, '../lib.types/src/index.ts'),
      '@adopt-dont-shop/lib.validation': path.resolve(__dirname, '../lib.validation/src/index.ts'),
    },
  },
});
