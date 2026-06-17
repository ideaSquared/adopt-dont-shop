import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-06-16); set ~4pts below measured
      // to absorb CI coverage variance on async/React-heavy code.
      // Measured: statements=95.81 branches=93.15 functions=100 lines=95.8
      thresholds: {
        statements: 92,
        branches: 89,
        functions: 99,
        lines: 92,
      },
    },
  },
});
