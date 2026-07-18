import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('uses the documented defaults when no env vars are set', () => {
    const config = loadConfig({});
    expect(config.port).toBe(4000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.natsUrl).toBe('nats://nats:4222');
  });

  it('honours GATEWAY_PORT / GATEWAY_HOST / NODE_ENV / NATS_URL when set', () => {
    const config = loadConfig({
      GATEWAY_PORT: '4321',
      GATEWAY_HOST: '127.0.0.1',
      NODE_ENV: 'production',
      NATS_URL: 'nats://nats.internal:4222',
      // ADS-967: production fails closed without CORS_ORIGIN — irrelevant to
      // what this test asserts, so set it to isolate the behaviour under test.
      CORS_ORIGIN: 'https://app.example.com',
    });

    expect(config.port).toBe(4321);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
    expect(config.natsUrl).toBe('nats://nats.internal:4222');
  });

  it('rejects a non-numeric GATEWAY_PORT', () => {
    expect(() => loadConfig({ GATEWAY_PORT: 'four-thousand' })).toThrow(
      /GATEWAY_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive GATEWAY_PORT', () => {
    expect(() => loadConfig({ GATEWAY_PORT: '0' })).toThrow(
      /GATEWAY_PORT must be a positive integer/
    );
    expect(() => loadConfig({ GATEWAY_PORT: '-1' })).toThrow(
      /GATEWAY_PORT must be a positive integer/
    );
  });

  it('trims surrounding whitespace from string env values', () => {
    const config = loadConfig({
      GATEWAY_HOST: '  localhost  ',
    });
    expect(config.host).toBe('localhost');
  });

  it('rate-limit defaults: 100 req/min, no redisUrl when REDIS_URL unset', () => {
    const config = loadConfig({});
    expect(config.rateLimit.max).toBe(100);
    expect(config.rateLimit.timeWindow).toBe('1 minute');
    expect(config.rateLimit.redisUrl).toBeUndefined();
  });

  it('honours GATEWAY_RATE_LIMIT_MAX and GATEWAY_RATE_LIMIT_WINDOW', () => {
    const config = loadConfig({
      GATEWAY_RATE_LIMIT_MAX: '200',
      GATEWAY_RATE_LIMIT_WINDOW: '30 seconds',
    });
    expect(config.rateLimit.max).toBe(200);
    expect(config.rateLimit.timeWindow).toBe('30 seconds');
  });

  it('reads REDIS_URL for the rate-limit store', () => {
    const config = loadConfig({ REDIS_URL: 'redis://localhost:6379' });
    expect(config.rateLimit.redisUrl).toBe('redis://localhost:6379');
  });

  it('falls back to max=100 for an invalid GATEWAY_RATE_LIMIT_MAX', () => {
    const config = loadConfig({ GATEWAY_RATE_LIMIT_MAX: 'not-a-number' });
    expect(config.rateLimit.max).toBe(100);
  });
});

describe('loadConfig — storage max file size (ADS-850)', () => {
  it('defaults to 10485760 bytes when MAX_FILE_SIZE is unset', () => {
    const config = loadConfig({});
    expect(config.storage.maxFileSize).toBe(10485760);
  });

  it('honours a valid numeric MAX_FILE_SIZE', () => {
    const config = loadConfig({ MAX_FILE_SIZE: '20971520' });
    expect(config.storage.maxFileSize).toBe(20971520);
  });

  it('falls back to the default for a non-numeric MAX_FILE_SIZE', () => {
    const config = loadConfig({ MAX_FILE_SIZE: 'not-a-number' });
    expect(config.storage.maxFileSize).toBe(10485760);
  });

  it('falls back to the default for a non-positive MAX_FILE_SIZE', () => {
    expect(loadConfig({ MAX_FILE_SIZE: '0' }).storage.maxFileSize).toBe(10485760);
    expect(loadConfig({ MAX_FILE_SIZE: '-1' }).storage.maxFileSize).toBe(10485760);
  });
});

describe('loadConfig — principal signing key (ADS-800)', () => {
  const VALID_KEY = 'a-principal-signing-key-of-at-least-32-bytes';

  it('is undefined when PRINCIPAL_SIGNING_KEY is unset', () => {
    const config = loadConfig({});
    expect(config.principalSigningKey).toBeUndefined();
  });

  it('reads PRINCIPAL_SIGNING_KEY from the environment', () => {
    const config = loadConfig({ PRINCIPAL_SIGNING_KEY: VALID_KEY });
    expect(config.principalSigningKey).toBe(VALID_KEY);
  });

  it('treats a blank PRINCIPAL_SIGNING_KEY as unset', () => {
    const config = loadConfig({ PRINCIPAL_SIGNING_KEY: '   ' });
    expect(config.principalSigningKey).toBeUndefined();
  });

  // ADS-845 — a present-but-weak signing key is offline-brute-forceable, so a
  // value below the 32-byte floor must fail boot rather than ship a forgeable
  // principal signer.
  it('rejects a present-but-too-short PRINCIPAL_SIGNING_KEY (ADS-845)', () => {
    expect(() => loadConfig({ PRINCIPAL_SIGNING_KEY: 'too-short' })).toThrow(
      /PRINCIPAL_SIGNING_KEY must be at least 32 bytes/
    );
  });
});

