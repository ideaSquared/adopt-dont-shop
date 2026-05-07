import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.discovery',
      setupFiles: ['./src/test-utils/setup-tests.ts'],
      coverage: {
        exclude: [
          'src/**/*.d.ts',
          'src/**/*.test.ts',
          'src/**/*.spec.ts',
          'src/test-utils/**',
          'src/index.ts',
        ],
      },
    },
  })
);
