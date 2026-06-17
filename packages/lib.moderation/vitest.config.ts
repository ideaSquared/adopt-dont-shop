import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured: statements=95.33 branches=87.27 functions=100 lines=95.31
      thresholds: {
        statements: 94,
        branches: 86,
        functions: 99,
        lines: 94,
      },
    },
  },
});
