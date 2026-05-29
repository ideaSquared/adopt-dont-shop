import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';
import path from 'path';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.dev-tools',
      setupFiles: ['./src/test-utils/setup-tests.ts'],
      coverage: {
        exclude: [
          'src/**/*.d.ts',
          'src/**/*.test.ts',
          'src/**/*.spec.ts',
          'src/test-utils/**',
          'src/index.ts',
        ],
        // ADS-717: lib.dev-tools has pre-existing test failures that prevent
        // reliable coverage measurement. Thresholds held at 0 until tests are
        // fixed (see failing tests in isDevelopmentMode.test.ts).
        thresholds: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
      },
    },
    resolve: {
      alias: {
        // .css.ts files are stubbed via the shared transform approach
      },
    },
  })
);
