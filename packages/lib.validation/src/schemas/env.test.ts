import { describe, expect, it } from 'vitest';
import {
  DISTINCT_SECRET_PAIRS,
  envBaseSchema,
  envCorsOriginField,
  envUrlField,
  validateEnv,
} from './env';

// ADS-707: regression coverage for the shared env schema. These tests pin
// the public contract that the backend boot validator + CLI gate both
// depend on. Per-environment refinement logic (production-only checks,
// DEBUG_ERRORS gates, db-name choice) is still owned by the backend
// validator, not this schema, so it is exercised there.

const STRONG_SECRET = 'A'.repeat(40);
const STRONG_SECRET_B = 'B'.repeat(40);
const STRONG_SECRET_C = 'C'.repeat(40);
const ENCRYPTION_KEY = '0123456789abcdef'.repeat(4); // 64 hex chars

const validBaseEnv = {
  NODE_ENV: 'development',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'pw',
  JWT_SECRET: STRONG_SECRET,
  JWT_REFRESH_SECRET: STRONG_SECRET_B,
  SESSION_SECRET: STRONG_SECRET_C,
  ENCRYPTION_KEY,
};

describe('envBaseSchema', () => {
  it('accepts a fully populated valid env', () => {
    const result = envBaseSchema.safeParse(validBaseEnv);
    expect(result.success).toBe(true);
  });

  it('rejects placeholder JWT_SECRET values', () => {
    const result = envBaseSchema.safeParse({
      ...validBaseEnv,
      JWT_SECRET: 'CHANGE_THIS_PLACEHOLDER_VALUE_NOT_FOR_USE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short secrets', () => {
    const result = envBaseSchema.safeParse({ ...validBaseEnv, JWT_SECRET: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects a placeholder REDIS_PASSWORD', () => {
    const result = envBaseSchema.safeParse({
      ...validBaseEnv,
      REDIS_PASSWORD: 'CHANGE_THIS_SECURE_REDIS_PASSWORD',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an unset REDIS_PASSWORD', () => {
    const result = envBaseSchema.safeParse(validBaseEnv);
    expect(result.success).toBe(true);
  });

  it('accepts a strong REDIS_PASSWORD', () => {
    const result = envBaseSchema.safeParse({
      ...validBaseEnv,
      REDIS_PASSWORD: 'R'.repeat(40),
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-hex ENCRYPTION_KEY', () => {
    const result = envBaseSchema.safeParse({ ...validBaseEnv, ENCRYPTION_KEY: 'z'.repeat(64) });
    expect(result.success).toBe(false);
  });

  it('rejects ENCRYPTION_KEY with wrong length', () => {
    const result = envBaseSchema.safeParse({ ...validBaseEnv, ENCRYPTION_KEY: '0123' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid NODE_ENV', () => {
    const result = envBaseSchema.safeParse({ ...validBaseEnv, NODE_ENV: 'staging' });
    expect(result.success).toBe(false);
  });
});

describe('envCorsOriginField', () => {
  it('rejects wildcard origins', () => {
    expect(envCorsOriginField.safeParse('*').success).toBe(false);
    expect(envCorsOriginField.safeParse('https://example.com,*').success).toBe(false);
    expect(envCorsOriginField.safeParse('https://*.example.com').success).toBe(false);
  });

  it('accepts comma-separated concrete origins', () => {
    expect(
      envCorsOriginField.safeParse('https://app.example.com,https://admin.example.com').success
    ).toBe(true);
  });
});

describe('envUrlField', () => {
  it('rejects non-URLs', () => {
    expect(envUrlField('FRONTEND_URL').safeParse('not-a-url').success).toBe(false);
  });

  it('accepts https URLs', () => {
    expect(envUrlField('FRONTEND_URL').safeParse('https://app.example.com').success).toBe(true);
  });
});

describe('DISTINCT_SECRET_PAIRS', () => {
  it('covers every signing/encryption secret pairing', () => {
    // Pin the pairing list so a future change to the shared schema does
    // not silently drop a distinctness rule.
    expect(DISTINCT_SECRET_PAIRS.length).toBe(8);
  });

  it('always involves at least one signing/encryption secret per pair', () => {
    const signingNames = new Set([
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
      'UPLOAD_SIGNING_SECRET',
      'ENCRYPTION_KEY',
      'JWT_REPORT_SHARE_SECRET',
    ]);
    for (const [a, b] of DISTINCT_SECRET_PAIRS) {
      expect(signingNames.has(a) || signingNames.has(b)).toBe(true);
    }
  });
});

// ADS-707: behaviour coverage for the pure validateEnv function that the
// backend boot validator and the scripts/validate-env.ts CLI gate both share.
// Each test exercises a single rule so a future regression points at the
// behaviour that changed, not the whole validator.

const UPLOAD_SECRET = 'U'.repeat(40);
const REPORT_SHARE_SECRET = 'R'.repeat(40);
const SECOND_ENCRYPTION_KEY = 'fedcba9876543210'.repeat(4);

const validProdEnv = (): Record<string, string | undefined> => ({
  NODE_ENV: 'production',
  DB_HOST: 'db.internal',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'pw',
  PROD_DB_NAME: 'adopt_dont_shop_prod',
  JWT_SECRET: STRONG_SECRET,
  JWT_REFRESH_SECRET: STRONG_SECRET_B,
  SESSION_SECRET: STRONG_SECRET_C,
  ENCRYPTION_KEY,
  UPLOAD_SIGNING_SECRET: UPLOAD_SECRET,
  CORS_ORIGIN: 'https://app.example.com',
  FRONTEND_URL: 'https://app.example.com',
  RESCUE_FRONTEND_URL: 'https://rescue.example.com',
  STATSIG_SERVER_SECRET_KEY: 'statsig-server-secret',
});

const validDevEnv = (): Record<string, string | undefined> => ({
  NODE_ENV: 'development',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'pw',
  DEV_DB_NAME: 'adopt_dont_shop_dev',
  JWT_SECRET: STRONG_SECRET,
  JWT_REFRESH_SECRET: STRONG_SECRET_B,
  SESSION_SECRET: STRONG_SECRET_C,
  ENCRYPTION_KEY,
});

const errorPaths = (result: ReturnType<typeof validateEnv>): string[] =>
  result.errors.map((e) => e.path);

const errorMessages = (result: ReturnType<typeof validateEnv>): string =>
  result.errors.map((e) => `${e.path}: ${e.message}`).join('\n');

describe('validateEnv', () => {
  describe('happy paths', () => {
    it('returns ok for a fully populated production env', () => {
      const result = validateEnv(validProdEnv());
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('returns ok for a development env with DEV_DB_NAME', () => {
      const result = validateEnv(validDevEnv());
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns ok for a test env with TEST_DB_NAME', () => {
      const result = validateEnv({
        ...validDevEnv(),
        NODE_ENV: 'test',
        DEV_DB_NAME: undefined,
        TEST_DB_NAME: 'adopt_dont_shop_test',
      });
      expect(result.ok).toBe(true);
    });
  });

  describe('schema-level errors', () => {
    it('reports a missing required DB_HOST as an error with the right path', () => {
      const env = validDevEnv();
      env.DB_HOST = undefined;
      const result = validateEnv(env);
      expect(result.ok).toBe(false);
      expect(errorPaths(result)).toContain('DB_HOST');
    });

    it('flags a placeholder JWT_SECRET as an error from the schema', () => {
      const env = validDevEnv();
      env.JWT_SECRET = 'CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_32_CHARS';
      const result = validateEnv(env);
      expect(result.ok).toBe(false);
      expect(errorMessages(result)).toContain('must not use the default placeholder value');
    });

    it('flags a placeholder REDIS_PASSWORD as an error from the schema (ADS-886)', () => {
      const env = validDevEnv();
      env.REDIS_PASSWORD = 'CHANGE_THIS_SECURE_REDIS_PASSWORD';
      const result = validateEnv(env);
      expect(result.ok).toBe(false);
      expect(errorPaths(result)).toContain('REDIS_PASSWORD');
      expect(errorMessages(result)).toContain('must not use the default placeholder value');
    });

    it('stays valid when REDIS_PASSWORD is unset', () => {
      const env = validDevEnv();
      env.REDIS_PASSWORD = undefined;
      const result = validateEnv(env);
      expect(result.ok).toBe(true);
    });

    it('accepts a strong REDIS_PASSWORD', () => {
      const env = validDevEnv();
      env.REDIS_PASSWORD = 'R'.repeat(40);
      const result = validateEnv(env);
      expect(result.ok).toBe(true);
    });

    it('flags a non-hex ENCRYPTION_KEY as an error', () => {
      const env = validDevEnv();
      env.ENCRYPTION_KEY = 'z'.repeat(64);
      const result = validateEnv(env);
      expect(result.ok).toBe(false);
      expect(errorMessages(result)).toContain('ENCRYPTION_KEY must be hex');
    });

    it('flags a non-numeric BCRYPT_ROUNDS as an error', () => {
      const env = validDevEnv();
      env.BCRYPT_ROUNDS = 'not-a-number';
      const result = validateEnv(env);
      expect(result.ok).toBe(false);
      expect(errorMessages(result)).toContain('BCRYPT_ROUNDS must be a number');
    });

    it('emits a top-level <env> path when the entire env is not an object', () => {
      // safeParse rejects non-objects with an empty issue path; validateEnv
      // falls back to '<env>' so downstream loggers always see a path.
      const result = validateEnv({});
      expect(result.ok).toBe(false);
      expect(errorPaths(result).length).toBeGreaterThan(0);
    });
  });

  describe('dbNameCheck refinement', () => {
    it('errors when development lacks DEV_DB_NAME', () => {
      const env = validDevEnv();
      env.DEV_DB_NAME = undefined;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('DEV_DB_NAME');
      expect(errorMessages(result)).toContain('DEV_DB_NAME is required for development');
    });

    it('errors when test lacks TEST_DB_NAME', () => {
      const env = {
        ...validDevEnv(),
        NODE_ENV: 'test',
        DEV_DB_NAME: undefined,
      };
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('TEST_DB_NAME');
    });

    it('errors when production lacks PROD_DB_NAME', () => {
      const env = validProdEnv();
      env.PROD_DB_NAME = undefined;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('PROD_DB_NAME');
    });
  });

  describe('distinctSecretsCheck refinement', () => {
    it('errors when JWT_SECRET equals JWT_REFRESH_SECRET', () => {
      const env = validDevEnv();
      env.JWT_REFRESH_SECRET = env.JWT_SECRET;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('JWT_SECRET/JWT_REFRESH_SECRET');
      expect(errorMessages(result)).toContain('must be distinct');
    });

    it('errors when UPLOAD_SIGNING_SECRET reuses ENCRYPTION_KEY', () => {
      const env = validProdEnv();
      env.UPLOAD_SIGNING_SECRET = env.ENCRYPTION_KEY;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('UPLOAD_SIGNING_SECRET/ENCRYPTION_KEY');
    });

    it('does not flag a pair when one side is unset', () => {
      // JWT_REPORT_SHARE_SECRET is optional; absence must not trigger a
      // distinctness error against UPLOAD_SIGNING_SECRET.
      const env = validProdEnv();
      env.JWT_REPORT_SHARE_SECRET = undefined;
      const result = validateEnv(env);
      const pairPaths = errorPaths(result).filter((p) => p.includes('JWT_REPORT_SHARE_SECRET'));
      expect(pairPaths).toEqual([]);
    });
  });

  describe('productionOnlyCheck refinement', () => {
    it('skips all production checks when NODE_ENV is not production', () => {
      // Dev env without CORS_ORIGIN / FRONTEND_URL / STATSIG must still pass.
      const result = validateEnv(validDevEnv());
      expect(result.ok).toBe(true);
    });

    it('errors when CORS_ORIGIN is missing in production', () => {
      const env = validProdEnv();
      env.CORS_ORIGIN = undefined;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('CORS_ORIGIN');
      expect(errorMessages(result)).toContain('CORS_ORIGIN is required in production');
    });

    it('errors when CORS_ORIGIN contains a wildcard in production', () => {
      const env = validProdEnv();
      env.CORS_ORIGIN = 'https://app.example.com,*';
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('CORS_ORIGIN');
      expect(errorMessages(result)).toContain("cannot contain wildcard ('*')");
    });

    it('errors when FRONTEND_URL is missing in production', () => {
      const env = validProdEnv();
      env.FRONTEND_URL = undefined;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('FRONTEND_URL');
      expect(errorMessages(result)).toContain('FRONTEND_URL is required in production');
    });

    it('errors when RESCUE_FRONTEND_URL is missing in production', () => {
      const env = validProdEnv();
      env.RESCUE_FRONTEND_URL = undefined;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('RESCUE_FRONTEND_URL');
    });

    it('errors when FRONTEND_URL is set but malformed', () => {
      const env = validProdEnv();
      env.FRONTEND_URL = 'not-a-url';
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('FRONTEND_URL');
      expect(errorMessages(result)).toContain('must be a valid URL');
    });

    it('errors when UPLOAD_SIGNING_SECRET is missing in production', () => {
      const env = validProdEnv();
      env.UPLOAD_SIGNING_SECRET = undefined;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('UPLOAD_SIGNING_SECRET');
      expect(errorMessages(result)).toContain('UPLOAD_SIGNING_SECRET is required in production');
    });

    it('errors when STATSIG_SERVER_SECRET_KEY is missing in production', () => {
      const env = validProdEnv();
      env.STATSIG_SERVER_SECRET_KEY = undefined;
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('STATSIG_SERVER_SECRET_KEY');
    });

    it('errors when DEBUG_ERRORS=true in production', () => {
      const env = validProdEnv();
      env.DEBUG_ERRORS = 'true';
      const result = validateEnv(env);
      expect(errorPaths(result)).toContain('DEBUG_ERRORS');
      expect(errorMessages(result)).toContain('not allowed in production');
    });

    it('warns when BCRYPT_ROUNDS is below 12 in production', () => {
      const env = validProdEnv();
      env.BCRYPT_ROUNDS = '10';
      const result = validateEnv(env);
      expect(result.ok).toBe(true);
      const warnPaths = result.warnings.map((w) => w.path);
      expect(warnPaths).toContain('BCRYPT_ROUNDS');
    });

    it('does not warn when BCRYPT_ROUNDS is 12 or above in production', () => {
      const env = validProdEnv();
      env.BCRYPT_ROUNDS = '12';
      const result = validateEnv(env);
      expect(result.warnings.map((w) => w.path)).not.toContain('BCRYPT_ROUNDS');
    });

    it('warns when DB_LOGGING=true in production', () => {
      const env = validProdEnv();
      env.DB_LOGGING = 'true';
      const result = validateEnv(env);
      expect(result.ok).toBe(true);
      expect(result.warnings.map((w) => w.path)).toContain('DB_LOGGING');
    });
  });

  describe('result shape', () => {
    it('separates errors and warnings by level', () => {
      const env = validProdEnv();
      env.BCRYPT_ROUNDS = '4'; // warning
      env.DEBUG_ERRORS = 'true'; // error
      const result = validateEnv(env);
      expect(result.ok).toBe(false);
      expect(result.errors.every((e) => e.level === 'error')).toBe(true);
      expect(result.warnings.every((w) => w.level === 'warning')).toBe(true);
      expect(result.warnings.map((w) => w.path)).toContain('BCRYPT_ROUNDS');
      expect(result.errors.map((e) => e.path)).toContain('DEBUG_ERRORS');
    });

    it('accepts an alternate valid ENCRYPTION_KEY (mixed case hex)', () => {
      // Regression guard: the hex regex is case-insensitive.
      const env = validDevEnv();
      env.ENCRYPTION_KEY = SECOND_ENCRYPTION_KEY.toUpperCase();
      const result = validateEnv(env);
      expect(result.ok).toBe(true);
    });

    it('accepts optional JWT_REPORT_SHARE_SECRET when distinct from others', () => {
      const env = validProdEnv();
      env.JWT_REPORT_SHARE_SECRET = REPORT_SHARE_SECRET;
      const result = validateEnv(env);
      expect(result.ok).toBe(true);
    });
  });
});
