import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.invitations',
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
        // Measured: statements=58.69 branches=40.74 functions=100 lines=58.69
        thresholds: {
          statements: 57,
          branches: 39,
          functions: 99,
          lines: 57,
        },
      },
    },
  })
);
