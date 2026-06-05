import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const VALID_DB_URL = 'postgres://test:test@localhost:5432/test';

describe('loadConfig', () => {
  it('uses the documented defaults when no env vars are set (DATABASE_URL still required)', () => {
    const config = loadConfig({ DATABASE_URL: VALID_DB_URL });
    expect(config.port).toBe(5001);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
    expect(config.databaseUrl).toBe(VALID_DB_URL);
    expect(config.schema).toBe('notifications');
  });

  it('honours all env overrides when set', () => {
    const config = loadConfig({
      NOTIFICATIONS_PORT: '5500',
      NOTIFICATIONS_HOST: '127.0.0.1',
      NOTIFICATIONS_SCHEMA: 'notifications_test',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://prod:secret@db.example.com:5432/notifications',
    });

    expect(config.port).toBe(5500);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
    expect(config.schema).toBe('notifications_test');
    expect(config.databaseUrl).toBe('postgres://prod:secret@db.example.com:5432/notifications');
  });

  it('rejects a non-numeric NOTIFICATIONS_PORT', () => {
    expect(() =>
      loadConfig({ NOTIFICATIONS_PORT: 'five-thousand', DATABASE_URL: VALID_DB_URL })
    ).toThrow(/NOTIFICATIONS_PORT must be a positive integer/);
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
