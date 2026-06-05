import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLogger } from './logger.js';

const ENV_KEYS = ['LOG_LEVEL', 'LOKI_URL', 'NODE_ENV'] as const;

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]])) as Record<
    (typeof ENV_KEYS)[number],
    string | undefined
  >;
}
function restoreEnv(snap: ReturnType<typeof snapshotEnv>) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = snap[k];
    }
  }
}

describe('createLogger', () => {
  let envSnap: ReturnType<typeof snapshotEnv>;

  beforeEach(() => {
    envSnap = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(envSnap);
  });

  it('returns a logger configured with the service name in defaultMeta', () => {
    const logger = createLogger({ serviceName: 'service.test' });
    expect(logger.defaultMeta).toEqual({ service: 'service.test' });
  });

  it('uses `info` as the level by default outside development', () => {
    process.env.NODE_ENV = 'production';
    const logger = createLogger({ serviceName: 'svc' });
    expect(logger.level).toBe('info');
  });

  it('uses `debug` as the level when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    const logger = createLogger({ serviceName: 'svc' });
    expect(logger.level).toBe('debug');
  });

  it('honours LOG_LEVEL env var when set', () => {
    process.env.LOG_LEVEL = 'warn';
    const logger = createLogger({ serviceName: 'svc' });
    expect(logger.level).toBe('warn');
  });

  it('ignores unknown LOG_LEVEL values and falls back to the env-based default', () => {
    process.env.LOG_LEVEL = 'screaming';
    process.env.NODE_ENV = 'production';
    const logger = createLogger({ serviceName: 'svc' });
    expect(logger.level).toBe('info');
  });

  it('opts.logLevel overrides everything', () => {
    process.env.LOG_LEVEL = 'warn';
    const logger = createLogger({ serviceName: 'svc', logLevel: 'error' });
    expect(logger.level).toBe('error');
  });

  it('uses only the console transport when LOKI_URL is unset', () => {
    const logger = createLogger({ serviceName: 'svc' });
    expect(logger.transports).toHaveLength(1);
  });

  it('adds the Loki transport when LOKI_URL is set', () => {
    process.env.LOKI_URL = 'http://loki:3100';
    const logger = createLogger({ serviceName: 'svc' });
    expect(logger.transports).toHaveLength(2);
  });

  it('actually emits log lines through the configured transport without throwing', () => {
    const logger = createLogger({ serviceName: 'svc' });
    expect(() => logger.info('hello', { context: 'smoke' })).not.toThrow();
  });
});
