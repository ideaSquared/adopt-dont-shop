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
      // Measured: statements=100 branches=88.13 functions=100 lines=100
      thresholds: {
        statements: 99,
        branches: 87,
        functions: 99,
        lines: 99,
      },
    },
  },
  resolve: {
    alias: {
      '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
    },
  },
});
