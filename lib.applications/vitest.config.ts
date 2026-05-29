import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';
import path from 'path';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.applications',
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
        // Measured: statements=50.35 branches=27.11 functions=48 lines=52.63
        thresholds: {
          statements: 49,
          branches: 26,
          functions: 47,
          lines: 51,
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
