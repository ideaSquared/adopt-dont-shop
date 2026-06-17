import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    setupFiles: ['./src/test-utils/setup-tests.ts'],
    coverage: {
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/test-utils/**',
        'src/index.ts',
      ],
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured: statements=94.11 branches=95.12 functions=100 lines=94.11
      thresholds: {
        statements: 93,
        branches: 94,
        functions: 99,
        lines: 93,
      },
    },
  },
});
