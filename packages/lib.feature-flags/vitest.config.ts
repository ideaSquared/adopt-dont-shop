import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    setupFiles: ['./src/test-utils/setup-tests.ts'],
    coverage: {
      // vanilla-extract style declarations carry no behaviour and are stubbed in tests.
      exclude: ['src/**/*.css.ts'],
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured: statements=100 branches=100 functions=100 lines=100
      thresholds: {
        statements: 99,
        branches: 99,
        functions: 99,
        lines: 99,
      },
    },
  },
});
