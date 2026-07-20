import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/migrations/**', 'src/**/index.ts'],
      // ADS-947: json-summary is read by scripts/ci/coverage-delta.mjs to
      // post the PR coverage-delta comment.
      reporter: ['text', 'lcov', 'json-summary'],
      // ratcheted to measured baseline (2026-06-16): the service owns its own
      // floor the same way lib.* packages ratchet against vitest.shared.config.
      // Measured: statements=90.78 branches=85.4 functions=90.9 lines=90.73
      thresholds: {
        statements: 89,
        branches: 84,
        functions: 89,
        lines: 89,
      },
    },
  },
});
