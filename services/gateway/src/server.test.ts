import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GatewayConfig } from './config.js';
import { createServer } from './server.js';

// Quiet stand-in so the test output stays readable. We don't actually
// assert log calls here — that's covered by @adopt-dont-shop/observability's
// own tests. Casting via `unknown` because winston's Logger type carries
// a lot of surface we don't need to mock for the gateway smoke.
const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const baseConfig: GatewayConfig = {
  port: 0,
  host: '127.0.0.1',
  upstreamBackendUrl: 'http://localhost:0',
  environment: 'test',
};

/**
 * Boot a stub upstream Fastify on an ephemeral port so the proxy plugin
 * has a real HTTP target to reach. Returns the running instance and its
 * address — caller closes it in afterEach.
 */
async function startUpstream(
  handler: (server: FastifyInstance) => void
): Promise<{ instance: FastifyInstance; url: string }> {
  const instance = Fastify({ logger: false });
  handler(instance);
  await instance.listen({ port: 0, host: '127.0.0.1' });
  const address = instance.server.address();
  if (!address || typeof address !== 'object') {
    throw new Error('Upstream did not bind a port');
  }
  return { instance, url: `http://127.0.0.1:${address.port}` };
}

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
      service: 'service.gateway',
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

describe('createServer — strangler-fig /api/* proxy', () => {
  let upstream: { instance: FastifyInstance; url: string };
  let server: FastifyInstance;

  afterEach(async () => {
    await server?.close();
    await upstream?.instance?.close();
  });

  it('forwards a GET /api/pets to the configured upstream and returns its response', async () => {
    upstream = await startUpstream(s => {
      s.get('/api/pets', async () => ({ pets: [{ id: 'p1', name: 'Rex' }] }));
    });
    server = createServer({
      config: { ...baseConfig, upstreamBackendUrl: upstream.url },
      logger: quietLogger,
    });

    const res = await server.inject({ method: 'GET', url: '/api/pets' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ pets: [{ id: 'p1', name: 'Rex' }] });
  });

  it('forwards POST /api/applications with the request body intact', async () => {
    const received: Array<{ method: string; url: string; body: unknown }> = [];
    upstream = await startUpstream(s => {
      s.post('/api/applications', async req => {
        received.push({ method: req.method, url: req.url, body: req.body });
        return { id: 'app-1' };
      });
    });
    server = createServer({
      config: { ...baseConfig, upstreamBackendUrl: upstream.url },
      logger: quietLogger,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/applications',
      headers: { 'content-type': 'application/json' },
      payload: { petId: 'p1', adopterId: 'u1' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'app-1' });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      method: 'POST',
      url: '/api/applications',
      body: { petId: 'p1', adopterId: 'u1' },
    });
  });

  it('preserves the upstream status code (4xx) so client error semantics survive the hop', async () => {
    upstream = await startUpstream(s => {
      s.get('/api/missing', async (_req, reply) => {
        reply.code(404).send({ error: 'not_found' });
      });
    });
    server = createServer({
      config: { ...baseConfig, upstreamBackendUrl: upstream.url },
      logger: quietLogger,
    });

    const res = await server.inject({ method: 'GET', url: '/api/missing' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });

  it('does NOT proxy paths outside /api/* — health endpoint stays local', async () => {
    // The catch-all only mounts under /api. /health/simple is owned by
    // the gateway itself; the upstream must not see it.
    let upstreamHits = 0;
    upstream = await startUpstream(s => {
      s.get('/health/simple', async () => {
        upstreamHits++;
        return { status: 'upstream' };
      });
    });
    server = createServer({
      config: { ...baseConfig, upstreamBackendUrl: upstream.url },
      logger: quietLogger,
    });

    const res = await server.inject({ method: 'GET', url: '/health/simple' });

    expect(res.json()).toMatchObject({ service: 'service.gateway' });
    expect(upstreamHits).toBe(0);
  });

  it('forwards the request path including query string', async () => {
    let receivedUrl = '';
    upstream = await startUpstream(s => {
      s.get('/api/pets', async req => {
        receivedUrl = req.url;
        return { ok: true };
      });
    });
    server = createServer({
      config: { ...baseConfig, upstreamBackendUrl: upstream.url },
      logger: quietLogger,
    });

    await server.inject({ method: 'GET', url: '/api/pets?species=cat&age=2' });

    expect(receivedUrl).toBe('/api/pets?species=cat&age=2');
  });
});
