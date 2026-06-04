import { defineLibConfig } from '../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured: statements=72.94 branches=70.21 functions=66.66 lines=72.85
      thresholds: {
        statements: 71,
        branches: 69,
        functions: 65,
        lines: 71,
      },
    },
  },
});
