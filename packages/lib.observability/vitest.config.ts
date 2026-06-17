import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured (full behavioural coverage of consent / sentry / web-vitals):
      // statements=100 branches=100 functions=100 lines=100
      thresholds: {
        statements: 99,
        branches: 99,
        functions: 99,
        lines: 99,
      },
    },
  },
});
