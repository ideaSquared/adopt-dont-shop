import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const REQUIRED = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
};

describe('loadConfig', () => {
  it('uses the documented defaults when only the required env vars are set', () => {
    const config = loadConfig({ ...REQUIRED });
    expect(config.port).toBe(5007);
    expect(config.grpcPort).toBe(6007);
    expect(config.host).toBe('0.0.0.0');
    expect(config.schema).toBe('moderation');
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      MODERATION_PORT: '5500',
      MODERATION_GRPC_PORT: '6500',
      MODERATION_HOST: '127.0.0.1',
      MODERATION_SCHEMA: 'moderation_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://prod:secret@db.example.com:5432/moderation',
      NATS_URL: 'nats://nats.internal:4222',
    });
    expect(config.port).toBe(5500);
    expect(config.grpcPort).toBe(6500);
    expect(config.schema).toBe('moderation_test');
  });

  it('rejects a non-numeric MODERATION_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, MODERATION_PORT: 'x' })).toThrow(
      /MODERATION_PORT must be a positive integer/
    );
  });

  it('rejects a non-numeric MODERATION_GRPC_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, MODERATION_GRPC_PORT: 'x' })).toThrow(
      /MODERATION_GRPC_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive MODERATION_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, MODERATION_PORT: '0' })).toThrow(
      /MODERATION_PORT must be a positive integer/
    );
  });

  it('rejects an unset DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });
});
