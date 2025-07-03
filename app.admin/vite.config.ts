import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  resolve: {
    alias:
      mode === 'development'
        ? {
            '@adopt-dont-shop/components': resolve(__dirname, '../lib.components/src'),
          }
        : {},
  },

  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}));
