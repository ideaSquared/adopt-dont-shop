/**
 * Tests for the env validator (ADS-408/409/410/411/451/452/465/512/513).
 *
 * The pure `validateEnv(env)` function is exercised directly with synthetic
 * env objects so we cover both the boot path and the CLI script (which
 * mirrors these rules).
 */
import { describe, it, expect } from 'vitest';
import { validateEnv } from './validate-env';

const VALID_HEX_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(32);
const SECRET_C = 'c'.repeat(32);
const SECRET_D = 'd'.repeat(32);
// ADS-542: UPLOAD_SIGNING_SECRET is required in production validation.
const SECRET_E = 'e'.repeat(32);

const baseProdEnv = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  PORT: '5000',
  DB_HOST: 'database',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'pw',
  PROD_DB_NAME: 'adopt_dont_shop_prod',
  JWT_SECRET: SECRET_A,
  JWT_REFRESH_SECRET: SECRET_B,
  SESSION_SECRET: SECRET_C,
  CSRF_SECRET: SECRET_D,
  UPLOAD_SIGNING_SECRET: SECRET_E,
  ENCRYPTION_KEY: VALID_HEX_KEY,
  CORS_ORIGIN: 'https://example.com',
  FRONTEND_URL: 'https://app.example.com',
  RESCUE_FRONTEND_URL: 'https://rescue.example.com',
  STATSIG_SERVER_SECRET_KEY: 'secret-statsig-key',
});

const expectError = (result: ReturnType<typeof validateEnv>, fragment: string) => {
  const messages = result.errors.map(e => `${e.path}: ${e.message}`).join('\n');
  expect(messages).toContain(fragment);
};

