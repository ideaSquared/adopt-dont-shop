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

  it('defaults every cutover flag to false', () => {
    const config = loadConfig({});
    expect(config.cutover).toEqual({
      auth: false,
      notifications: false,
      pets: false,
      rescue: false,
      applications: false,
      moderation: false,
      matching: false,
      audit: false,
      chat: false,
      cms: false,
    });
  });

  it('enables a cutover flag only for the exact string "true" (case-insensitive)', () => {
    const config = loadConfig({
      CUTOVER_PETS: 'true',
      CUTOVER_AUTH: 'TRUE',
      CUTOVER_APPLICATIONS: 'false',
      CUTOVER_MATCHING: '1',
      CUTOVER_AUDIT: '',
    });
    expect(config.cutover.pets).toBe(true);
    expect(config.cutover.auth).toBe(true);
    expect(config.cutover.applications).toBe(false);
    expect(config.cutover.matching).toBe(false);
    expect(config.cutover.audit).toBe(false);
  });

  it('honours GATEWAY_PORT / GATEWAY_HOST / NODE_ENV / NATS_URL when set', () => {
    const config = loadConfig({
      GATEWAY_PORT: '4321',
      GATEWAY_HOST: '127.0.0.1',
      NODE_ENV: 'production',
      NATS_URL: 'nats://nats.internal:4222',
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

describe('loadConfig — principal signing key (ADS-800)', () => {
  it('is undefined when PRINCIPAL_SIGNING_KEY is unset', () => {
    const config = loadConfig({});
    expect(config.principalSigningKey).toBeUndefined();
  });

  it('reads PRINCIPAL_SIGNING_KEY from the environment', () => {
    const config = loadConfig({ PRINCIPAL_SIGNING_KEY: 'dev-signing-key' });
    expect(config.principalSigningKey).toBe('dev-signing-key');
  });

  it('treats a blank PRINCIPAL_SIGNING_KEY as unset', () => {
    const config = loadConfig({ PRINCIPAL_SIGNING_KEY: '   ' });
    expect(config.principalSigningKey).toBeUndefined();
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
