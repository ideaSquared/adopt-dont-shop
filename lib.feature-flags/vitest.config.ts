import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.feature-flags',
      setupFiles: ['./src/test-utils/setup-tests.ts'],
    },
  })
);
