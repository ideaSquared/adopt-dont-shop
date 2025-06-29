import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AdoptDontShopComponents',
      formats: ['es', 'umd'],
      fileName: format => `adopt-dont-shop-components.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'styled-components',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-dropdown-menu',
        'clsx',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'styled-components': 'styled',
          '@radix-ui/react-tooltip': 'RadixTooltip',
          '@radix-ui/react-dropdown-menu': 'RadixDropdownMenu',
          clsx: 'clsx',
        },
      },
    },
  },
});
