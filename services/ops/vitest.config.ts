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
        'src/**/index.ts',
        'src/test-support.ts',
      ],
      reporter: ['text', 'lcov', 'json-summary'],
      // Measured: statements=84.69 branches=82.69 functions=79.38 lines=85.41.
      // pg-store is covered by pg-store.integration.test.ts (real Postgres,
      // skipped without DATABASE_URL); grpc-caller and the boot files are not
      // unit-tested.
      thresholds: {
        statements: 84,
        branches: 82,
        functions: 79,
        lines: 85,
      },
    },
  },
});
