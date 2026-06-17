import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured: statements=98.28 branches=88 functions=100 lines=98.26
      thresholds: {
        statements: 97,
        branches: 87,
        functions: 99,
        lines: 97,
      },
    },
  },
});