describe('loadConfig — upload signing secret (ADS-845)', () => {
  const VALID_SECRET = 'an-upload-signing-secret-of-at-least-32-bytes';

  it('is undefined when UPLOAD_SIGNING_SECRET is unset', () => {
    const config = loadConfig({});
    expect(config.storage.signingSecret).toBeUndefined();
  });

  it('reads UPLOAD_SIGNING_SECRET from the environment when long enough', () => {
    const config = loadConfig({ UPLOAD_SIGNING_SECRET: VALID_SECRET });
    expect(config.storage.signingSecret).toBe(VALID_SECRET);
  });

  it('rejects a present-but-too-short UPLOAD_SIGNING_SECRET', () => {
    expect(() => loadConfig({ UPLOAD_SIGNING_SECRET: 'short' })).toThrow(
      /UPLOAD_SIGNING_SECRET must be at least 32 bytes/
    );
  });
});

describe('loadConfig — test-token-peek seam (ADS-871)', () => {
  it('is disabled by default', () => {
    const config = loadConfig({});
    expect(config.testTokenPeek.enabled).toBe(false);
  });

  it('enables only for the exact string "true" (case-insensitive)', () => {
    expect(loadConfig({ E2E_TOKEN_PEEK: 'true' }).testTokenPeek.enabled).toBe(true);
    expect(loadConfig({ E2E_TOKEN_PEEK: 'TRUE' }).testTokenPeek.enabled).toBe(true);
    expect(loadConfig({ E2E_TOKEN_PEEK: '1' }).testTokenPeek.enabled).toBe(false);
    expect(loadConfig({ E2E_TOKEN_PEEK: 'yes' }).testTokenPeek.enabled).toBe(false);
    expect(loadConfig({ E2E_TOKEN_PEEK: '' }).testTokenPeek.enabled).toBe(false);
  });

  it('exposes DATABASE_URL when set, undefined otherwise', () => {
    expect(loadConfig({}).testTokenPeek.databaseUrl).toBeUndefined();
    const url = 'postgresql://u:p@database:5432/db';
    expect(loadConfig({ DATABASE_URL: url }).testTokenPeek.databaseUrl).toBe(url);
  });

  // The seam exposes one-time secrets, so it must be IMPOSSIBLE to turn on in
  // production: boot fails outright rather than coming up with it enabled.
  it('refuses to enable under NODE_ENV=production (boot fails)', () => {
    expect(() => loadConfig({ E2E_TOKEN_PEEK: 'true', NODE_ENV: 'production' })).toThrow(
      /E2E_TOKEN_PEEK must never be enabled in production/
    );
  });

  it('allows enabling under non-production environments', () => {
    expect(
      loadConfig({ E2E_TOKEN_PEEK: 'true', NODE_ENV: 'development' }).testTokenPeek.enabled
    ).toBe(true);
    expect(loadConfig({ E2E_TOKEN_PEEK: 'true', NODE_ENV: 'test' }).testTokenPeek.enabled).toBe(
      true
    );
  });

  it('does not throw in production when the flag is off', () => {
    // ADS-967: production also requires CORS_ORIGIN — set it here so this
    // test isolates the test-token-peek behaviour it actually asserts.
    expect(() =>
      loadConfig({ NODE_ENV: 'production', CORS_ORIGIN: 'https://app.example.com' })
    ).not.toThrow();
  });
});

describe('loadConfig — CORS origins (ADS-809)', () => {
  it('parses a single origin from CORS_ORIGIN', () => {
    const config = loadConfig({ CORS_ORIGIN: 'https://app.example.com' });
    expect(config.cors.origins).toEqual(['https://app.example.com']);
  });

  it('parses multiple comma-separated origins from CORS_ORIGIN', () => {
    const config = loadConfig({
      CORS_ORIGIN: 'https://app.example.com,https://admin.example.com,https://rescue.example.com',
    });
    expect(config.cors.origins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
      'https://rescue.example.com',
    ]);
  });

  it('trims whitespace around each origin', () => {
    const config = loadConfig({ CORS_ORIGIN: ' https://a.example.com , https://b.example.com ' });
    expect(config.cors.origins).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('falls back to localhost dev origins when CORS_ORIGIN is unset', () => {
    const config = loadConfig({});
    expect(config.cors.origins).toContain('http://localhost:3000');
    expect(config.cors.origins.length).toBeGreaterThan(0);
  });

  it('falls back to defaults when CORS_ORIGIN is an empty string', () => {
    const config = loadConfig({ CORS_ORIGIN: '' });
    expect(config.cors.origins).toContain('http://localhost:3000');
  });
});

describe('loadConfig — CORS fail-closed in production/staging (ADS-967)', () => {
  it('refuses to boot under NODE_ENV=production when CORS_ORIGIN is unset', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN must be set/);
  });

  it('refuses to boot under NODE_ENV=production when CORS_ORIGIN is an empty string', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', CORS_ORIGIN: '' })).toThrow(
      /CORS_ORIGIN must be set/
    );
  });

  it('refuses to boot under NODE_ENV=staging when CORS_ORIGIN is unset', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/CORS_ORIGIN must be set/);
  });

  it('boots fine under NODE_ENV=production when CORS_ORIGIN is set', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://adoptdontshop.com',
    });
    expect(config.cors.origins).toEqual(['https://adoptdontshop.com']);
  });

  it('still falls back to localhost dev origins outside production/staging', () => {
    expect(() => loadConfig({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => loadConfig({ NODE_ENV: 'test' })).not.toThrow();
    expect(() => loadConfig({})).not.toThrow();
  });
});
