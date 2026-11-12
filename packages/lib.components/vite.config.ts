import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { compilationMode: 'annotation' }]],
      },
    }),
    vanillaExtractPlugin(),
  ],

  // Development server setup for standalone component development
  server: {
    port: 3010,
    host: '0.0.0.0',
  },

  // Only apply library build config in production mode
  ...(mode === 'production' && {
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
          'react-router',
          'styled-components',
          '@radix-ui/react-tooltip',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-select',
          'clsx',
          'react-world-flags',
          // recharts pulls in CommonJS (use-sync-external-store) that
          // requires react. With react external here, bundling it compiles
          // those requires to rolldown's runtime `require` shim, which throws
          // in the browser and blanked every app. Left external, the app's
          // build resolves it together with react.
          'recharts',
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react-router': 'ReactRouter',
            'styled-components': 'styled',
            '@radix-ui/react-tooltip': 'RadixTooltip',
            '@radix-ui/react-dropdown-menu': 'RadixDropdownMenu',
            '@radix-ui/react-select': 'RadixSelect',
            clsx: 'clsx',
            'react-world-flags': 'ReactWorldFlags',
            recharts: 'Recharts',
          },
        },
      },
    },
  }),
}));
