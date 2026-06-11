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
      // Measured: statements=51.96 branches=48.71 functions=56.75 lines=52.23
      thresholds: {
        statements: 50,
        branches: 47,
        functions: 55,
        lines: 51,
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
