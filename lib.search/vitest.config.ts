import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';
import path from 'path';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.search',
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
        // Measured: statements=87.59 branches=81.25 functions=80.95 lines=88.28
        thresholds: {
          statements: 86,
          branches: 80,
          functions: 79,
          lines: 87,
        },
      },
    },
    resolve: {
      alias: {
        '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
      },
    },
  })
);
