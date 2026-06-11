import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured (with web-vitals.ts included): statements=62.06 branches=57.69 functions=60 lines=64.81
      thresholds: {
        statements: 61,
        branches: 56,
        functions: 59,
        lines: 63,
      },
    },
  },
});
