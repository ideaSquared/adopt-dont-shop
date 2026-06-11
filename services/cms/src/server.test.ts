import { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CmsConfig } from './config.js';
import { createServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const baseConfig: CmsConfig = {
  port: 0,
  grpcPort: 0,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'cms',
  natsUrl: 'nats://localhost:4222',
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
      service: 'service.cms',
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

  it('returns a 500 when a route handler throws (custom error handler)', async () => {
    server.get('/boom', async () => {
      throw new Error('boom');
    });
    const res = await server.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'internal_error' });
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
  it('echoes the inbound x-request-id header on the response', async () => {
    const server = createServer({ config: baseConfig, logger: quietLogger });
    try {
      const res = await server.inject({
        method: 'GET',
        url: '/health/simple',
        headers: { 'x-request-id': 'svc-test-id-1234' },
      });
      expect(res.headers['x-request-id']).toBe('svc-test-id-1234');
    } finally {
      await server.close();
    }
  });
});
