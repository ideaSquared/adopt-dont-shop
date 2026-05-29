/**
 * Boot-path env validation (config/env.ts). The module validates on import,
 * so each case sets process.env then loads the module fresh via
 * vi.resetModules — mirroring the CORS wildcard guard test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STRONG_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(32);
const SECRET_C = 'c'.repeat(32);
const SECRET_D = 'd'.repeat(32);
const SECRET_E = 'e'.repeat(32);

const originalEnv = { ...process.env };

const baseSecrets = (): NodeJS.ProcessEnv => ({
  JWT_SECRET: SECRET_A,
  JWT_REFRESH_SECRET: SECRET_B,
  SESSION_SECRET: SECRET_C,
  CSRF_SECRET: SECRET_D,
  UPLOAD_SIGNING_SECRET: SECRET_E,
  ENCRYPTION_KEY: STRONG_KEY,
});

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv, ...baseSecrets() };
});

afterEach(() => {
  process.env = originalEnv;
});

const loadEnv = async () => (await import('../../config/env')).env;

describe('config/env ENCRYPTION_KEY weak-key guard', () => {
  it('accepts a strong random hex key', async () => {
    const env = await loadEnv();
    expect(env.ENCRYPTION_KEY).toBe(STRONG_KEY);
  });

  it('rejects an all-zeros key', async () => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    await expect(loadEnv()).rejects.toThrow(/trivially weak/);
  });

  it('rejects an all-f key', async () => {
    process.env.ENCRYPTION_KEY = 'f'.repeat(64);
    await expect(loadEnv()).rejects.toThrow(/trivially weak/);
  });
});

describe('config/env UPLOAD_SIGNING_SECRET production gate', () => {
  it('requires UPLOAD_SIGNING_SECRET when NODE_ENV is a prod alias', async () => {
    process.env.NODE_ENV = 'prod';
    delete process.env.UPLOAD_SIGNING_SECRET;
    await expect(loadEnv()).rejects.toThrow(/UPLOAD_SIGNING_SECRET/);
  });

  it('falls back to the dev placeholder outside production-like envs', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.UPLOAD_SIGNING_SECRET;
    const env = await loadEnv();
    expect(env.UPLOAD_SIGNING_SECRET).toContain('dev-upload-signing-secret');
  });
});
