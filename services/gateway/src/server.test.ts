import { type FastifyInstance } from 'fastify';
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
  // Rate-limit: no Redis in tests, low cap so we can hit 429 quickly.
  rateLimit: { redisUrl: undefined, max: 100, timeWindow: '1 minute' },
  cors: { origins: ['http://localhost:3000'] },
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

// ---------------------------------------------------------------------------
// Rate-limit behaviour
// ---------------------------------------------------------------------------
//
// Global blanket limit: a client hitting any route beyond the cap gets 429
// with the standard rate-limit headers.
//
// Per-route override: auth login is capped at 10/min (tighter than 100/min),
// so it should 429 after 10 requests.
//
// Redis-down degraded mode: createServer must succeed and serve requests
// when the Redis URL is unreachable; the in-memory fallback keeps the gateway
// alive (skipOnError behaviour).
//
// Note: these tests use the in-memory store (no Redis dependency) by leaving
// redisUrl undefined. The Redis-path is covered by the "unreachable Redis"
// test which supplies an invalid URL and verifies the gateway still starts.

describe('createServer — global rate limit', () => {
  let server: FastifyInstance;

  afterEach(async () => {
    await server?.close();
  });

  it('returns 429 when a client exceeds the global cap', async () => {
    // Use a very tight cap (max: 2) so we can test quickly without many requests.
    server = await createServer({
      config: { ...baseConfig, rateLimit: { redisUrl: undefined, max: 2, timeWindow: '1 minute' } },
      logger: quietLogger,
    });

    const hit = async () => server.inject({ method: 'GET', url: '/health/simple' });
    const r1 = await hit();
    const r2 = await hit();
    const r3 = await hit();

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(429);
  });

  it('includes x-ratelimit-* headers on a non-limited response', async () => {
    server = await createServer({
      config: {
        ...baseConfig,
        rateLimit: { redisUrl: undefined, max: 10, timeWindow: '1 minute' },
      },
      logger: quietLogger,
    });
    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(200);
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining');
  });

  it('includes retry-after header in the 429 response', async () => {
    server = await createServer({
      config: { ...baseConfig, rateLimit: { redisUrl: undefined, max: 1, timeWindow: '1 minute' } },
      logger: quietLogger,
    });
    await server.inject({ method: 'GET', url: '/health/simple' });
    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(429);
    expect(res.headers).toHaveProperty('retry-after');
  });
});

// Minimal login-capable auth client stub, shared by every describe block
// below that needs a real /api/v1/auth/login round trip through createServer
// (as opposed to the domain-route-registration smoke tests further down,
// which only need a single method wired).
function makeLoginAuthClient(): Parameters<typeof createServer>[0]['authClient'] {
  return {
    login: () =>
      Promise.resolve({
        user: {
          userId: 'u1',
          email: 'a@b.com',
          userType: 0,
          status: 0,
          emailVerified: false,
          phoneVerified: false,
          twoFactorEnabled: false,
          createdAt: '',
          updatedAt: '',
        },
        tokens: {
          accessToken: 'at',
          refreshToken: 'rt',
          accessExpiresAt: '',
          refreshExpiresAt: '',
        },
        permissions: [],
      }),
    logout: () => Promise.resolve({ success: true }),
    refreshToken: () =>
      Promise.resolve({
        tokens: { accessToken: '', refreshToken: '', accessExpiresAt: '', refreshExpiresAt: '' },
      }),
    validateToken: () => Promise.resolve({ userId: 'u1', role: 0, permissions: [] }),
    getMe: () =>
      Promise.resolve({
        user: {
          userId: 'u1',
          email: 'a@b.com',
          userType: 0,
          status: 0,
          emailVerified: false,
          phoneVerified: false,
          twoFactorEnabled: false,
          createdAt: '',
          updatedAt: '',
        },
        permissions: [],
      }),
    assignRole: () => Promise.resolve({ success: true }),
    register: () => Promise.resolve({ userId: 'u1', message: 'ok' }),
    verifyEmail: () => Promise.resolve({ success: true }),
    resendVerification: () => Promise.resolve({ success: true }),
    forgotPassword: () => Promise.resolve({ success: true, message: '' }),
    resetPassword: () => Promise.resolve({ success: true, message: '' }),
    changePassword: () => Promise.resolve({ success: true, message: '' }),
    updateAccount: () =>
      Promise.resolve({
        user: {
          userId: 'u1',
          email: 'a@b.com',
          userType: 0,
          status: 0,
          emailVerified: false,
          phoneVerified: false,
          twoFactorEnabled: false,
          createdAt: '',
          updatedAt: '',
        },
      }),
    close: () => undefined,
  } as unknown as Parameters<typeof createServer>[0]['authClient'];
}

