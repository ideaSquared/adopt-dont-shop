import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Check if we're running in Docker (service-backend hostname is available)
  const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';

  return {
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
      port: isDocker ? 3000 : 3001,
      // Use proxy for local development outside Docker
      proxy: !isDocker
        ? {
            '/api': {
              target: 'http://localhost:5000',
              changeOrigin: true,
              secure: false,
            },
            '/health': {
              target: 'http://localhost:5000',
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
