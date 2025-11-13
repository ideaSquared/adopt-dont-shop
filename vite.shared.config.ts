import { resolve } from 'path';

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
    '@adopt-dont-shop/lib.auth': resolve(appDir, '../lib.auth/src'),
    '@adopt-dont-shop/lib.chat': resolve(appDir, '../lib.chat/src'),
    '@adopt-dont-shop/lib.discovery': resolve(appDir, '../lib.discovery/src'),
    '@adopt-dont-shop/lib.feature-flags': resolve(appDir, '../lib.feature-flags/src'),
    '@adopt-dont-shop/lib.notifications': resolve(appDir, '../lib.notifications/src'),
    '@adopt-dont-shop/lib.permissions': resolve(appDir, '../lib.permissions/src'),
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
