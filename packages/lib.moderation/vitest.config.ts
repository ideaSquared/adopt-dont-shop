import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    coverage: {
      // ADS-717: ratcheted to measured baseline (2026-06-16); set ~4pts below measured
      // to absorb CI coverage variance on async/React-heavy code.
      // Measured: statements=95.33 branches=87.27 functions=100 lines=95.31
      thresholds: {
        statements: 91,
        branches: 83,
        functions: 99,
        lines: 91,
      },
    },
  },
});
