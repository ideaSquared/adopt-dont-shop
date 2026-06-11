import { defineLibConfig } from '../vitest.shared.config';

export default defineLibConfig({
  test: {
    environment: 'node',
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured: statements=100 branches=95.23 functions=100 lines=100
      thresholds: {
        statements: 99,
        branches: 94,
        functions: 99,
        lines: 99,
      },
    },
  },
});
