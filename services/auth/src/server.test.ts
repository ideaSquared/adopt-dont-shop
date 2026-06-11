import { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AuthConfig } from './config.js';
import { createServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const baseConfig: AuthConfig = {
  port: 0,
  grpcPort: 0,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'auth',
  natsUrl: 'nats://localhost:4222',
  jwtSecret: 'test-access',
  jwtRefreshSecret: 'test-refresh',
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
      service: 'service.auth',
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

describe('createServer — readiness probe', () => {
  it('returns 503 with status starting when isReady returns false', async () => {
    const server = createServer({
      config: baseConfig,
      logger: quietLogger,
      isReady: () => false,
    });
    try {
      const res = await server.inject({ method: 'GET', url: '/health/simple' });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toEqual({ status: 'starting' });
    } finally {
      await server.close();
    }
  });

  it('returns 200 once isReady flips to true', async () => {
    let ready = false;
    const server = createServer({
      config: baseConfig,
      logger: quietLogger,
      isReady: () => ready,
    });
    try {
      const notReady = await server.inject({ method: 'GET', url: '/health/simple' });
      expect(notReady.statusCode).toBe(503);

      ready = true;

      const nowReady = await server.inject({ method: 'GET', url: '/health/simple' });
      expect(nowReady.statusCode).toBe(200);
      expect(nowReady.json()).toMatchObject({ status: 'ok' });
    } finally {
      await server.close();
    }
  });

  it('defaults to ready (isReady omitted) — existing behaviour unchanged', async () => {
    const server = createServer({ config: baseConfig, logger: quietLogger });
    try {
      const res = await server.inject({ method: 'GET', url: '/health/simple' });
      expect(res.statusCode).toBe(200);
    } finally {
      await server.close();
    }
  });
});

describe('createServer — /metrics endpoint', () => {
  it('exposes Prometheus metrics with http_request_duration_seconds', async () => {
    const server = createServer({ config: baseConfig, logger: quietLogger });
    try {
      // Issue a request first so the histogram has at least one sample.
      await server.inject({ method: 'GET', url: '/health/simple' });
      const res = await server.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('http_request_duration_seconds');
    } finally {
      await server.close();
    }
  });
});

describe('createServer — x-request-id', () => {
  it('echoes inbound x-request-id and stamps it on req.requestId', async () => {
    const server = createServer({ config: baseConfig, logger: quietLogger });
    try {
      const res = await server.inject({
        method: 'GET',
        url: '/health/simple',
        headers: { 'x-request-id': 'svc-auth-abc' },
      });
      expect(res.headers['x-request-id']).toBe('svc-auth-abc');
    } finally {
      await server.close();
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
