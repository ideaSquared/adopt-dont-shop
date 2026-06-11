/**
 * Environment utility functions
 * These can be easily mocked in tests
 */

export const isDevelopment = (): boolean => {
  // ADS-423: rely on Vite's static replacement of import.meta.env.* at build time.
  // The previous fallback to process.env was always undefined in browser bundles
  // because vite.config defined `'process.env': '{}'`.
  return import.meta.env.DEV === true;
};

export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL ?? '';
};

export const getEnvironmentVariable = (key: string, defaultValue?: string): string | undefined => {
  return import.meta.env[key] || defaultValue;
};
