/**
 * Environment utility functions
 * These can be easily mocked in tests
 */

export const isDevelopment = (): boolean => {
  try {
    return import.meta.env.DEV === true;
  } catch {
    return process.env.NODE_ENV === 'development';
  }
};

export const getApiBaseUrl = (): string => {
  try {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  } catch {
    return process.env.VITE_API_BASE_URL || 'http://localhost:5000';
  }
};

export const getEnvironmentVariable = (key: string, defaultValue?: string): string | undefined => {
  try {
    return import.meta.env[key] || defaultValue;
  } catch {
    return process.env[key] || defaultValue;
  }
};