// Minimal invitation-accept-capable client stubs (ADS-961) — only the
// methods registerInvitationAcceptRoutes actually calls on a happy path.
function makeInvitationAcceptClients(): {
  authClient: Parameters<typeof createServer>[0]['authClient'];
  rescueClient: Parameters<typeof createServer>[0]['rescueClient'];
} {
  const authClient = {
    provisionInvitedUser: () => Promise.resolve({ user: { userId: 'usr-invited' } }),
    close: () => undefined,
  } as unknown as Parameters<typeof createServer>[0]['authClient'];
  const rescueClient = {
    getInvitationByToken: () =>
      Promise.resolve({ invitation: { email: 'invitee@example.com', rescueId: 'rsc-1' } }),
    acceptInvitation: () =>
      Promise.resolve({ staffMember: { userId: 'usr-invited', rescueId: 'rsc-1' } }),
    close: () => undefined,
  } as unknown as Parameters<typeof createServer>[0]['rescueClient'];
  return { authClient, rescueClient };
}

describe('createServer — per-route rate limit override (auth login)', () => {
  let server: FastifyInstance;

  const authClient = makeLoginAuthClient();

  afterEach(async () => {
    await server?.close();
  });

  it('per-route override (login max=10) is tighter than global max=100', async () => {
    // The global limit is set to 100; login's per-route override is 10.
    // We send 11 requests and expect the 11th to be 429.
    server = await createServer({
      config: {
        ...baseConfig,
        rateLimit: { redisUrl: undefined, max: 100, timeWindow: '1 minute' },
      },
      logger: quietLogger,
      authClient,
    });

    const postLogin = () =>
      server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'a@b.com', password: 'pw' },
      });

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const r = await postLogin();
      lastStatus = r.statusCode;
    }
    // The 11th request must have been rate-limited (login cap is 10/min).
    expect(lastStatus).toBe(429);
  });
});

// ADS-915: nginx now overwrites (not appends to) X-Forwarded-For at the
// public edge, and the gateway trusts exactly one hop (trustProxy: 1) —
// matching that single-nginx-hop topology. A client-supplied XFF entry
// beyond that one trusted hop must NOT be able to rotate req.ip and reset
// the per-IP login limiter.
describe('createServer — X-Forwarded-For trust boundary (ADS-915)', () => {
  let server: FastifyInstance;

  afterEach(async () => {
    await server?.close();
  });

  it('does not let a rotating client-supplied XFF prefix bypass the per-IP login limiter', async () => {
    server = await createServer({
      config: {
        ...baseConfig,
        rateLimit: { redisUrl: undefined, max: 100, timeWindow: '1 minute' },
      },
      logger: quietLogger,
      authClient: makeLoginAuthClient(),
    });

    // The rightmost entry (9.9.9.9) models what a correctly-configured nginx
    // sets — constant across requests. The leftmost entry rotates per
    // request, modelling an attacker who controls the client-supplied part
    // of the header. With trustProxy bounded to 1 hop, only the rightmost
    // entry may influence req.ip, so every request must resolve to the same
    // client and the limiter must still trip at the 11th request.
    const postLogin = (attackerClaimedIp: string) =>
      server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-forwarded-for': `${attackerClaimedIp}, 9.9.9.9` },
        payload: { email: 'a@b.com', password: 'pw' },
      });

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const r = await postLogin(`10.0.0.${i}`);
      lastStatus = r.statusCode;
    }
    expect(lastStatus).toBe(429);
  });
});

describe('createServer — Redis-down degraded mode', () => {
  let server: FastifyInstance;

  afterEach(async () => {
    await server?.close();
  });

  it('starts successfully and serves requests when Redis is unreachable', async () => {
    // Supply an unreachable Redis URL. The gateway must still boot and
    // handle requests (skipOnError fallback to in-memory store).
    server = await createServer({
      config: {
        ...baseConfig,
        rateLimit: {
          redisUrl: 'redis://127.0.0.1:19999', // nothing listening here
          max: 100,
          timeWindow: '1 minute',
        },
      },
      logger: quietLogger,
    });

    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(200);
  });
});

