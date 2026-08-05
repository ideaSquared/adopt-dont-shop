/**
 * Environment Configuration Utilities
 * Industry standard environment variable handling for URL configuration
 */

/**
 * Environment URL configuration interface
 */
export interface EnvironmentUrls {
  /** Base URL for HTTP API requests */
  apiBaseUrl: string;
  /** Base URL for WebSocket connections */
  wsBaseUrl: string;
}

/**
 * Environment configuration with default fallbacks
 */
export interface EnvironmentConfig extends EnvironmentUrls {
  /** Current environment mode */
  mode: 'development' | 'production' | 'test';
  /** Whether debug logging is enabled */
  debug: boolean;
}

/**
 * Default API base URL per environment. Production intentionally has NO
 * hardcoded external host: when VITE_API_BASE_URL is unset a production build
 * falls back to a same-origin/relative base ('') so it can never silently ship
 * pointing at a pinned external host (ADS-1057). The WebSocket base URL is
 * derived from the API base URL — see deriveWsBaseUrl.
 */
const DEFAULT_API_BASE_URL = {
  development: 'http://localhost:5000',
  production: '',
  test: 'http://localhost:5000',
} as const;

/**
 * Get environment variable with type safety
 */
function getEnvVar(key: string): string | undefined {
  // Vite environment (browser/build time)
  if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as unknown as Record<string, string>)[key];
  }

  // Node.js environment (server/build time)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }

  return undefined;
}

/**
 * Get current environment mode
 */
export function getEnvironmentMode(): 'development' | 'production' | 'test' {
  const mode = getEnvVar('MODE') || getEnvVar('NODE_ENV') || 'development';

  if (mode === 'production' || mode === 'prod') {
    return 'production';
  }
  if (mode === 'test' || mode === 'testing') {
    return 'test';
  }
  return 'development';
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  const mode = getEnvironmentMode();
  const debugEnv = getEnvVar('VITE_ENABLE_DEBUG_LOGGING');

  // Enable debug in development by default, or when explicitly enabled
  return mode === 'development' || debugEnv === 'true';
}

/**
 * Derive a WebSocket base URL from an HTTP API base URL by swapping the URL
 * scheme (http→ws, https→wss). A relative/same-origin base ('') or an already
 * ws(s) URL is returned unchanged, so the WebSocket base falls back to the same
 * origin rather than a hardcoded external host.
 */
function deriveWsBaseUrl(apiBaseUrl: string): string {
  if (apiBaseUrl.startsWith('https://')) {
    return `wss://${apiBaseUrl.slice('https://'.length)}`;
  }
  if (apiBaseUrl.startsWith('http://')) {
    return `ws://${apiBaseUrl.slice('http://'.length)}`;
  }
  return apiBaseUrl;
}

/**
 * Get URL configuration with proper fallbacks
 */
export function getUrlConfig(): EnvironmentUrls {
  const mode = getEnvironmentMode();

  // Get URLs from environment variables with fallbacks
  const apiBaseUrl =
    getEnvVar('VITE_API_BASE_URL') ||
    getEnvVar('VITE_API_URL') || // Legacy support
    DEFAULT_API_BASE_URL[mode];

  const wsBaseUrl =
    getEnvVar('VITE_WS_BASE_URL') ||
    getEnvVar('VITE_WEBSOCKET_URL') || // Legacy support
    getEnvVar('VITE_SOCKET_URL') || // Legacy support
    deriveWsBaseUrl(apiBaseUrl);

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ''), // Remove trailing slashes
    wsBaseUrl: wsBaseUrl.replace(/\/+$/, ''), // Remove trailing slashes
  };
}

/**
 * Get complete environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const mode = getEnvironmentMode();
  const debug = isDebugMode();
  const urls = getUrlConfig();

  const config = {
    mode,
    debug,
    ...urls,
  };

  return config;
}

/**
 * Get API base URL (most commonly used)
 */
export function getApiBaseUrl(): string {
  return getUrlConfig().apiBaseUrl;
}

/**
 * Get WebSocket base URL
 */
export function getWsBaseUrl(): string {
  return getUrlConfig().wsBaseUrl;
}

/**
 * Build API endpoint URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Build WebSocket URL
 */
export function buildWsUrl(endpoint: string = ''): string {
  const baseUrl = getWsBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Validate URL configuration
 */
export function validateUrlConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { apiBaseUrl, wsBaseUrl } = getUrlConfig();

  // Validate API URL
  try {
    new URL(apiBaseUrl);
  } catch {
    errors.push(`Invalid API base URL: ${apiBaseUrl}`);
  }

  // Validate WebSocket URL
  try {
    // Convert ws:// to http:// for URL validation
    const wsUrlForValidation = wsBaseUrl.replace(/^ws(s)?:/, 'http$1:');
    new URL(wsUrlForValidation);
  } catch {
    errors.push(`Invalid WebSocket base URL: ${wsBaseUrl}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Export singleton configuration
export const env = getEnvironmentConfig();
