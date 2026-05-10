import react from '@vitejs/plugin-react';
import { existsSync } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';

// Stubs all Vanilla Extract CSS files with callable proxies. Mirrors the
// pattern used by app.admin / app.client / app.rescue so the modal under
// test can import its `.css.ts` styles without going through the real
// vanilla-extract pipeline (which needs a full Vite/Rolldown context).
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

export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [react(), veCssMock],
    test: {
      name: 'lib.legal',
      setupFiles: ['./src/setupTests.ts'],
    },
    resolve: {
      alias: {
        '@adopt-dont-shop/lib.api': path.resolve(__dirname, '../lib.api/src/index.ts'),
        '@adopt-dont-shop/lib.auth': path.resolve(__dirname, '../lib.auth/src/index.ts'),
        '@adopt-dont-shop/lib.components': path.resolve(
          __dirname,
          '../lib.components/src/index.ts'
        ),
        '@adopt-dont-shop/lib.components/theme': path.resolve(
          __dirname,
          '../lib.components/src/theme.ts'
        ),
      },
    },
  })
);
