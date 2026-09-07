import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/index.ts'],
      // Measured baseline (2026-09-07, ADS-1325):
      // statements=93.84 branches=81.25 functions=85.71 lines=95.31
      thresholds: {
        statements: 93,
        branches: 81,
        functions: 85,
        lines: 95,
      },
    },
  },
});
