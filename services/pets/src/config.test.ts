import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const REQUIRED = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
};

describe('loadConfig', () => {
  it('uses the documented defaults when only the required env vars are set', () => {
    const config = loadConfig({ ...REQUIRED });
    expect(config.port).toBe(5003);
    expect(config.grpcPort).toBe(6003);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.databaseUrl).toBe(REQUIRED.DATABASE_URL);
    expect(config.schema).toBe('pets');
    expect(config.natsUrl).toBe('nats://nats:4222');
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      PETS_PORT: '5500',
      PETS_GRPC_PORT: '6500',
      PETS_HOST: '127.0.0.1',
      PETS_SCHEMA: 'pets_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://prod:secret@db.example.com:5432/pets',
      NATS_URL: 'nats://nats.internal:4222',
    });

    expect(config.port).toBe(5500);
    expect(config.grpcPort).toBe(6500);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
    expect(config.schema).toBe('pets_test');
    expect(config.databaseUrl).toBe('postgres://prod:secret@db.example.com:5432/pets');
    expect(config.natsUrl).toBe('nats://nats.internal:4222');
  });

  it('rejects a non-numeric PETS_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, PETS_PORT: 'five-thousand' })).toThrow(
      /PETS_PORT must be a positive integer/
    );
  });

  it('rejects a non-numeric PETS_GRPC_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, PETS_GRPC_PORT: 'six-thousand' })).toThrow(
      /PETS_GRPC_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive PETS_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, PETS_PORT: '0' })).toThrow(
      /PETS_PORT must be a positive integer/
    );
  });

  it('rejects an unset DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });
});
