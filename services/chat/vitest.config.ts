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
        // DB seed CLI: its logic (seedChats) is exercised by seed.test.ts, but
        // the `main()` entrypoint wrapper isn't — exclude it like migrations so
        // it doesn't drag the ratcheted floor.
        'src/db/seed.ts',
        // Dev-only bulk-data ('spam') seeder — a manual, env-gated CLI that
        // never runs in production. Excluded like the seed CLI above.
        'src/db/spam.ts',
        'src/**/index.ts',
      ],
      reporter: ['text', 'lcov'],
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
