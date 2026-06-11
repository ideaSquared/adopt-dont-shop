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
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured: statements=58.12 branches=52.99 functions=58.06 lines=57.25
      thresholds: {
        statements: 57,
        branches: 51,
        functions: 57,
        lines: 56,
      },
    },
  },
});
