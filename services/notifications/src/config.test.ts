import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const VALID_DB_URL = 'postgres://test:test@localhost:5432/test';

describe('loadConfig', () => {
  it('uses the documented defaults when no env vars are set (DATABASE_URL still required)', () => {
    const config = loadConfig({ DATABASE_URL: VALID_DB_URL });
    expect(config.port).toBe(5001);
    expect(config.grpcPort).toBe(6001);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.databaseUrl).toBe(VALID_DB_URL);
    expect(config.schema).toBe('notifications');
    expect(config.natsUrl).toBe('nats://nats:4222');
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      NOTIFICATIONS_PORT: '5500',
      NOTIFICATIONS_GRPC_PORT: '6500',
      NOTIFICATIONS_HOST: '127.0.0.1',
      NOTIFICATIONS_SCHEMA: 'notifications_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://prod:secret@db.example.com:5432/notifications',
      NATS_URL: 'nats://nats.internal:4222',
      // ADS-549: production needs a real email provider — console is
      // rejected (silent drop of every transactional email). Resend is
      // the production configuration.
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_test_key',
      DEFAULT_FROM_EMAIL: 'noreply@example.com',
      DEFAULT_FROM_NAME: 'Adopt Test',
      // Push provider — fcm in production, same ADS-549 rule.
      PUSH_PROVIDER: 'fcm',
      FCM_SERVICE_ACCOUNT_JSON: '{"type":"service_account"}',
      FCM_PROJECT_ID: 'gcp-project-id',
    });

    expect(config.port).toBe(5500);
    expect(config.grpcPort).toBe(6500);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
    expect(config.schema).toBe('notifications_test');
    expect(config.databaseUrl).toBe('postgres://prod:secret@db.example.com:5432/notifications');
    expect(config.natsUrl).toBe('nats://nats.internal:4222');
    expect(config.emailProvider).toEqual({
      kind: 'resend',
      apiKey: 're_test_key',
      fromEmail: 'noreply@example.com',
      fromName: 'Adopt Test',
      replyTo: undefined,
    });
    expect(config.emailWorkerEnabled).toBe(true);
    expect(config.pushProvider).toEqual({
      kind: 'fcm',
      serviceAccountJson: '{"type":"service_account"}',
      projectId: 'gcp-project-id',
    });
    expect(config.pushWorkerEnabled).toBe(true);
  });

  it('defaults to the console email + push providers in non-production environments', () => {
    const config = loadConfig({ DATABASE_URL: VALID_DB_URL });
    expect(config.emailProvider).toEqual({ kind: 'console' });
    expect(config.pushProvider).toEqual({ kind: 'console' });
  });

  it("rejects PUSH_PROVIDER='console' in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: VALID_DB_URL,
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 'k',
        DEFAULT_FROM_EMAIL: 'from@example.com',
        PUSH_PROVIDER: 'console',
      })
    ).toThrow(/not permitted in production/);
  });

  it("requires FCM_SERVICE_ACCOUNT_JSON when PUSH_PROVIDER='fcm'", () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: VALID_DB_URL,
        PUSH_PROVIDER: 'fcm',
        FCM_PROJECT_ID: 'gcp-project-id',
      })
    ).toThrow(/requires FCM_SERVICE_ACCOUNT_JSON/);
  });

  it('rejects an unknown PUSH_PROVIDER value', () => {
    expect(() => loadConfig({ DATABASE_URL: VALID_DB_URL, PUSH_PROVIDER: 'apns' })).toThrow(
      /PUSH_PROVIDER='apns' is not recognised/
    );
  });

  it("rejects EMAIL_PROVIDER='console' in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: VALID_DB_URL,
        EMAIL_PROVIDER: 'console',
      })
    ).toThrow(/not permitted in production/);
  });

  it("requires RESEND_API_KEY when EMAIL_PROVIDER='resend'", () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: VALID_DB_URL,
        EMAIL_PROVIDER: 'resend',
        DEFAULT_FROM_EMAIL: 'noreply@example.com',
      })
    ).toThrow(/requires RESEND_API_KEY/);
  });

  it('rejects an unknown EMAIL_PROVIDER value', () => {
    expect(() => loadConfig({ DATABASE_URL: VALID_DB_URL, EMAIL_PROVIDER: 'sendgrid' })).toThrow(
      /EMAIL_PROVIDER='sendgrid' is not recognised/
    );
  });

  it('honours EMAIL_WORKER_ENABLED=false', () => {
    const config = loadConfig({
      DATABASE_URL: VALID_DB_URL,
      EMAIL_WORKER_ENABLED: 'false',
    });
    expect(config.emailWorkerEnabled).toBe(false);
  });

  it('rejects a non-numeric NOTIFICATIONS_PORT', () => {
    expect(() =>
      loadConfig({ NOTIFICATIONS_PORT: 'five-thousand', DATABASE_URL: VALID_DB_URL })
    ).toThrow(/NOTIFICATIONS_PORT must be a positive integer/);
  });

  it('rejects a non-numeric NOTIFICATIONS_GRPC_PORT', () => {
    expect(() =>
      loadConfig({ NOTIFICATIONS_GRPC_PORT: 'six-thousand', DATABASE_URL: VALID_DB_URL })
    ).toThrow(/NOTIFICATIONS_GRPC_PORT must be a positive integer/);
  });

  it('rejects a non-positive NOTIFICATIONS_PORT', () => {
    expect(() => loadConfig({ NOTIFICATIONS_PORT: '0', DATABASE_URL: VALID_DB_URL })).toThrow(
      /NOTIFICATIONS_PORT must be a positive integer/
    );
    expect(() => loadConfig({ NOTIFICATIONS_PORT: '-1', DATABASE_URL: VALID_DB_URL })).toThrow(
      /NOTIFICATIONS_PORT must be a positive integer/
    );
  });

  it('rejects an unset DATABASE_URL — the schema-per-service rule needs a connection string at boot', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
    expect(() => loadConfig({ DATABASE_URL: '   ' })).toThrow(/DATABASE_URL is required/);
  });

  it('trims surrounding whitespace from string env values', () => {
    const config = loadConfig({
      NOTIFICATIONS_HOST: '  localhost  ',
      NOTIFICATIONS_SCHEMA: '  custom_schema  ',
      DATABASE_URL: '  ' + VALID_DB_URL + '  ',
    });
    expect(config.host).toBe('localhost');
    expect(config.schema).toBe('custom_schema');
    expect(config.databaseUrl).toBe(VALID_DB_URL);
  });
});
