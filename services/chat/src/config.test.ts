import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const REQUIRED = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
};

describe('loadConfig', () => {
  it('uses the documented defaults when only the required env vars are set', () => {
    const config = loadConfig({ ...REQUIRED });
    expect(config.port).toBe(5006);
    expect(config.grpcPort).toBe(6006);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.databaseUrl).toBe(REQUIRED.DATABASE_URL);
    expect(config.schema).toBe('chat');
    expect(config.natsUrl).toBe('nats://nats:4222');
    expect(config.applicationsGrpcUrl).toBe('service-applications:6005');
    expect(config.rescueGrpcUrl).toBe('service-rescue:6004');
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      CHAT_PORT: '5500',
      CHAT_GRPC_PORT: '6500',
      CHAT_HOST: '127.0.0.1',
      CHAT_SCHEMA: 'chat_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://prod:secret@db.example.com:5432/chat',
      NATS_URL: 'nats://nats.internal:4222',
      APPLICATIONS_GRPC_URL: 'service-applications.internal:6005',
      RESCUE_GRPC_URL: 'service-rescue.internal:6004',
    });

    expect(config.port).toBe(5500);
    expect(config.grpcPort).toBe(6500);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
    expect(config.schema).toBe('chat_test');
    expect(config.databaseUrl).toBe('postgres://prod:secret@db.example.com:5432/chat');
    expect(config.natsUrl).toBe('nats://nats.internal:4222');
    expect(config.applicationsGrpcUrl).toBe('service-applications.internal:6005');
    expect(config.rescueGrpcUrl).toBe('service-rescue.internal:6004');
  });

  it('rejects a non-numeric CHAT_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, CHAT_PORT: 'five-thousand' })).toThrow(
      /CHAT_PORT must be a positive integer/
    );
  });

  it('rejects a non-numeric CHAT_GRPC_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, CHAT_GRPC_PORT: 'six-thousand' })).toThrow(
      /CHAT_GRPC_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive CHAT_PORT', () => {
    expect(() => loadConfig({ ...REQUIRED, CHAT_PORT: '0' })).toThrow(
      /CHAT_PORT must be a positive integer/
    );
  });

  it('rejects an unset DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });
});
