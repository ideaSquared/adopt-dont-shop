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
  environment: 'test',
  storage: {
    provider: 'local',
    local: { directory: 'uploads', publicPath: '/uploads' },
    s3: {},
    maxFileSize: 1_000_000,
  },
  // Gateway-folded surfaces — disabled by default in tests; specific
  // suites that exercise them flip the flag (and pass docsDir) inline.
  legal: { enabled: false, docsDir: 'docs/legal' },
  config: { publicEnabled: false },
} as GatewayConfig;

describe('createServer — health endpoint', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = await createServer({ config: baseConfig, logger: quietLogger });
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
    const stagingServer = await createServer({
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

// Phase 11: the residual service.backend monolith is gone. Anything
// under /api/* that isn't owned by an extracted service must 404 — no
// silent fallthrough to a backend that doesn't exist.
describe('createServer — /api/* fallback', () => {
  let server: FastifyInstance;
  afterEach(async () => {
    await server?.close();
  });

  it('404s unknown /api/* paths', async () => {
    server = await createServer({ config: baseConfig, logger: quietLogger });
    const res = await server.inject({ method: 'GET', url: '/api/some/unknown/path' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });

  it('404s unknown /api/* paths for POST too', async () => {
    server = await createServer({ config: baseConfig, logger: quietLogger });
    const res = await server.inject({
      method: 'POST',
      url: '/api/another/missing/path',
      payload: {},
    });
    expect(res.statusCode).toBe(404);
  });

  it('does NOT intercept paths outside /api/* — health endpoint stays local', async () => {
    server = await createServer({ config: baseConfig, logger: quietLogger });
    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ service: 'service.gateway' });
  });
});

describe('createServer — /metrics endpoint', () => {
  let server: FastifyInstance;
  afterEach(async () => {
    await server?.close();
  });

  it('exposes Prometheus metrics with http_request_duration_seconds', async () => {
    server = await createServer({ config: baseConfig, logger: quietLogger });
    await server.inject({ method: 'GET', url: '/health/simple' });
    const res = await server.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('http_request_duration_seconds');
  });
});

describe('createServer — x-request-id', () => {
  let server: FastifyInstance;
  afterEach(async () => {
    await server?.close();
  });

  it('echoes the inbound x-request-id header on the response', async () => {
    server = await createServer({ config: baseConfig, logger: quietLogger });
    const res = await server.inject({
      method: 'GET',
      url: '/health/simple',
      headers: { 'x-request-id': 'gw-test-id-1234' },
    });
    expect(res.headers['x-request-id']).toBe('gw-test-id-1234');
  });
});

// Per-domain cutover gate. With the flag OFF (default) the gateway does
// NOT register the domain's /api/v1/* routes, so the request 404s.
// With the flag ON the gateway's route plugin intercepts it.
describe('createServer — per-domain cutover gate', () => {
  let server: FastifyInstance;

  const allOff = {
    auth: false,
    notifications: false,
    pets: false,
    rescue: false,
    applications: false,
    moderation: false,
    matching: false,
    audit: false,
    chat: false,
    cms: false,
  } as const;

  // A stub applications client whose List resolves an empty page. Only
  // the List path is exercised here.
  const applicationsClient = {
    list: () => Promise.resolve({ applications: [] }),
  } as unknown as Parameters<typeof createServer>[0]['applicationsClient'];

  afterEach(async () => {
    await server?.close();
  });

  it('404s /api/v1/applications when cutover.applications is OFF (even with a client)', async () => {
    server = await createServer({
      config: { ...baseConfig, cutover: { ...allOff } },
      logger: quietLogger,
      applicationsClient,
    });
    const res = await server.inject({ method: 'GET', url: '/api/v1/applications' });
    expect(res.statusCode).toBe(404);
  });

  it('intercepts /api/v1/applications at the gateway route when cutover.applications is ON', async () => {
    server = await createServer({
      config: {
        ...baseConfig,
        cutover: { ...allOff, applications: true },
      },
      logger: quietLogger,
      applicationsClient,
    });
    const res = await server.inject({ method: 'GET', url: '/api/v1/applications' });
    // The gateway route served it — Stage B view adapter wraps the
    // (empty) result in the frontend's `{ data }` envelope.
    expect(res.json()).toEqual({ data: [] });
  });
});
