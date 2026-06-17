import path from 'path';
import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    setupFiles: ['./src/test-utils/setup-tests.ts'],
    coverage: {
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/test-utils/**',
        'src/index.ts',
      ],
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // ratcheted to measured baseline (2026-06-16) after expanding
      // report-service / report-schema / report-hook / endpoint coverage.
      // Measured: statements=82.04 branches=73.04 functions=86.81 lines=81.65
      thresholds: {
        statements: 81,
        branches: 72,
        functions: 85,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
    },
  },
});
