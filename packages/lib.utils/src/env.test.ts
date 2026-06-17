import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getEnvironmentMode,
  isDebugMode,
  getUrlConfig,
  getEnvironmentConfig,
  getApiBaseUrl,
  getWsBaseUrl,
  buildApiUrl,
  buildWsUrl,
  validateUrlConfig,
} from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getEnvironmentMode', () => {
  it('maps production/prod to "production"', () => {
    vi.stubEnv('MODE', 'production');
    expect(getEnvironmentMode()).toBe('production');
    vi.stubEnv('MODE', 'prod');
    expect(getEnvironmentMode()).toBe('production');
  });

  it('maps test/testing to "test"', () => {
    vi.stubEnv('MODE', 'test');
    expect(getEnvironmentMode()).toBe('test');
    vi.stubEnv('MODE', 'testing');
    expect(getEnvironmentMode()).toBe('test');
  });

  it('defaults to "development" for anything else', () => {
    vi.stubEnv('MODE', 'something-else');
    expect(getEnvironmentMode()).toBe('development');
  });

  it('falls back to NODE_ENV when MODE is unset', () => {
    vi.stubEnv('MODE', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(getEnvironmentMode()).toBe('production');
  });
});

describe('isDebugMode', () => {
  it('is enabled by default in development', () => {
    vi.stubEnv('MODE', 'development');
    expect(isDebugMode()).toBe(true);
  });

  it('is disabled in production unless explicitly enabled', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ENABLE_DEBUG_LOGGING', '');
    expect(isDebugMode()).toBe(false);
  });

  it('is enabled in production when the debug flag is set', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ENABLE_DEBUG_LOGGING', 'true');
    expect(isDebugMode()).toBe(true);
  });
});

describe('getUrlConfig', () => {
  it('uses production defaults in production mode', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_WS_BASE_URL', '');
    vi.stubEnv('VITE_WEBSOCKET_URL', '');
    vi.stubEnv('VITE_SOCKET_URL', '');
    expect(getUrlConfig()).toEqual({
      apiBaseUrl: 'https://api.adoptdontshop.com',
      wsBaseUrl: 'wss://api.adoptdontshop.com',
    });
  });

  it('prefers explicit env vars and strips trailing slashes', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://example.com/api///');
    vi.stubEnv('VITE_WS_BASE_URL', 'wss://example.com/ws/');
    expect(getUrlConfig()).toEqual({
      apiBaseUrl: 'https://example.com/api',
      wsBaseUrl: 'wss://example.com/ws',
    });
  });

  it('honours legacy fallback env vars', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_API_URL', 'https://legacy.example.com');
    vi.stubEnv('VITE_WS_BASE_URL', '');
    vi.stubEnv('VITE_WEBSOCKET_URL', '');
    vi.stubEnv('VITE_SOCKET_URL', 'wss://legacy.example.com');
    expect(getUrlConfig()).toEqual({
      apiBaseUrl: 'https://legacy.example.com',
      wsBaseUrl: 'wss://legacy.example.com',
    });
  });
});

describe('getEnvironmentConfig', () => {
  it('combines mode, debug and url config', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:1234');
    vi.stubEnv('VITE_WS_BASE_URL', 'ws://localhost:1234');
    expect(getEnvironmentConfig()).toEqual({
      mode: 'development',
      debug: true,
      apiBaseUrl: 'http://localhost:1234',
      wsBaseUrl: 'ws://localhost:1234',
    });
  });
});

describe('getApiBaseUrl / getWsBaseUrl', () => {
  it('return the resolved base URLs', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test');
    vi.stubEnv('VITE_WS_BASE_URL', 'wss://api.test');
    expect(getApiBaseUrl()).toBe('https://api.test');
    expect(getWsBaseUrl()).toBe('wss://api.test');
  });
});

describe('buildApiUrl', () => {
  it('joins an endpoint that already has a leading slash', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test');
    expect(buildApiUrl('/users')).toBe('https://api.test/users');
  });

  it('prepends a slash when the endpoint lacks one', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test');
    expect(buildApiUrl('users')).toBe('https://api.test/users');
  });
});

describe('buildWsUrl', () => {
  it('joins an endpoint with a leading slash', () => {
    vi.stubEnv('VITE_WS_BASE_URL', 'wss://api.test');
    expect(buildWsUrl('/socket')).toBe('wss://api.test/socket');
  });

  it('defaults to an empty endpoint', () => {
    vi.stubEnv('VITE_WS_BASE_URL', 'wss://api.test');
    expect(buildWsUrl()).toBe('wss://api.test/');
  });
});

describe('validateUrlConfig', () => {
  it('reports valid for well-formed URLs', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test');
    vi.stubEnv('VITE_WS_BASE_URL', 'wss://api.test');
    expect(validateUrlConfig()).toEqual({ isValid: true, errors: [] });
  });

  it('reports errors for malformed URLs', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'not a url');
    vi.stubEnv('VITE_WS_BASE_URL', 'also not a url');
    const result = validateUrlConfig();
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('Invalid API base URL');
    expect(result.errors[1]).toContain('Invalid WebSocket base URL');
  });
});
