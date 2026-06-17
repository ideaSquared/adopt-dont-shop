import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

// A minimal env with only the one hard requirement satisfied. Each test
// spreads its own overrides on top so the defaults are exercised in
// isolation.
const baseEnv: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgres://cms',
};

describe('loadConfig', () => {
  it('applies the documented defaults when only DATABASE_URL is set', () => {
    const config = loadConfig(baseEnv);
    expect(config).toEqual({
      port: 5010,
      grpcPort: 6010,
      host: '0.0.0.0',
      environment: 'development',
      databaseUrl: 'postgres://cms',
      schema: 'cms',
      natsUrl: 'nats://nats:4222',
    });
  });

  it('honours every override env var', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://override',
      CMS_PORT: '7000',
      CMS_GRPC_PORT: '8000',
      CMS_HOST: '127.0.0.1',
      NODE_ENV: 'production',
      CMS_SCHEMA: 'content',
      NATS_URL: 'nats://broker:4222',
    });
    expect(config).toEqual({
      port: 7000,
      grpcPort: 8000,
      host: '127.0.0.1',
      environment: 'production',
      databaseUrl: 'postgres://override',
      schema: 'content',
      natsUrl: 'nats://broker:4222',
    });
  });

  it('trims whitespace-only overrides back to their defaults', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://cms',
      CMS_HOST: '   ',
      NODE_ENV: '   ',
      CMS_SCHEMA: '   ',
      NATS_URL: '   ',
    });
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.schema).toBe('cms');
    expect(config.natsUrl).toBe('nats://nats:4222');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });

  it('throws when CMS_PORT is not a positive integer', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgres://cms', CMS_PORT: 'abc' })).toThrow(
      /CMS_PORT must be a positive integer/
    );
  });

  it('throws when CMS_GRPC_PORT is not a positive integer', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgres://cms', CMS_GRPC_PORT: '-1' })).toThrow(
      /CMS_GRPC_PORT must be a positive integer/
    );
  });
});
