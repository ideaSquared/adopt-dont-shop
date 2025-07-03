import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      ...(mode === 'development'
        ? { '@adopt-dont-shop/components': resolve(__dirname, '../lib.components/src') }
        : {}),
    },
    dedupe: ['styled-components', 'react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['styled-components'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}));
