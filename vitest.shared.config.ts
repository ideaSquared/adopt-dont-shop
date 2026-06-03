import { basename } from 'path';
import { defineConfig, mergeConfig, type UserConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for all lib.* packages.
 * Each lib extends this and overrides only what it needs.
 */
const sharedConfig = defineConfig({
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

export default sharedConfig;

/**
 * ADS-729: helper that removes the per-lib mergeConfig + imports boilerplate.
 *
 * The lib's `name` is derived from its directory (the basename of process.cwd()
 * at config-load time), so every lib's `vitest.config.ts` collapses to a single
 * `defineLibConfig({ ...overrides })` call. Pass any overrides to extend or
 * override the shared defaults — typically `test.coverage.thresholds` and
 * optionally `test.setupFiles` / `test.environment`.
 */
export function defineLibConfig(overrides: UserConfig = {}): UserConfig {
  const name = basename(process.cwd());
  const withName = mergeConfig(sharedConfig, defineConfig({ test: { name } }));
  return mergeConfig(withName, overrides);
}
