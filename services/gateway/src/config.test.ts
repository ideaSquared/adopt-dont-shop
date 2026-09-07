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

  // ADS-1259: a placeholder value long enough to clear the 32-byte floor must
  // still fail boot in production — length alone is not a real secret check.
  it('rejects a CHANGE_THIS-placeholder PRINCIPAL_SIGNING_KEY in production, even though it clears the byte floor', () => {
    const placeholder = 'CHANGE_THIS_principal_signing_key_placeholder_value';
    expect(placeholder.length).toBeGreaterThanOrEqual(32);
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://app.example.com',
        PRINCIPAL_SIGNING_KEY: placeholder,
      })
    ).toThrow(/PRINCIPAL_SIGNING_KEY is set to a placeholder value/);
  });

  it('allows a CHANGE_THIS-placeholder PRINCIPAL_SIGNING_KEY outside production', () => {
    const placeholder = 'CHANGE_THIS_principal_signing_key_placeholder_value';
    const config = loadConfig({ NODE_ENV: 'development', PRINCIPAL_SIGNING_KEY: placeholder });
    expect(config.principalSigningKey).toBe(placeholder);
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

  // ADS-1259: same placeholder gap as PRINCIPAL_SIGNING_KEY above — a
  // publicly-known .env.example placeholder must not boot production.
  it('rejects a CHANGE_THIS-placeholder UPLOAD_SIGNING_SECRET in production, even though it clears the byte floor', () => {
    const placeholder = 'CHANGE_THIS_upload_signing_secret_placeholder_value';
    expect(placeholder.length).toBeGreaterThanOrEqual(32);
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://app.example.com',
        UPLOAD_SIGNING_SECRET: placeholder,
      })
    ).toThrow(/UPLOAD_SIGNING_SECRET is set to a placeholder value/);
  });

  it('allows a CHANGE_THIS-placeholder UPLOAD_SIGNING_SECRET outside production', () => {
    const placeholder = 'CHANGE_THIS_upload_signing_secret_placeholder_value';
    const config = loadConfig({ NODE_ENV: 'development', UPLOAD_SIGNING_SECRET: placeholder });
    expect(config.storage.signingSecret).toBe(placeholder);
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

  // ADS-1271: staging is a deployed environment too (see buildTrustProxy /
  // buildCorsConfig, which already treat it as such) — the guard must not
  // let this misconfiguration slip through there just because it isn't
  // literally "production".
  it('refuses to enable under NODE_ENV=staging (boot fails)', () => {
    expect(() => loadConfig({ E2E_TOKEN_PEEK: 'true', NODE_ENV: 'staging' })).toThrow(
      /E2E_TOKEN_PEEK must never be enabled in staging/
    );
  });

  it('does not throw in staging when the flag is off', () => {
    // ADS-967: staging also requires CORS_ORIGIN — set it here so this test
    // isolates the test-token-peek behaviour it actually asserts.
    expect(() =>
      loadConfig({ NODE_ENV: 'staging', CORS_ORIGIN: 'https://app.example.com' })
    ).not.toThrow();
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

// ADS-1323: packages/lib.validation/src/schemas/env.ts's production-only
// refiners (CORS wildcard rejection, secret-distinctness) were never wired
// into any running service's boot path — the gateway's own buildCorsConfig
// only checked for an EMPTY CORS_ORIGIN, so a wildcard value sailed through.
describe('loadConfig — CORS wildcard rejection (ADS-1323)', () => {
  it('refuses to boot under NODE_ENV=production when CORS_ORIGIN is a bare wildcard', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', CORS_ORIGIN: '*' })).toThrow(/wildcard/i);
  });

  it('refuses to boot under NODE_ENV=production when CORS_ORIGIN mixes a real origin with a wildcard', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', CORS_ORIGIN: 'https://adoptdontshop.com,*' })
    ).toThrow(/wildcard/i);
  });

  it('refuses to boot under NODE_ENV=staging when CORS_ORIGIN contains a wildcard', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging', CORS_ORIGIN: '*' })).toThrow(/wildcard/i);
  });

  it('still allows a wildcard-free CORS_ORIGIN in production', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', CORS_ORIGIN: 'https://adoptdontshop.com' })
    ).not.toThrow();
  });

  it('does not reject a wildcard outside production/staging', () => {
    expect(() => loadConfig({ NODE_ENV: 'development', CORS_ORIGIN: '*' })).not.toThrow();
  });
});

