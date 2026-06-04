import { existsSync } from 'fs';
import path, { resolve } from 'path';
import type { Plugin } from 'vite';

/**
 * Get development aliases for all workspace libraries
 * This allows apps to import library source files directly in development
 * for hot reloading without needing to rebuild library containers
 */
export function getLibraryAliases(appDir: string, mode: string) {
  if (mode !== 'development') {
    return {};
  }

  const libraryAliases = {
    '@adopt-dont-shop/lib.components': resolve(appDir, '../lib.components/src'),
    '@adopt-dont-shop/lib.analytics': resolve(appDir, '../lib.analytics/src'),
    '@adopt-dont-shop/lib.api': resolve(appDir, '../lib.api/src'),
    '@adopt-dont-shop/lib.applications': resolve(appDir, '../lib.applications/src'),
    '@adopt-dont-shop/lib.audit-logs': resolve(appDir, '../lib.audit-logs/src'),
    '@adopt-dont-shop/lib.auth': resolve(appDir, '../lib.auth/src'),
    '@adopt-dont-shop/lib.chat': resolve(appDir, '../lib.chat/src'),
    '@adopt-dont-shop/lib.dev-tools': resolve(appDir, '../lib.dev-tools/src'),
    '@adopt-dont-shop/lib.discovery': resolve(appDir, '../lib.discovery/src'),
    '@adopt-dont-shop/lib.feature-flags': resolve(appDir, '../lib.feature-flags/src'),
    '@adopt-dont-shop/lib.legal': resolve(appDir, '../lib.legal/src'),
    '@adopt-dont-shop/lib.matching': resolve(appDir, '../lib.matching/src'),
    '@adopt-dont-shop/lib.moderation': resolve(appDir, '../lib.moderation/src'),
    '@adopt-dont-shop/lib.notifications': resolve(appDir, '../lib.notifications/src'),
    '@adopt-dont-shop/lib.observability': resolve(appDir, '../lib.observability/src'),
    '@adopt-dont-shop/lib.permissions': resolve(appDir, '../lib.permissions/src'),
    '@adopt-dont-shop/lib.support-tickets': resolve(appDir, '../lib.support-tickets/src'),
    '@adopt-dont-shop/lib.types': resolve(appDir, '../lib.types/src'),
    '@adopt-dont-shop/lib.pets': resolve(appDir, '../lib.pets/src'),
    '@adopt-dont-shop/lib.rescue': resolve(appDir, '../lib.rescue/src'),
    '@adopt-dont-shop/lib.search': resolve(appDir, '../lib.search/src'),
    '@adopt-dont-shop/lib.utils': resolve(appDir, '../lib.utils/src'),
    '@adopt-dont-shop/lib.validation': resolve(appDir, '../lib.validation/src'),
    '@adopt-dont-shop/lib.invitations': resolve(appDir, '../lib.invitations/src'),
  };

  return libraryAliases;
}

/**
 * ADS-761: Vanilla-Extract CSS stub used by the three app vitest configs.
 *
 * Stubs all Vanilla-Extract .css.ts modules with callable Proxy factories so
 * vitest does not need to evaluate the real vanilla-extract pipeline. Handles
 * both `import styles from '...'` (default) and `import * as styles from '...'`
 * (namespace) by discovering named exports via regex.
 */
export const veCssMock: Plugin = {
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

/**
 * Standard app aliases for internal imports
 */
export function getAppAliases(appDir: string) {
  return {
    '@': resolve(appDir, './src'),
    '@/components': resolve(appDir, './src/components'),
    '@/hooks': resolve(appDir, './src/hooks'),
    '@/utils': resolve(appDir, './src/utils'),
    '@/types': resolve(appDir, './src/types'),
    '@/services': resolve(appDir, './src/services'),
    '@/contexts': resolve(appDir, './src/contexts'),
    '@/pages': resolve(appDir, './src/pages'),
  };
}
