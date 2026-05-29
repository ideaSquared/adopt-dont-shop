import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';
import path from 'path';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.analytics',
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
        // Measured: statements=32.94 branches=51.48 functions=29.21 lines=33.6
        thresholds: {
          statements: 31,
          branches: 50,
          functions: 28,
          lines: 32,
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
