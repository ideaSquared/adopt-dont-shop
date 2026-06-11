import { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMicroserviceServer } from './server.js';

type MinimalConfig = {
  environment: string;
};

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const baseConfig: MinimalConfig = {
  environment: 'test',
};

describe('createMicroserviceServer — health endpoint', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: quietLogger,
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it('responds 200 with status ok when ready', async () => {
    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: 'ok',
      service: 'service.test',
      environment: 'test',
    });
  });

  it('surfaces the configured environment in the health payload', async () => {
    const stagingServer = createMicroserviceServer({
      serviceName: 'service.test',
      config: { environment: 'staging' },
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

describe('createMicroserviceServer — readiness probe (isReady gate)', () => {
  it('returns 503 {status: "starting"} when isReady returns false', async () => {
    const server = createMicroserviceServer({
      serviceName: 'service.test',
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
    const server = createMicroserviceServer({
      serviceName: 'service.test',
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

  it('defaults to ready (isReady omitted) — existing service behaviour unchanged', async () => {
    const server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: quietLogger,
    });
    try {
      const res = await server.inject({ method: 'GET', url: '/health/simple' });
      expect(res.statusCode).toBe(200);
    } finally {
      await server.close();
    }
  });
});

describe('createMicroserviceServer — /metrics endpoint', () => {
  it('exposes Prometheus metrics including http_request_duration_seconds', async () => {
    const server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: quietLogger,
    });
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

describe('createMicroserviceServer — x-request-id propagation', () => {
  it('echoes inbound x-request-id on response', async () => {
    const server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: quietLogger,
    });
    try {
      const res = await server.inject({
        method: 'GET',
        url: '/health/simple',
        headers: { 'x-request-id': 'test-req-123' },
      });
      expect(res.headers['x-request-id']).toBe('test-req-123');
    } finally {
      await server.close();
    }
  });
});

describe('createMicroserviceServer — error handler', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: quietLogger,
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it('returns generic internal_error body when a route throws', async () => {
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
