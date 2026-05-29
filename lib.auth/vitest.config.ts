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
      coverage: {
        // ADS-717: ratcheted to measured baseline (2026-05-29).
        // Measured: statements=52.25 branches=40.74 functions=55.55 lines=51.83
        thresholds: {
          statements: 51,
          branches: 39,
          functions: 54,
          lines: 50,
        },
      },
    },
    resolve: {
      alias: {
        '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
        '@adopt-dont-shop/lib.components/theme': path.resolve(
          __dirname,
          '../lib.components/src/styles/theme.css.ts'
        ),
        '@adopt-dont-shop/lib.components': path.resolve(
          __dirname,
          '../lib.components/src/index.ts'
        ),
        // VE's style() / createThemeContract() need a build-time file
        // scope that doesn't exist in jsdom; stub it so the
        // lib.components source can be imported in component tests.
        '@vanilla-extract/css': path.resolve(__dirname, './src/__mocks__/vanilla-extract-css.ts'),
        '@vanilla-extract/recipes': path.resolve(
          __dirname,
          './src/__mocks__/vanilla-extract-css.ts'
        ),
      },
    },
  })
);
