import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Development aliases for all libraries to use source files directly
  const libraryAliases =
    mode === 'development'
      ? {
          '@adopt-dont-shop/components': resolve(__dirname, '../lib.components/src'),
          '@adopt-dont-shop/lib-analytics': resolve(__dirname, '../lib.analytics/src'),
          '@adopt-dont-shop/lib-api': resolve(__dirname, '../lib.api/src'),
          '@adopt-dont-shop/lib-applications': resolve(__dirname, '../lib.applications/src'),
          '@adopt-dont-shop/lib-auth': resolve(__dirname, '../lib.auth/src'),
          '@adopt-dont-shop/lib-chat': resolve(__dirname, '../lib.chat/src'),
          '@adopt-dont-shop/lib-discovery': resolve(__dirname, '../lib.discovery/src'),
          '@adopt-dont-shop/lib-feature-flags': resolve(__dirname, '../lib.feature-flags/src'),
          '@adopt-dont-shop/lib-notifications': resolve(__dirname, '../lib.notifications/src'),
          '@adopt-dont-shop/lib-permissions': resolve(__dirname, '../lib.permissions/src'),
          '@adopt-dont-shop/lib-pets': resolve(__dirname, '../lib.pets/src'),
          '@adopt-dont-shop/lib-rescue': resolve(__dirname, '../lib.rescue/src'),
          '@adopt-dont-shop/lib-search': resolve(__dirname, '../lib.search/src'),
          '@adopt-dont-shop/lib-utils': resolve(__dirname, '../lib.utils/src'),
          '@adopt-dont-shop/lib-validation': resolve(__dirname, '../lib.validation/src'),
        }
      : {};

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        ...libraryAliases,
      },
      dedupe: ['styled-components', 'react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['styled-components'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    define: {
      'process.env': '{}',
    },
  };
});
