import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured: statements=95.89 branches=90.95 functions=100 lines=95.87
      thresholds: {
        statements: 94,
        branches: 89,
        functions: 99,
        lines: 94,
      },
    },
  },
});
