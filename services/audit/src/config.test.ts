import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const REQUIRED = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
};

describe('loadConfig', () => {
  it('uses the documented defaults when only the required env vars are set', () => {
    const config = loadConfig({ ...REQUIRED });
    expect(config.port).toBe(5009);
    expect(config.grpcPort).toBe(6009);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.databaseUrl).toBe(REQUIRED.DATABASE_URL);
    expect(config.schema).toBe('audit');
    expect(config.natsUrl).toBe('nats://nats:4222');
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      AUDIT_PORT: '5500',
      AUDIT_GRPC_PORT: '6500',
      AUDIT_HOST: '127.0.0.1',
      AUDIT_SCHEMA: 'audit_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://prod:secret@db.example.com:5432/audit',
      NATS_URL: 'nats://nats.internal:4222',
    });

    expect(config.port).toBe(5500);
    expect(config.grpcPort).toBe(6500);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
    expect(config.schema).toBe('audit_test');
    expect(config.databaseUrl).toBe('postgres://prod:secret@db.example.com:5432/audit');
    expect(config.natsUrl).toBe('nats://nats.internal:4222');
  });

  it('rejects a non-numeric AUDIT_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, AUDIT_PORT: 'five-thousand' })).toThrow(
      /AUDIT_PORT must be a positive integer/
    );
  });

  it('rejects a non-numeric AUDIT_GRPC_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, AUDIT_GRPC_PORT: 'six-thousand' })).toThrow(
      /AUDIT_GRPC_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive AUDIT_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, AUDIT_PORT: '0' })).toThrow(
      /AUDIT_PORT must be a positive integer/
    );
  });

  it('rejects an unset DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });
});
