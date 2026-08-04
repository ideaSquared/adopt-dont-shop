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
      // ADS-947: json-summary is read by scripts/ci/coverage-delta.mjs to post
      // the PR coverage-delta comment.
      reporter: ['text', 'lcov', 'html', 'json-summary'],
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
      // ADS-1004: each lib.* package declares its own coverage floor in its
      // own vitest.config.ts (see CONTRIBUTING.md "Coverage thresholds"),
      // raised over time by `scripts/ratchet-coverage.mjs --package <path>`.
      // This shared default is 0% purely as a safety net — every lib.* is
      // required to override it (enforced by
      // scripts/check-workspace-consistency.mjs), so this value is never
      // meant to be relied on in practice.
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

/**
 * Shared Vitest configuration for all services/* packages (Node, not jsdom —
 * services have no DOM). Each service extends this and overrides only what
 * it needs (typically `test.coverage`).
 */
const sharedServiceConfig = defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      // ADS-947: json-summary is read by scripts/ci/coverage-delta.mjs to
      // post the PR coverage-delta comment.
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});

/**
 * ADS-985: helper that removes the per-service mergeConfig + imports
 * boilerplate — mirrors `defineLibConfig` above. Every service's
 * `vitest.config.ts` collapses to `export default defineServiceConfig()`,
 * or `defineServiceConfig({ ...overrides })` for services that need coverage
 * overrides (e.g. `test.coverage`).
 */
export function defineServiceConfig(overrides: UserConfig = {}): UserConfig {
  return mergeConfig(sharedServiceConfig, overrides);
}
