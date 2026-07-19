import { existsSync, readFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, mergeConfig, type UserConfig } from 'vitest/config';

type CoverageThresholds = {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
};

const ZERO_THRESHOLDS: CoverageThresholds = {
  statements: 0,
  branches: 0,
  functions: 0,
  lines: 0,
};

const COVERAGE_METRICS: ReadonlyArray<keyof CoverageThresholds> = [
  'statements',
  'branches',
  'functions',
  'lines',
];

/**
 * ADS-796: read the persisted, automatically-ratcheted thresholds written by
 * `scripts/ratchet-coverage.mjs` to `coverage-thresholds.json` at the repo
 * root. When the file is absent (or unreadable) we fall back to the historic
 * 0% baseline so existing CI is never broken by this wiring alone — moving the
 * floor off 0% is the deliberate act of running the ratchet and committing the
 * file. Individual packages still override these in their own vitest.config.ts.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function loadBaselineThresholds(): CoverageThresholds {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const path = join(repoRoot, 'coverage-thresholds.json');
  if (!existsSync(path)) {
    return ZERO_THRESHOLDS;
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!isRecord(parsed)) {
      return ZERO_THRESHOLDS;
    }
    return COVERAGE_METRICS.reduce<CoverageThresholds>((acc, metric) => {
      const value = parsed[metric];
      return { ...acc, [metric]: typeof value === 'number' ? value : 0 };
    }, ZERO_THRESHOLDS);
  } catch {
    return ZERO_THRESHOLDS;
  }
}

const baselineThresholds = loadBaselineThresholds();

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
      // ADS-708 / ADS-796: baseline coverage thresholds. Defaults to 0% (so
      // today's PRs are not blocked) and is raised automatically by the
      // ratchet — `scripts/ratchet-coverage.mjs` persists the floor to
      // `coverage-thresholds.json`, read above by loadBaselineThresholds().
      // Individual packages may still override these in their own
      // vitest.config.ts by setting test.coverage.thresholds.
      thresholds: {
        statements: baselineThresholds.statements,
        branches: baselineThresholds.branches,
        functions: baselineThresholds.functions,
        lines: baselineThresholds.lines,
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
