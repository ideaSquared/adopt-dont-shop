import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const REQUIRED = { DATABASE_URL: 'postgres://test:test@localhost:5432/test' };

describe('loadConfig', () => {
  it('uses the documented defaults when only the required env vars are set', () => {
    const config = loadConfig({ ...REQUIRED });
    expect(config.port).toBe(5008);
    expect(config.grpcPort).toBe(6008);
    expect(config.schema).toBe('matching');
    expect(config.petsGrpcUrl).toBe('service-pets:6003');
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      MATCHING_PORT: '5500',
      MATCHING_GRPC_PORT: '6500',
      MATCHING_HOST: '127.0.0.1',
      MATCHING_SCHEMA: 'matching_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://x',
      NATS_URL: 'nats://nats.internal:4222',
      PETS_GRPC_URL: 'pets.internal:6003',
    });
    expect(config.port).toBe(5500);
    expect(config.grpcPort).toBe(6500);
    expect(config.schema).toBe('matching_test');
    expect(config.petsGrpcUrl).toBe('pets.internal:6003');
  });

  it('rejects a non-numeric MATCHING_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, MATCHING_PORT: 'x' })).toThrow(
      /MATCHING_PORT must be a positive integer/
    );
  });

  it('rejects a non-numeric MATCHING_GRPC_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, MATCHING_GRPC_PORT: 'x' })).toThrow(
      /MATCHING_GRPC_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive MATCHING_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, MATCHING_PORT: '0' })).toThrow(
      /MATCHING_PORT must be a positive integer/
    );
  });

  it('rejects an unset DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });
});
