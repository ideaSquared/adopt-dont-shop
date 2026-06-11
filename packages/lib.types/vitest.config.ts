import { defineLibConfig } from '../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured: statements=31.17 branches=52 functions=52.63 lines=31.54
      thresholds: {
        statements: 30,
        branches: 51,
        functions: 51,
        lines: 30,
      },
    },
  },
});
