import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';
import path from 'path';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.permissions',
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
    resolve: {
      alias: {
        '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
        '@adopt-dont-shop/lib.types': path.resolve(__dirname, '../lib.types/src/index.ts'),
      },
    },
  })
);
