import path from 'path';
import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    environment: 'node',
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
      // Measured: statements=84.42 branches=62.22 functions=100 lines=84.42
      thresholds: {
        statements: 83,
        branches: 61,
        functions: 99,
        lines: 83,
      },
    },
  },
  resolve: {
    alias: {
      '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
      mjml: path.resolve(__dirname, './src/email/__tests__/mjml-mock.ts'),
    },
  },
});
