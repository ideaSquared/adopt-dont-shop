import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.feature-flags',
      setupFiles: ['./src/test-utils/setup-tests.ts'],
      coverage: {
        // ADS-717: ratcheted to measured baseline (2026-05-29).
        // Measured: statements=63.63 branches=87.5 functions=27.27 lines=63.63
        thresholds: {
          statements: 62,
          branches: 86,
          functions: 26,
          lines: 62,
        },
      },
    },
  })
);
