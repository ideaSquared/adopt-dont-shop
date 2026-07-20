import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const REQUIRED = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
};

describe('loadConfig', () => {
  it('uses the documented defaults when only the required env vars are set', () => {
    const config = loadConfig({ ...REQUIRED });
    expect(config.port).toBe(5004);
    expect(config.grpcPort).toBe(6004);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.databaseUrl).toBe(REQUIRED.DATABASE_URL);
    expect(config.schema).toBe('rescue');
    expect(config.natsUrl).toBe('nats://nats:4222');
    expect(config.petsGrpcUrl).toBe('service-pets:6003');
    expect(config.applicationsGrpcUrl).toBe('service-applications:6005');
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      RESCUE_PORT: '5500',
      RESCUE_GRPC_PORT: '6500',
      RESCUE_HOST: '127.0.0.1',
      RESCUE_SCHEMA: 'rescue_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://prod:secret@db.example.com:5432/rescue',
      NATS_URL: 'nats://nats.internal:4222',
      PETS_GRPC_URL: 'pets.internal:6003',
      APPLICATIONS_GRPC_URL: 'applications.internal:6005',
    });

    expect(config.port).toBe(5500);
    expect(config.grpcPort).toBe(6500);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
    expect(config.schema).toBe('rescue_test');
    expect(config.databaseUrl).toBe('postgres://prod:secret@db.example.com:5432/rescue');
    expect(config.natsUrl).toBe('nats://nats.internal:4222');
    expect(config.petsGrpcUrl).toBe('pets.internal:6003');
    expect(config.applicationsGrpcUrl).toBe('applications.internal:6005');
  });

  it('rejects a non-numeric RESCUE_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, RESCUE_PORT: 'five-thousand' })).toThrow(
      /RESCUE_PORT must be a positive integer/
    );
  });

  it('rejects a non-numeric RESCUE_GRPC_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, RESCUE_GRPC_PORT: 'six-thousand' })).toThrow(
      /RESCUE_GRPC_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive RESCUE_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, RESCUE_PORT: '0' })).toThrow(
      /RESCUE_PORT must be a positive integer/
    );
  });

  it('rejects an unset DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });
});