describe('loadConfig — secret distinctness (ADS-1323)', () => {
  // The gateway only ever sets a couple of the paired secrets itself
  // (UPLOAD_SIGNING_SECRET); ENCRYPTION_KEY is never one the gateway reads,
  // but a shared secrets file could still export it into the gateway's
  // process.env — DISTINCT_SECRET_PAIRS covers that pair, so it's the one
  // exercised here without requiring lib.validation to gain a new pair.
  it('refuses to boot under NODE_ENV=production when UPLOAD_SIGNING_SECRET reuses ENCRYPTION_KEY', () => {
    const shared = 'a'.repeat(32);
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://adoptdontshop.com',
        UPLOAD_SIGNING_SECRET: shared,
        ENCRYPTION_KEY: shared,
      })
    ).toThrow(/must be distinct/i);
  });

  it('boots fine under NODE_ENV=production when the two secrets are distinct', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://adoptdontshop.com',
        UPLOAD_SIGNING_SECRET: 'a'.repeat(32),
        ENCRYPTION_KEY: 'b'.repeat(32),
      })
    ).not.toThrow();
  });

  it('does not enforce distinctness outside production/staging', () => {
    const shared = 'a'.repeat(32);
    expect(() =>
      loadConfig({
        NODE_ENV: 'development',
        UPLOAD_SIGNING_SECRET: shared,
        ENCRYPTION_KEY: shared,
      })
    ).not.toThrow();
  });
});

describe('loadConfig — metrics bearer token (ADS-1327)', () => {
  it('is undefined when METRICS_BEARER_TOKEN is unset (metrics stays public by default)', () => {
    const config = loadConfig({});
    expect(config.metricsBearerToken).toBeUndefined();
  });

  it('reads METRICS_BEARER_TOKEN from the environment', () => {
    const config = loadConfig({ METRICS_BEARER_TOKEN: 'a-metrics-token-of-16+-bytes' });
    expect(config.metricsBearerToken).toBe('a-metrics-token-of-16+-bytes');
  });

  it('treats a blank METRICS_BEARER_TOKEN as unset', () => {
    const config = loadConfig({ METRICS_BEARER_TOKEN: '   ' });
    expect(config.metricsBearerToken).toBeUndefined();
  });

  it('rejects a present-but-too-short METRICS_BEARER_TOKEN', () => {
    expect(() => loadConfig({ METRICS_BEARER_TOKEN: 'too-short' })).toThrow(
      /METRICS_BEARER_TOKEN must be at least 16 bytes/
    );
  });
});

describe('loadConfig — AV scan (ADS-1241)', () => {
  it('defaults host/port to the docker-compose clamav service + clamd standard port', () => {
    const config = loadConfig({});
    expect(config.avScan.host).toBe('clamav');
    expect(config.avScan.port).toBe(3310);
  });

  it('honours CLAMAV_HOST / CLAMAV_PORT overrides', () => {
    const config = loadConfig({ CLAMAV_HOST: 'clamav.internal', CLAMAV_PORT: '9310' });
    expect(config.avScan.host).toBe('clamav.internal');
    expect(config.avScan.port).toBe(9310);
  });

  it('falls back to the default port when CLAMAV_PORT is non-numeric or non-positive', () => {
    expect(loadConfig({ CLAMAV_PORT: 'nope' }).avScan.port).toBe(3310);
    expect(loadConfig({ CLAMAV_PORT: '0' }).avScan.port).toBe(3310);
    expect(loadConfig({ CLAMAV_PORT: '-1' }).avScan.port).toBe(3310);
  });

  it('fails closed by default (CLAMAV_FAIL_OPEN unset)', () => {
    expect(loadConfig({}).avScan.failClosed).toBe(true);
  });

  it('fails open outside production when CLAMAV_FAIL_OPEN=true', () => {
    expect(loadConfig({ CLAMAV_FAIL_OPEN: 'true' }).avScan.failClosed).toBe(false);
    expect(
      loadConfig({ CLAMAV_FAIL_OPEN: 'true', NODE_ENV: 'development' }).avScan.failClosed
    ).toBe(false);
  });

  it('HARD-enforces failClosed=true in production regardless of CLAMAV_FAIL_OPEN', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://adoptdontshop.com',
      CLAMAV_FAIL_OPEN: 'true',
    });
    expect(config.avScan.failClosed).toBe(true);
  });
});
