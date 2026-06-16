import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured: statements=95.81 branches=93.15 functions=100 lines=95.8
      thresholds: {
        statements: 94,
        branches: 92,
        functions: 99,
        lines: 94,
      },
    },
  },
});
