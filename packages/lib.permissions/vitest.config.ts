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
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured: statements=90.74 branches=84.49 functions=100 lines=90.61
      thresholds: {
        statements: 89,
        branches: 83,
        functions: 99,
        lines: 89,
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
