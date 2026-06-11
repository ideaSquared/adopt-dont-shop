import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: lib.matching only exports type definitions and constants
      // from index.ts which is excluded from coverage. No coverable
      // source files exist, so thresholds are held at 0.
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
});
