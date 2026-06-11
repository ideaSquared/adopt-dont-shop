import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vanillaExtractPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/theme.ts'),
      formats: ['es'],
      fileName: () => 'theme.es.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-router-dom',
        'styled-components',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-select',
        'clsx',
        'react-world-flags',
      ],
    },
  },
});
