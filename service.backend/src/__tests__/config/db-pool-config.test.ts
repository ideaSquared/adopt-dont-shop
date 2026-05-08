/**
 * ADS-401 — Connection pool, statement_timeout, lock_timeout config.
 *
 * These tests verify the env-driven defaults and overrides for the Sequelize
 * pool and PostgreSQL session-level timeouts. The Sequelize instance itself
 * is constructed with sqlite in tests, so we exercise the pure helper
 * functions rather than introspecting the live connection.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPoolConfig, buildTimeoutConfig, logEffectiveDbConfig } from '../../sequelize';

const POOL_VARS = ['DB_POOL_MAX', 'DB_POOL_MIN', 'DB_POOL_ACQUIRE_MS', 'DB_POOL_IDLE_MS'] as const;

const TIMEOUT_VARS = [
  'DB_STATEMENT_TIMEOUT_MS',
  'DB_LOCK_TIMEOUT_MS',
  'DB_IDLE_IN_TRANSACTION_TIMEOUT_MS',
] as const;

const clearVars = () => {
  for (const name of [...POOL_VARS, ...TIMEOUT_VARS]) {
    delete process.env[name];
  }
};

describe('database pool + timeout config [ADS-401]', () => {
  beforeEach(() => {
    clearVars();
  });

  afterEach(() => {
    clearVars();
  });

  it('returns sane defaults when no env vars are set', () => {
    expect(buildPoolConfig()).toEqual({
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000,
    });

    expect(buildTimeoutConfig()).toEqual({
      statementTimeoutMs: 30000,
      lockTimeoutMs: 10000,
      idleInTransactionSessionTimeoutMs: 60000,
    });
  });

  it('honours numeric overrides from env', () => {
    process.env.DB_POOL_MAX = '50';
    process.env.DB_POOL_MIN = '5';
    process.env.DB_POOL_ACQUIRE_MS = '15000';
    process.env.DB_POOL_IDLE_MS = '5000';
    process.env.DB_STATEMENT_TIMEOUT_MS = '45000';
    process.env.DB_LOCK_TIMEOUT_MS = '7500';
    process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS = '90000';

    expect(buildPoolConfig()).toEqual({
      max: 50,
      min: 5,
      acquire: 15000,
      idle: 5000,
    });

    expect(buildTimeoutConfig()).toEqual({
      statementTimeoutMs: 45000,
      lockTimeoutMs: 7500,
      idleInTransactionSessionTimeoutMs: 90000,
    });
  });

  it('falls back to defaults when env values are non-numeric or negative', () => {
    process.env.DB_POOL_MAX = 'not-a-number';
    process.env.DB_POOL_MIN = '-1';
    process.env.DB_STATEMENT_TIMEOUT_MS = 'NaN';

    expect(buildPoolConfig().max).toBe(20);
    expect(buildPoolConfig().min).toBe(2);
    expect(buildTimeoutConfig().statementTimeoutMs).toBe(30000);
  });

  it('logs effective values so the running config is visible in ops', () => {
    const log = vi.fn();

    logEffectiveDbConfig(
      { max: 20, min: 2, acquire: 30000, idle: 10000 },
      {
        statementTimeoutMs: 30000,
        lockTimeoutMs: 10000,
        idleInTransactionSessionTimeoutMs: 60000,
      },
      log
    );

    expect(log).toHaveBeenCalledTimes(1);
    const [message] = log.mock.calls[0];
    expect(message).toContain('pool max=20');
    expect(message).toContain('statementTimeoutMs=30000');
    expect(message).toContain('lockTimeoutMs=10000');
    expect(message).toContain('idleInTransactionSessionTimeoutMs=60000');
  });
});
