import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    environment: 'node',
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured: statements=94.14 branches=91.07 functions=78.12 lines=95.4
      thresholds: {
        statements: 93,
        branches: 90,
        functions: 77,
        lines: 94,
      },
    },
  },
});
