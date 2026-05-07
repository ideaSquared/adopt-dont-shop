/**
 * ADS-215 — when credentials are enabled (`credentials: true`) the browser
 * already disallows wildcard `Access-Control-Allow-Origin: *`, but we want
 * to fail loudly at startup rather than silently break the browser. Tests
 * exercise the CORS_ORIGIN parsing IIFE in `config/index.ts` indirectly by
 * loading the module under different env values via `vi.resetModules`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logBusiness: vi.fn(), logExternalService: vi.fn() },
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  // Reset env between cases so module-load reads the value we set here.
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

const loadConfig = async () => (await import('../../config/index')).config;

describe('CORS_ORIGIN wildcard guard [ADS-215]', () => {
  it('accepts a single explicit origin', async () => {
    process.env.CORS_ORIGIN = 'https://app.example.com';
    const config = await loadConfig();
    expect(config.cors.origin).toBe('https://app.example.com');
    expect(config.cors.credentials).toBe(true);
  });

  it('accepts a comma-separated explicit allowlist', async () => {
    process.env.CORS_ORIGIN = 'https://app.example.com,https://admin.example.com';
    const config = await loadConfig();
    expect(config.cors.origin).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('rejects a bare wildcard', async () => {
    process.env.CORS_ORIGIN = '*';
    await expect(loadConfig()).rejects.toThrow(/wildcard/);
  });

  it('rejects "null" as an origin', async () => {
    process.env.CORS_ORIGIN = 'null';
    await expect(loadConfig()).rejects.toThrow(/wildcard|unsafe/);
  });

  it('rejects a wildcard mixed into the allowlist', async () => {
    process.env.CORS_ORIGIN = 'https://app.example.com,*';
    await expect(loadConfig()).rejects.toThrow(/wildcard/);
  });

  it('rejects a glob-style wildcard host', async () => {
    process.env.CORS_ORIGIN = 'https://*.example.com';
    await expect(loadConfig()).rejects.toThrow(/wildcard|unsafe/);
  });
});
