import react from '@vitejs/plugin-react';
import { existsSync } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Stubs all Vanilla Extract CSS files with callable proxies.
// Handles both `import styles from '...'` (default) and `import * as styles from '...'` (namespace).
const veCssMock: Plugin = {
  name: 've-css-stub',
  enforce: 'pre',

  resolveId(id, importer) {
    if (!importer || !id.endsWith('.css') || id.endsWith('.module.css')) {
      return;
    }
    const base = id.startsWith('.') ? path.resolve(path.dirname(importer), id) : id;
    if (existsSync(base + '.ts')) {
      return base + '.ts';
    }
    return `\0ve-stub:${id}`;
  },

  load(id) {
    if (id.startsWith('\0ve-stub:')) {
      return 'export default {};';
    }
  },

  transform(code, id) {
    if (!id.endsWith('.css.ts')) {
      return;
    }
    const names: string[] = [];
    const re = /^export\s+(?:const|let|var|function)\s+(\w+)/gm;
    let m;
    while ((m = re.exec(code)) !== null) {
      names.push(m[1]);
    }

    const factory = `function _p(){const f=(..._a)=>'';return new Proxy(f,{get:(_,k)=>typeof k==='string'?_p():f[k],apply:()=>''});}`;
    const named = names.map(n => `export const ${n}=_p();`).join('\n');
    return { code: `${factory}\n${named}\nexport default _p();`, map: null };
  },
};

export default defineConfig({
  plugins: [react(), veCssMock],
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
      '@adopt-dont-shop/lib.components/theme': path.resolve(
        __dirname,
        '../lib.components/src/theme.ts'
      ),
      '@adopt-dont-shop/lib.components': path.resolve(__dirname, '../lib.components/src/index.ts'),
      '@adopt-dont-shop/lib.auth': path.resolve(__dirname, '../lib.auth/src/index.ts'),
      '@adopt-dont-shop/lib.pets': path.resolve(__dirname, '../lib.pets/src/index.ts'),
      '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
      '@adopt-dont-shop/lib.discovery': path.resolve(__dirname, '../lib.discovery/src/index.ts'),
      '@adopt-dont-shop/lib.applications': path.resolve(
        __dirname,
        '../lib.applications/src/index.ts'
      ),
      '@adopt-dont-shop/lib.chat': path.resolve(__dirname, '../lib.chat/src/index.ts'),
      '@adopt-dont-shop/lib.analytics': path.resolve(__dirname, '../lib.analytics/src/index.ts'),
      '@adopt-dont-shop/lib.notifications': path.resolve(
        __dirname,
        '../lib.notifications/src/index.ts'
      ),
      '@adopt-dont-shop/lib.feature-flags': path.resolve(
        __dirname,
        '../lib.feature-flags/src/index.ts'
      ),
      '@adopt-dont-shop/lib.permissions': path.resolve(
        __dirname,
        '../lib.permissions/src/index.ts'
      ),
      '@adopt-dont-shop/lib.search': path.resolve(__dirname, '../lib.search/src/index.ts'),
      '@adopt-dont-shop/lib.validation': path.resolve(__dirname, '../lib.validation/src/index.ts'),
      '@adopt-dont-shop/lib.utils': path.resolve(__dirname, '../lib.utils/src/index.ts'),
      '@adopt-dont-shop/lib.rescue': path.resolve(__dirname, '../lib.rescue/src/index.ts'),
      '@adopt-dont-shop/lib.types': path.resolve(__dirname, '../lib.types/src/index.ts'),
    },
  },
});
