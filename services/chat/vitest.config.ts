import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/migrations/**', 'src/**/index.ts'],
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
