import { describe, expect, it } from 'vitest';
import { DISTINCT_SECRET_PAIRS, envBaseSchema, envCorsOriginField, envUrlField } from './env';

// ADS-707: regression coverage for the shared env schema. These tests pin
// the public contract that the backend boot validator + CLI gate both
// depend on. Per-environment refinement logic (production-only checks,
// DEBUG_ERRORS gates, db-name choice) is still owned by the backend
// validator, not this schema, so it is exercised there.

const STRONG_SECRET = 'A'.repeat(40);
const STRONG_SECRET_B = 'B'.repeat(40);
const STRONG_SECRET_C = 'C'.repeat(40);
const STRONG_SECRET_D = 'D'.repeat(40);
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
  CSRF_SECRET: STRONG_SECRET_D,
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
    expect(DISTINCT_SECRET_PAIRS.length).toBe(12);
  });

  it('always involves at least one signing/encryption secret per pair', () => {
    const signingNames = new Set([
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
      'CSRF_SECRET',
      'UPLOAD_SIGNING_SECRET',
      'ENCRYPTION_KEY',
      'JWT_REPORT_SHARE_SECRET',
    ]);
    for (const [a, b] of DISTINCT_SECRET_PAIRS) {
      expect(signingNames.has(a) || signingNames.has(b)).toBe(true);
    }
  });
});
