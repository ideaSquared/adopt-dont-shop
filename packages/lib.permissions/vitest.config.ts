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
      // ADS-717: ratcheted to measured baseline (2026-06-16); set ~4pts below measured
      // to absorb CI coverage variance on async/React-heavy code.
      // Measured: statements=90.74 branches=84.49 functions=100 lines=90.61
      thresholds: {
        statements: 87,
        branches: 80,
        functions: 99,
        lines: 87,
      },
    },
  },
  resolve: {
    alias: {
      '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
      '@adopt-dont-shop/lib.types': path.resolve(__dirname, '../lib.types/src/index.ts'),
    },
  },
});
