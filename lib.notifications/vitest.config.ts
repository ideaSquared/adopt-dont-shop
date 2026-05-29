import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';
import path from 'path';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.notifications',
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
        // ADS-717: ratcheted to measured baseline (2026-05-29).
        // Measured: statements=40.16 branches=22.22 functions=57.69 lines=40.16
        thresholds: {
          statements: 39,
          branches: 21,
          functions: 56,
          lines: 39,
        },
      },
    },
    resolve: {
      alias: {
        '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
        mjml: path.resolve(__dirname, './src/email/__tests__/mjml-mock.ts'),
      },
    },
  })
);
