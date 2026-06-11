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
    '@adopt-dont-shop/lib.components': resolve(appDir, '../../packages/lib.components/src'),
    '@adopt-dont-shop/lib.analytics': resolve(appDir, '../../packages/lib.analytics/src'),
    '@adopt-dont-shop/lib.api': resolve(appDir, '../../packages/lib.api/src'),
    '@adopt-dont-shop/lib.applications': resolve(appDir, '../../packages/lib.applications/src'),
    '@adopt-dont-shop/lib.audit-logs': resolve(appDir, '../../packages/lib.audit-logs/src'),
    '@adopt-dont-shop/lib.auth': resolve(appDir, '../../packages/lib.auth/src'),
    '@adopt-dont-shop/lib.chat': resolve(appDir, '../../packages/lib.chat/src'),
    '@adopt-dont-shop/lib.dev-tools': resolve(appDir, '../../packages/lib.dev-tools/src'),
    '@adopt-dont-shop/lib.discovery': resolve(appDir, '../../packages/lib.discovery/src'),
    '@adopt-dont-shop/lib.feature-flags': resolve(appDir, '../../packages/lib.feature-flags/src'),
    '@adopt-dont-shop/lib.legal': resolve(appDir, '../../packages/lib.legal/src'),
    '@adopt-dont-shop/lib.matching': resolve(appDir, '../../packages/lib.matching/src'),
    '@adopt-dont-shop/lib.moderation': resolve(appDir, '../../packages/lib.moderation/src'),
    '@adopt-dont-shop/lib.notifications': resolve(appDir, '../../packages/lib.notifications/src'),
    '@adopt-dont-shop/lib.observability': resolve(appDir, '../../packages/lib.observability/src'),
    '@adopt-dont-shop/lib.permissions': resolve(appDir, '../../packages/lib.permissions/src'),
    '@adopt-dont-shop/lib.support-tickets': resolve(
      appDir,
      '../../packages/lib.support-tickets/src'
    ),
    '@adopt-dont-shop/lib.types': resolve(appDir, '../../packages/lib.types/src'),
    '@adopt-dont-shop/lib.pets': resolve(appDir, '../../packages/lib.pets/src'),
    '@adopt-dont-shop/lib.rescue': resolve(appDir, '../../packages/lib.rescue/src'),
    '@adopt-dont-shop/lib.search': resolve(appDir, '../../packages/lib.search/src'),
    '@adopt-dont-shop/lib.utils': resolve(appDir, '../../packages/lib.utils/src'),
    '@adopt-dont-shop/lib.validation': resolve(appDir, '../../packages/lib.validation/src'),
    '@adopt-dont-shop/lib.invitations': resolve(appDir, '../../packages/lib.invitations/src'),
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
