import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured: statements=21.6 branches=46.57 functions=25.45 lines=21.67
      thresholds: {
        statements: 20,
        branches: 45,
        functions: 24,
        lines: 20,
      },
    },
  },
});
