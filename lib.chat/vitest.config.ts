import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';
import path from 'path';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.chat',
      setupFiles: ['./src/setupTests.ts'],
      coverage: {
        exclude: [
          'src/**/*.d.ts',
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/*.spec.ts',
          'src/**/*.spec.tsx',
          'src/setupTests.ts',
          'src/test-utils.tsx',
          'src/__mocks__/**/*',
          'src/index.ts',
        ],
      },
    },
    resolve: {
      alias: {
        '@adopt-dont-shop/lib.components/theme': path.resolve(
          __dirname,
          './src/__mocks__/lib.components.tsx'
        ),
        '@adopt-dont-shop/lib.components': path.resolve(
          __dirname,
          './src/__mocks__/lib.components.tsx'
        ),
        'react-icons/md': path.resolve(__dirname, './src/__mocks__/react-icons.tsx'),
        '@vanilla-extract/css': path.resolve(__dirname, './src/__mocks__/vanilla-extract-css.ts'),
        '@vanilla-extract/recipes': path.resolve(
          __dirname,
          './src/__mocks__/vanilla-extract-css.ts'
        ),
      },
    },
  })
);
