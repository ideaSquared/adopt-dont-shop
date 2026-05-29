import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for all lib.* packages.
 * Each lib extends this and overrides only what it needs.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        'src/index.ts',
      ],
      // ADS-708: baseline coverage thresholds. Starts at 0% so today's PRs
      // are not blocked — infrastructure is now in place for per-package
      // ratcheting (ADS-717). Individual packages may override these in
      // their own vitest.config.ts by setting test.coverage.thresholds.
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        autoUpdate: false,
      },
    },
  },
});
