import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import { getLibraryAliases, veCssMock } from '../vite.shared.config';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { compilationMode: 'annotation' }]],
      },
    }),
    veCssMock,
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setup-tests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/services': path.resolve(__dirname, './src/services'),
      // ADS-762: theme sub-path must be declared before the lib.components
      // alias below so vite resolves it first.
      '@adopt-dont-shop/lib.components/theme': path.resolve(
        __dirname,
        '../lib.components/src/theme.ts'
      ),
      // ADS-762: all @adopt-dont-shop/lib.* aliases come from the shared
      // getLibraryAliases() helper — the single source of truth also used
      // by each app's vite.config.ts and verified by the workspace-drift
      // CI guard. Do not hand-roll new lib aliases here.
      ...getLibraryAliases(__dirname, 'development'),
    },
  },
});
