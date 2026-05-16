import react from '@vitejs/plugin-react';
import { existsSync } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';

/**
 * Vitest-compatible Vanilla Extract CSS stub plugin (mirrors app.admin's veCssMock).
 * Intercepts *.css.ts imports and replaces them with empty callable proxies so
 * the jsdom test environment never tries to process VE at runtime.
 */
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
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', { compilationMode: 'annotation' }]],
        },
      }),
      veCssMock,
    ],
    test: {
      name: 'lib.components',
      setupFiles: ['./src/setupTests.ts'],
      coverage: {
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: [
          'src/**/*.d.ts',
          'src/index.ts',
          'src/types/**/*',
          'src/styles/**/*',
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/*.spec.ts',
          'src/**/*.spec.tsx',
        ],
      },
    },
    resolve: {
      alias: {
        // identity-obj-proxy equivalent: plain CSS modules return class name as-is
        '\\.(less|scss|sass)$': 'identity-obj-proxy',
      },
    },
  })
);