describe('createServer — Prometheus rate-limit counter', () => {
  it('exposes gateway_rate_limit_hits_total metric after a rejection', async () => {
    // Tight limit so we can trigger the counter without many requests.
    const server = await createServer({
      config: { ...baseConfig, rateLimit: { redisUrl: undefined, max: 1, timeWindow: '1 minute' } },
      logger: quietLogger,
    });
    try {
      // Use up the 1-request limit.
      await server.inject({ method: 'GET', url: '/health/simple' });
      // This should 429 and increment the counter.
      const limited = await server.inject({ method: 'GET', url: '/health/simple' });
      expect(limited.statusCode).toBe(429);

      const metrics = await server.inject({ method: 'GET', url: '/metrics' });
      expect(metrics.body).toContain('gateway_rate_limit_hits_total');
    } finally {
      await server.close();
    }
  });

  it('exposes gateway_login_email_ratelimit_trips_total metric after a per-email login trip (ADS-916)', async () => {
    const server = await createServer({
      config: {
        ...baseConfig,
        rateLimit: { redisUrl: undefined, max: 100, timeWindow: '1 minute' },
      },
      logger: quietLogger,
      authClient: makeLoginAuthClient(),
    });
    try {
      const postLogin = (ip: string) =>
        server.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          headers: { 'x-forwarded-for': ip },
          payload: { email: 'victim@example.com', password: 'guess' },
        });

      // The per-email login cap is 5/5min — spread across distinct IPs so
      // the per-IP limiter (10/min) doesn't trip first.
      for (let i = 0; i < 5; i++) {
        await postLogin(`20.0.0.${i}`);
      }
      const sixth = await postLogin('20.0.0.99');
      expect(sixth.statusCode).toBe(429);

      const metrics = await server.inject({ method: 'GET', url: '/metrics' });
      expect(metrics.body).toContain('gateway_login_email_ratelimit_trips_total');
    } finally {
      await server.close();
    }
  });

  it('exposes gateway_invitation_accept_ratelimit_trips_total metric after a per-token trip (ADS-961)', async () => {
    const { authClient, rescueClient } = makeInvitationAcceptClients();
    const server = await createServer({
      config: {
        ...baseConfig,
        rateLimit: { redisUrl: undefined, max: 100, timeWindow: '1 minute' },
      },
      logger: quietLogger,
      authClient,
      rescueClient,
    });
    try {
      const postAccept = (ip: string) =>
        server.inject({
          method: 'POST',
          url: '/api/v1/invitations/accept',
          headers: { 'x-forwarded-for': ip },
          payload: {
            token: 'shared-guessed-token',
            password: 'hunter22',
            firstName: 'Jo',
            lastName: 'Bloggs',
          },
        });

      // The per-token cap is 5/5min — spread across distinct IPs so the
      // per-IP limiter (10/min) doesn't trip first.
      for (let i = 0; i < 5; i++) {
        await postAccept(`21.0.0.${i}`);
      }
      const sixth = await postAccept('21.0.0.99');
      expect(sixth.statusCode).toBe(429);

      const metrics = await server.inject({ method: 'GET', url: '/metrics' });
      expect(metrics.body).toContain('gateway_invitation_accept_ratelimit_trips_total');
    } finally {
      await server.close();
    }
  });
});

// Domain routes register whenever their gRPC client is wired — there is
// no migration toggle anymore. A path whose client isn't wired, or that
// the gateway doesn't own, falls through to the 404 handler.
describe('createServer — domain route registration', () => {
  let server: FastifyInstance;

  // A stub applications client whose List resolves an empty page. Only
  // the List path is exercised here.
  const applicationsClient = {
    list: () => Promise.resolve({ applications: [] }),
  } as unknown as Parameters<typeof createServer>[0]['applicationsClient'];

  afterEach(async () => {
    await server?.close();
  });

  it('registers /api/v1/applications when the applications client is wired', async () => {
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
      applicationsClient,
    });
    const res = await server.inject({ method: 'GET', url: '/api/v1/applications' });
    // The gateway route served it — the view adapter wraps the (empty)
    // result in the frontend's `{ data }` envelope.
    expect(res.json()).toEqual({ data: [] });
  });

  it('404s /api/v1/applications when no applications client is wired', async () => {
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
    });
    const res = await server.inject({ method: 'GET', url: '/api/v1/applications' });
    expect(res.statusCode).toBe(404);
  });

  it('404s an /api/* path the gateway does not own', async () => {
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
      applicationsClient,
    });
    const res = await server.inject({ method: 'GET', url: '/api/v1/nonexistent' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });
});