describe('validateEnv', () => {
  describe('secrets', () => {
    it('passes for a valid production env', () => {
      const result = validateEnv(baseProdEnv());
      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
    });

    it('rejects short JWT_SECRET', () => {
      const env = baseProdEnv();
      env.JWT_SECRET = 'short';
      const result = validateEnv(env);
      expectError(result, 'JWT_SECRET must be at least 32 characters');
    });

    it('rejects short JWT_REFRESH_SECRET (ADS-513)', () => {
      const env = baseProdEnv();
      env.JWT_REFRESH_SECRET = 'short';
      const result = validateEnv(env);
      expectError(result, 'JWT_REFRESH_SECRET must be at least 32 characters');
    });

    it('rejects placeholder JWT_SECRET', () => {
      const env = baseProdEnv();
      env.JWT_SECRET = 'CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_32_CHARS';
      const result = validateEnv(env);
      expectError(result, 'must not use the default placeholder value');
    });

    it('rejects identical JWT_SECRET and JWT_REFRESH_SECRET', () => {
      const env = baseProdEnv();
      env.JWT_REFRESH_SECRET = env.JWT_SECRET;
      const result = validateEnv(env);
      expectError(result, 'must be distinct');
    });

    it('rejects ENCRYPTION_KEY of wrong length', () => {
      const env = baseProdEnv();
      env.ENCRYPTION_KEY = 'too-short';
      const result = validateEnv(env);
      expectError(result, 'ENCRYPTION_KEY must be exactly 64 hex characters');
    });

    it('rejects ENCRYPTION_KEY with non-hex chars', () => {
      const env = baseProdEnv();
      env.ENCRYPTION_KEY = 'g'.repeat(64);
      const result = validateEnv(env);
      expectError(result, 'must be hex');
    });
  });

  describe('database name selection (ADS-409)', () => {
    it('requires DEV_DB_NAME in development', () => {
      const env = baseProdEnv();
      env.NODE_ENV = 'development';
      delete env.PROD_DB_NAME;
      const result = validateEnv(env);
      expectError(result, 'DEV_DB_NAME is required for development');
    });

    it('requires TEST_DB_NAME in test', () => {
      const env = baseProdEnv();
      env.NODE_ENV = 'test';
      delete env.PROD_DB_NAME;
      const result = validateEnv(env);
      expectError(result, 'TEST_DB_NAME is required for test');
    });

    it('requires PROD_DB_NAME in production', () => {
      const env = baseProdEnv();
      delete env.PROD_DB_NAME;
      const result = validateEnv(env);
      expectError(result, 'PROD_DB_NAME is required for production');
    });
  });

  describe('production-only requirements', () => {
    it('requires CORS_ORIGIN in production (ADS-410)', () => {
      const env = baseProdEnv();
      delete env.CORS_ORIGIN;
      const result = validateEnv(env);
      expectError(result, 'CORS_ORIGIN is required in production');
    });

    it('rejects wildcard CORS_ORIGIN in production', () => {
      const env = baseProdEnv();
      env.CORS_ORIGIN = '*';
      const result = validateEnv(env);
      expectError(result, "CORS_ORIGIN cannot contain wildcard ('*')");
    });

    it('requires FRONTEND_URL in production (ADS-410)', () => {
      const env = baseProdEnv();
      delete env.FRONTEND_URL;
      const result = validateEnv(env);
      expectError(result, 'FRONTEND_URL is required in production');
    });

    it('rejects non-URL FRONTEND_URL in production', () => {
      const env = baseProdEnv();
      env.FRONTEND_URL = 'not-a-url';
      const result = validateEnv(env);
      expectError(result, 'FRONTEND_URL must be a valid URL');
    });

    it('requires RESCUE_FRONTEND_URL in production (ADS-410)', () => {
      const env = baseProdEnv();
      delete env.RESCUE_FRONTEND_URL;
      const result = validateEnv(env);
      expectError(result, 'RESCUE_FRONTEND_URL is required in production');
    });

    it('requires STATSIG_SERVER_SECRET_KEY in production (ADS-411)', () => {
      const env = baseProdEnv();
      delete env.STATSIG_SERVER_SECRET_KEY;
      const result = validateEnv(env);
      expectError(result, 'STATSIG_SERVER_SECRET_KEY is required in production');
    });

    it('rejects DEBUG_ERRORS=true in production (ADS-512)', () => {
      const env = baseProdEnv();
      env.DEBUG_ERRORS = 'true';
      const result = validateEnv(env);
      expectError(result, 'DEBUG_ERRORS=true is not allowed in production');
    });

    it('warns about BCRYPT_ROUNDS < 12 in production', () => {
      const env = baseProdEnv();
      env.BCRYPT_ROUNDS = '8';
      const result = validateEnv(env);
      expect(result.errors).toEqual([]);
      expect(result.warnings.some(w => w.path === 'BCRYPT_ROUNDS')).toBe(true);
    });

    it('warns when DB_LOGGING is enabled in production', () => {
      const env = baseProdEnv();
      env.DB_LOGGING = 'true';
      const result = validateEnv(env);
      expect(result.errors).toEqual([]);
      expect(result.warnings.some(w => w.path === 'DB_LOGGING')).toBe(true);
    });
  });

  describe('boolean fields', () => {
    it('rejects non-boolean WORKER_ENABLED', () => {
      const env = baseProdEnv();
      env.WORKER_ENABLED = 'maybe';
      const result = validateEnv(env);
      expectError(result, "WORKER_ENABLED must be 'true' or 'false'");
    });
  });

  describe('non-production', () => {
    it('does not require FRONTEND_URL outside production', () => {
      const env = baseProdEnv();
      env.NODE_ENV = 'development';
      env.DEV_DB_NAME = 'dev_db';
      delete env.PROD_DB_NAME;
      delete env.FRONTEND_URL;
      delete env.RESCUE_FRONTEND_URL;
      delete env.STATSIG_SERVER_SECRET_KEY;
      delete env.CORS_ORIGIN;
      const result = validateEnv(env);
      // None of the production-only checks should appear as errors
      const messages = result.errors.map(e => e.message).join('\n');
      expect(messages).not.toContain('FRONTEND_URL');
      expect(messages).not.toContain('RESCUE_FRONTEND_URL');
      expect(messages).not.toContain('STATSIG_SERVER_SECRET_KEY');
      expect(messages).not.toContain('CORS_ORIGIN');
    });

    it('still rejects DEBUG_ERRORS=true only in production', () => {
      const env = baseProdEnv();
      env.NODE_ENV = 'development';
      env.DEV_DB_NAME = 'dev_db';
      env.DEBUG_ERRORS = 'true';
      const result = validateEnv(env);
      const messages = result.errors.map(e => e.message).join('\n');
      expect(messages).not.toContain('DEBUG_ERRORS=true is not allowed');
    });
  });
});
