import { Writable } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import winston from 'winston';

import { createLogger } from './logger.js';

const flush = () => new Promise(resolve => setImmediate(resolve));

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

  it('redacts secret-shaped fields before they reach a transport', async () => {
    const chunks: string[] = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk.toString());
        cb();
      },
    });
    const logger = createLogger({ serviceName: 'svc' });
    // Capture the redacted info as JSON (logger-level redaction runs before
    // this transport's json format).
    logger.add(new winston.transports.Stream({ stream: sink, format: winston.format.json() }));

    logger.info('user login', {
      userId: 'u1',
      password: 'hunter2',
      auth: { accessToken: 'jwt', nested: { 'x-api-key': 'k' } },
      tokens: ['secret-a', 'secret-b'],
    });
    await flush();

    const line = JSON.parse(chunks.join('')) as Record<string, unknown>;
    // Non-secret fields survive.
    expect(line.userId).toBe('u1');
    expect(line.message).toBe('user login');
    // Secret-shaped keys are redacted, recursively.
    expect(line.password).toBe('[REDACTED]');
    expect((line.auth as Record<string, unknown>).accessToken).toBe('[REDACTED]');
    expect(
      ((line.auth as Record<string, unknown>).nested as Record<string, unknown>)['x-api-key']
    ).toBe('[REDACTED]');
    // A key named `tokens` matches the `token` substring → value redacted wholesale.
    expect(line.tokens).toBe('[REDACTED]');
  });
});