// ---------------------------------------------------------------------------
// /docs gate — admin only when authClient is wired
// ---------------------------------------------------------------------------
//
// The authenticate hook strips x-user-* headers, validates the Bearer
// token, and stamps the principal back onto the request. A second
// onRequest hook (registered after authenticate) gates /docs by checking
// x-user-roles. /openapi.json stays open for SDK generation tooling.
describe('createServer — /docs gate (admin only)', () => {
  let server: FastifyInstance;

  // Minimal authClient stubs — only validateToken is called by the
  // authenticate middleware in this suite.

  function makeAuthClient(roles: number[]) {
    return {
      validateToken: () =>
        Promise.resolve({
          principal: {
            userId: 'u-test',
            roles,
            permissions: [],
            rescueId: '',
          },
        }),
      close: () => undefined,
    } as unknown as Parameters<typeof createServer>[0]['authClient'];
  }

  afterEach(async () => {
    await server?.close();
  });

  it('returns 403 for unauthenticated requests to /docs when authClient is wired', async () => {
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
      authClient: makeAuthClient([]), // stub — won't be called (no Bearer token)
    });
    const res = await server.inject({ method: 'GET', url: '/docs' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'forbidden' });
  });

  it('returns 403 for non-admin authenticated requests to /docs', async () => {
    // Role 1 = adopter — not admin
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
      authClient: makeAuthClient([1]),
    });
    const res = await server.inject({
      method: 'GET',
      url: '/docs',
      headers: { authorization: 'Bearer some-valid-token' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows admin users through to /docs', async () => {
    // Role 3 = admin
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
      authClient: makeAuthClient([3]),
    });
    const res = await server.inject({
      method: 'GET',
      url: '/docs',
      headers: { authorization: 'Bearer some-valid-token' },
    });
    // swaggerUi returns 200 (HTML) or 302 redirect — either way, not 403
    expect(res.statusCode).not.toBe(403);
  });

  it('allows super_admin users through to /docs', async () => {
    // Role 5 = super_admin
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
      authClient: makeAuthClient([5]),
    });
    const res = await server.inject({
      method: 'GET',
      url: '/docs',
      headers: { authorization: 'Bearer some-valid-token' },
    });
    expect(res.statusCode).not.toBe(403);
  });

  it('serves /openapi.json without authentication (stays open for SDK tooling)', async () => {
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
      authClient: makeAuthClient([]),
    });
    const res = await server.inject({ method: 'GET', url: '/openapi.json' });
    expect(res.statusCode).toBe(200);
  });

  it('leaves /docs open when no authClient is wired (dev / smoke-test mode)', async () => {
    server = await createServer({
      config: baseConfig,
      logger: quietLogger,
      // No authClient — authenticate middleware is skipped entirely
    });
    const res = await server.inject({ method: 'GET', url: '/docs' });
    expect(res.statusCode).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Security headers — Helmet (defence-in-depth alongside nginx)
// ---------------------------------------------------------------------------
describe('createServer — security headers (Helmet)', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = await createServer({ config: baseConfig, logger: quietLogger });
  });

  afterEach(async () => {
    await server.close();
  });

  it('sets x-content-type-options: nosniff on responses', async () => {
    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets x-frame-options on responses', async () => {
    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------
describe('createServer — CORS', () => {
  let server: FastifyInstance;

  afterEach(async () => {
    await server?.close();
  });

  it('includes access-control-allow-origin for a request from an allowed origin', async () => {
    server = await createServer({
      config: { ...baseConfig, cors: { origins: ['http://localhost:3000'] } },
      logger: quietLogger,
    });
    const res = await server.inject({
      method: 'GET',
      url: '/health/simple',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not include access-control-allow-origin for an unknown origin', async () => {
    server = await createServer({
      config: { ...baseConfig, cors: { origins: ['http://localhost:3000'] } },
      logger: quietLogger,
    });
    const res = await server.inject({
      method: 'GET',
      url: '/health/simple',
      headers: { origin: 'http://evil.example.com' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
