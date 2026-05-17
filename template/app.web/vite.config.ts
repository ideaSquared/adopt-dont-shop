import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { getAppAliases, getLibraryAliases } from '../vite.shared.config';

export default defineConfig(({ mode }) => {
  const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
  const backendHost = isDocker ? 'service-api' : 'localhost';

  return {
    plugins: [react()],
    envDir: resolve(__dirname, '..'),
    resolve: {
      alias: {
        ...getAppAliases(__dirname),
        ...getLibraryAliases(__dirname, mode),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      watch: {
        usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
        interval: 100,
      },
      hmr: { overlay: true },
      proxy: {
        '/api': { target: `http://${backendHost}:5000`, changeOrigin: true, secure: false },
        '/health': { target: `http://${backendHost}:5000`, changeOrigin: true, secure: false },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
