import { resolve } from 'path';

/**
 * Get development aliases for all workspace libraries.
 *
 * This allows apps to import library source files directly in development
 * for hot reloading without needing to rebuild library containers.
 *
 * When you add a new lib via `npm run new-lib`, the script auto-appends
 * to this list.
 */
export function getLibraryAliases(appDir: string, mode: string) {
  if (mode !== 'development') {
    return {};
  }

  const libraryAliases = {
    '@my-org/lib.example': resolve(appDir, '../lib.example/src'),
  };

  return libraryAliases;
}

/**
 * Standard app aliases for internal imports.
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
