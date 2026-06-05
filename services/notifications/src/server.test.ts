import { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { NotificationsConfig } from './config.js';
import { createServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const baseConfig: NotificationsConfig = {
  port: 0,
  host: '127.0.0.1',
  environment: 'test',
};

describe('createServer — health endpoint', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = createServer({ config: baseConfig, logger: quietLogger });
  });

  afterEach(async () => {
    await server.close();
  });

  it('responds to GET /health/simple with status ok', async () => {
    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: 'ok',
      service: 'service.notifications',
      environment: 'test',
    });
  });

  it('surfaces the configured environment in the health payload', async () => {
    const stagingServer = createServer({
      config: { ...baseConfig, environment: 'staging' },
      logger: quietLogger,
    });
    try {
      const res = await stagingServer.inject({ method: 'GET', url: '/health/simple' });
      expect(res.json()).toMatchObject({ environment: 'staging' });
    } finally {
      await stagingServer.close();
    }
  });
});

describe('createServer — error handler', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = createServer({ config: baseConfig, logger: quietLogger });
  });

  afterEach(async () => {
    await server.close();
  });

  it('returns a generic `internal_error` body when a route throws', async () => {
    server.get('/boom', async () => {
      throw new Error('upstream timeout');
    });

    const res = await server.inject({ method: 'GET', url: '/boom' });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'internal_error' });
  });

  it('honours an explicit statusCode on the thrown error', async () => {
    server.get('/forbidden', async () => {
      const err = new Error('nope') as Error & { statusCode?: number };
      err.statusCode = 403;
      throw err;
    });

    const res = await server.inject({ method: 'GET', url: '/forbidden' });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'internal_error' });
  });
});
