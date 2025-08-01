import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@/components': resolve(__dirname, './src/components'),
        '@/hooks': resolve(__dirname, './src/hooks'),
        '@/utils': resolve(__dirname, './src/utils'),
        '@/types': resolve(__dirname, './src/types'),
        '@/services': resolve(__dirname, './src/services'),
        '@/contexts': resolve(__dirname, './src/contexts'),
        '@/pages': resolve(__dirname, './src/pages'),
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
      port: 3003,
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
