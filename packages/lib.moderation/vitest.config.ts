import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured: statements=35.93 branches=61.81 functions=29.16 lines=36.07
      thresholds: {
        statements: 34,
        branches: 60,
        functions: 28,
        lines: 35,
      },
    },
  },
});
