import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('uses the documented defaults when no env vars are set', () => {
    const config = loadConfig({});
    expect(config.port).toBe(4000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.upstreamBackendUrl).toBe('http://service-backend:5000');
    expect(config.environment).toBe('development');
    expect(config.natsUrl).toBe('nats://nats:4222');
  });

  it('defaults every cutover flag to false (all domains proxy to the monolith)', () => {
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

  it('honours GATEWAY_PORT / GATEWAY_HOST / UPSTREAM_BACKEND_URL / NODE_ENV / NATS_URL when set', () => {
    const config = loadConfig({
      GATEWAY_PORT: '4321',
      GATEWAY_HOST: '127.0.0.1',
      UPSTREAM_BACKEND_URL: 'http://backend.internal:8080',
      NODE_ENV: 'production',
      NATS_URL: 'nats://nats.internal:4222',
    });

    expect(config.port).toBe(4321);
    expect(config.host).toBe('127.0.0.1');
    expect(config.upstreamBackendUrl).toBe('http://backend.internal:8080');
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
      UPSTREAM_BACKEND_URL: '  http://upstream:9000  ',
    });
    expect(config.host).toBe('localhost');
    expect(config.upstreamBackendUrl).toBe('http://upstream:9000');
  });
});
