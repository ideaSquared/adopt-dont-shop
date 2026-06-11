import path from 'path';
import { defineLibConfig } from '../vitest.shared.config';

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
      // Measured: statements=60.2 branches=60.15 functions=42.3 lines=60.2
      thresholds: {
        statements: 59,
        branches: 59,
        functions: 41,
        lines: 59,
      },
    },
  },
  resolve: {
    alias: {
      '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
    },
  },
});
