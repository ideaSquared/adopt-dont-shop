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

describe('createMicroserviceServer — /health/ready dependency probe', () => {
  it('returns 200 with no checks when no readiness deps are configured', async () => {
    const server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: quietLogger,
    });
    try {
      const res = await server.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 'ok', service: 'service.test', checks: {} });
    } finally {
      await server.close();
    }
  });

  it('returns 200 when every configured dependency is healthy', async () => {
    const server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: quietLogger,
      readiness: {
        pool: { query: async () => ({ rows: [] }) },
        nats: { isClosed: () => false },
      },
    });
    try {
      const res = await server.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 'ok', checks: { database: 'ok', nats: 'ok' } });
    } finally {
      await server.close();
    }
  });

  it('returns 503 degraded when a dependency is unreachable', async () => {
    const server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: quietLogger,
      readiness: {
        pool: {
          query: async () => {
            throw new Error('connection terminated unexpectedly');
          },
        },
        nats: { isClosed: () => false },
      },
    });
    try {
      const res = await server.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({
        status: 'degraded',
        checks: { database: 'error', nats: 'ok' },
      });
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

describe('createMicroserviceServer — /metrics bearer-token gate (ADS-1327)', () => {
  it('stays public when METRICS_BEARER_TOKEN is unset — existing behaviour unchanged', async () => {
    const server = createMicroserviceServer(
      { serviceName: 'service.test', config: baseConfig, logger: quietLogger },
      {}
    );
    try {
      const res = await server.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(200);
    } finally {
      await server.close();
    }
  });

  it('rejects an unauthenticated request when METRICS_BEARER_TOKEN is set', async () => {
    const server = createMicroserviceServer(
      { serviceName: 'service.test', config: baseConfig, logger: quietLogger },
      { METRICS_BEARER_TOKEN: 'a-strong-shared-secret' }
    );
    try {
      const res = await server.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(401);
    } finally {
      await server.close();
    }
  });

  it('serves metrics with a matching bearer token', async () => {
    const server = createMicroserviceServer(
      { serviceName: 'service.test', config: baseConfig, logger: quietLogger },
      { METRICS_BEARER_TOKEN: 'a-strong-shared-secret' }
    );
    try {
      const res = await server.inject({
        method: 'GET',
        url: '/metrics',
        headers: { authorization: 'Bearer a-strong-shared-secret' },
      });
      expect(res.statusCode).toBe(200);
    } finally {
      await server.close();
    }
  });

  it('fails boot when METRICS_BEARER_TOKEN is present but too short', () => {
    expect(() =>
      createMicroserviceServer(
        { serviceName: 'service.test', config: baseConfig, logger: quietLogger },
        { METRICS_BEARER_TOKEN: 'too-short' }
      )
    ).toThrow('METRICS_BEARER_TOKEN must be at least 16 bytes');
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

describe('createMicroserviceServer — Sentry initialization (ADS-1041)', () => {
  it('initializes error tracking at boot (reports disabled without a DSN in test env)', async () => {
    // initializeSentry always logs its decision via the provided logger — one of
    // "Sentry is disabled" / "Sentry initialized successfully" / "Failed to
    // initialize Sentry". The /sentry/i matcher below covers all three, so this
    // proves the boot path now invokes initializeSentry (the call site it was
    // missing) regardless of NODE_ENV / SENTRY_DSN, without reaching into the SDK.
    const infoMessages: string[] = [];
    const capturingLogger = {
      info: (msg: string) => {
        infoMessages.push(msg);
      },
      error: () => undefined,
      warn: () => undefined,
      debug: () => undefined,
      silly: () => undefined,
    } as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

    const server = createMicroserviceServer({
      serviceName: 'service.test',
      config: baseConfig,
      logger: capturingLogger,
    });
    try {
      expect(infoMessages.some(msg => /sentry/i.test(msg))).toBe(true);
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
