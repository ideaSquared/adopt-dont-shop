import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

// Signing secrets must be >= 32 bytes (enforced at boot).
const VALID_ACCESS_SECRET = 'access-signing-secret-at-least-32-bytes';
const VALID_REFRESH_SECRET = 'refresh-signing-secret-at-least-32-bytes';
// ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes) — AES-256-GCM key.
const VALID_ENCRYPTION_KEY = 'a'.repeat(64);

const REQUIRED = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  JWT_SECRET: VALID_ACCESS_SECRET,
  JWT_REFRESH_SECRET: VALID_REFRESH_SECRET,
  ENCRYPTION_KEY: VALID_ENCRYPTION_KEY,
};

describe('loadConfig', () => {
  it('uses the documented defaults when only the required env vars are set', () => {
    const config = loadConfig({ ...REQUIRED });
    expect(config.port).toBe(5002);
    expect(config.grpcPort).toBe(6002);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.databaseUrl).toBe(REQUIRED.DATABASE_URL);
    expect(config.schema).toBe('auth');
    expect(config.natsUrl).toBe('nats://nats:4222');
    expect(config.jwtSecret).toBe(REQUIRED.JWT_SECRET);
    expect(config.jwtRefreshSecret).toBe(REQUIRED.JWT_REFRESH_SECRET);
    expect(config.encryptionKey).toBe(REQUIRED.ENCRYPTION_KEY);
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      AUTH_PORT: '5500',
      AUTH_GRPC_PORT: '6500',
      AUTH_HOST: '127.0.0.1',
      AUTH_SCHEMA: 'auth_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://prod:secret@db.example.com:5432/auth',
      NATS_URL: 'nats://nats.internal:4222',
      JWT_SECRET: VALID_ACCESS_SECRET,
      JWT_REFRESH_SECRET: VALID_REFRESH_SECRET,
      ENCRYPTION_KEY: VALID_ENCRYPTION_KEY,
    });

    expect(config.port).toBe(5500);
    expect(config.grpcPort).toBe(6500);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
    expect(config.schema).toBe('auth_test');
    expect(config.databaseUrl).toBe('postgres://prod:secret@db.example.com:5432/auth');
    expect(config.natsUrl).toBe('nats://nats.internal:4222');
    expect(config.jwtSecret).toBe(VALID_ACCESS_SECRET);
    expect(config.jwtRefreshSecret).toBe(VALID_REFRESH_SECRET);
    expect(config.encryptionKey).toBe(VALID_ENCRYPTION_KEY);
  });

  it('rejects a non-numeric AUTH_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, AUTH_PORT: 'five-thousand' })).toThrow(
      /AUTH_PORT must be a positive integer/
    );
  });

  it('rejects a non-numeric AUTH_GRPC_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, AUTH_GRPC_PORT: 'six-thousand' })).toThrow(
      /AUTH_GRPC_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive AUTH_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, AUTH_PORT: '0' })).toThrow(
      /AUTH_PORT must be a positive integer/
    );
    expect(() => loadConfig({ ...REQUIRED, AUTH_PORT: '-1' })).toThrow(
      /AUTH_PORT must be a positive integer/
    );
  });

  it('rejects an unset DATABASE_URL', () => {
    expect(() => loadConfig({ JWT_SECRET: 'x', JWT_REFRESH_SECRET: 'y' })).toThrow(
      /DATABASE_URL is required/
    );
  });

  it('rejects an unset JWT_SECRET — auth refuses to boot without an access-signing secret', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: REQUIRED.DATABASE_URL, JWT_REFRESH_SECRET: 'y' })
    ).toThrow(/JWT_SECRET is required/);
  });

  it('rejects an unset JWT_REFRESH_SECRET — refresh secret is distinct from access by design', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: REQUIRED.DATABASE_URL, JWT_SECRET: VALID_ACCESS_SECRET })
    ).toThrow(/JWT_REFRESH_SECRET is required/);
  });

  it('rejects a too-short JWT_SECRET — a weak HMAC secret is brute-forceable', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: REQUIRED.DATABASE_URL,
        JWT_SECRET: 'too-short',
        JWT_REFRESH_SECRET: VALID_REFRESH_SECRET,
      })
    ).toThrow(/JWT_SECRET must be at least 32 bytes/);
  });

  it('rejects an unset ENCRYPTION_KEY — auth refuses to boot without a TOTP-secret encryption key', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: REQUIRED.DATABASE_URL,
        JWT_SECRET: VALID_ACCESS_SECRET,
        JWT_REFRESH_SECRET: VALID_REFRESH_SECRET,
      })
    ).toThrow(/ENCRYPTION_KEY is required/);
  });

  it('rejects an ENCRYPTION_KEY that is not 64 hex chars', () => {
    expect(() =>
      loadConfig({
        ...REQUIRED,
        ENCRYPTION_KEY: 'not-hex',
      })
    ).toThrow(/ENCRYPTION_KEY does not match the required format/);
  });

  it('trims surrounding whitespace from string env values', () => {
    const config = loadConfig({
      ...REQUIRED,
      AUTH_HOST: '  localhost  ',
      AUTH_SCHEMA: '  custom_schema  ',
    });
    expect(config.host).toBe('localhost');
    expect(config.schema).toBe('custom_schema');
  });
});
