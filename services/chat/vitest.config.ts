import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/migrations/**',
        // Dev-only bulk-data ('spam') seeder — a manual, env-gated CLI that
        // never runs in production.
        'src/db/spam.ts',
        'src/**/index.ts',
      ],
      // ADS-947: json-summary is read by scripts/lib/coverage-delta-core.mjs to
      // post the PR coverage-delta comment.
      reporter: ['text', 'lcov', 'json-summary'],
      // ratcheted to measured baseline (2026-06-16): the service owns its own
      // floor the same way lib.* packages ratchet against vitest.shared.config.
      // Measured: statements=92.44 branches=96.44 functions=90.69 lines=92.3
      thresholds: {
        statements: 91,
        branches: 95,
        functions: 89,
        lines: 91,
      },
    },
  },
});
