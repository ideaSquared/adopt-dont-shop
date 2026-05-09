import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';
import path from 'path';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [react()],
    test: {
      name: 'lib.auth',
      setupFiles: ['./src/setupTests.ts'],
    },
    resolve: {
      alias: {
        '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
        '@adopt-dont-shop/lib.components': path.resolve(
          __dirname,
          '../lib.components/src/index.ts'
        ),
      },
    },
  })
);
