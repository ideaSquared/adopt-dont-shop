import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthV1, type ValidateTokenResponse } from '@adopt-dont-shop/proto';
import { verifyPrincipalToken } from '@adopt-dont-shop/service-bootstrap';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { __TEST_INFRA_PUBLIC_PREFIXES, registerAuthenticate } from './authenticate.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as Parameters<typeof registerAuthenticate>[1]['logger'];

type ValidatedHeaders = {
  'x-user-id'?: string;
  'x-user-roles'?: string;
  'x-user-permissions'?: string;
  'x-rescue-id'?: string;
};

// Echo the identity headers the middleware left on the request. Anything
// spoofable that survives is a failure.
const echoHandler = async (req: { headers: Record<string, unknown> }) => {
  const h = req.headers as Record<string, string | undefined>;
  return {
    userId: h['x-user-id'] ?? null,
    roles: h['x-user-roles'] ?? null,
    permissions: h['x-user-permissions'] ?? null,
    rescueId: h['x-rescue-id'] ?? null,
    principalToken: h['x-principal-token'] ?? null,
  };
};

async function makeApp(
  authClient: AuthClient,
  principalSigningKey?: string,
  rescueClient?: RescueClient
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  // Cookie parsing (ADS-919) — the middleware falls back to the
  // `accessToken` cookie when no Authorization header is present.
  await app.register(cookie);
  // Protected echo — no `config.public`, so the ADS-1255 backstop 401s it
  // when no token is present.
  app.get('/api/echo', echoHandler);
  // Public echo — opts in via `config.public`, mirroring a real public route,
  // so a tokenless request reaches the handler (and we can still assert the
  // header-strip ran).
  app.get('/api/public-echo', { config: { public: true } }, echoHandler);
  app.get('/health/simple', async () => ({ ok: true }));
  // Infra endpoints reachable via the INFRA_PUBLIC_PREFIXES exception (they're
  // registered by shared packages in production, so they carry no config.public
  // and must pass on prefix alone).
  app.get('/metrics', async () => 'ok');
  app.get('/openapi.json', async () => ({ openapi: '3.0.0' }));
  // Auth mint/verify routes are public in production (config.public); mirror
  // that here so the validate-but-don't-block behaviour is exercised.
  app.post('/api/v1/auth/login', { config: { public: true } }, async () => ({ logged: 'in' }));
  app.post('/api/v1/auth/refresh-token', { config: { public: true } }, async () => ({
    refreshed: true,
  }));
  await registerAuthenticate(app, {
    authClient,
    logger: quietLogger,
    principalSigningKey,
    rescueClient,
  });
  return app;
}

// Minimal RescueClient stub — the enrichment only ever calls
// getMyStaffMembership, so the rest of the surface is left unimplemented.
function makeRescueClient(impl: () => Promise<unknown>): {
  client: RescueClient;
  mock: ReturnType<typeof vi.fn>;
} {
  const mock = vi.fn(impl);
  const client = { getMyStaffMembership: mock } as unknown as RescueClient;
  return { client, mock };
}

function makeAuthClient(): { client: AuthClient; validateMock: ReturnType<typeof vi.fn> } {
  const validateMock = vi.fn();
  const client: AuthClient = {
    validateToken: validateMock,
    close: vi.fn(),
  };
  return { client, validateMock };
}

const VALIDATED_RES: ValidateTokenResponse = {
  principal: {
    userId: 'usr-1',
    roles: [AuthV1.UserRole.USER_ROLE_RESCUE_STAFF, AuthV1.UserRole.USER_ROLE_ADMIN],
    permissions: ['pets.read', 'pets.update'],
    rescueId: 'rsc-1',
  },
  expiresAt: '2026-06-05T18:30:00Z',
};

describe('registerAuthenticate — header spoofing', () => {
  let app: FastifyInstance;
  let validateMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeAuthClient();
    validateMock = m.validateMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('strips client-supplied x-user-* headers when no Authorization is present', async () => {
    // Public route so the tokenless request reaches the echo handler (a
    // protected route would be 401'd by the ADS-1255 backstop before the
    // handler runs); the strip must still have happened.
    const res = await app.inject({
      method: 'GET',
      url: '/api/public-echo',
      headers: {
        'x-user-id': 'attacker',
        'x-user-roles': 'super_admin',
        'x-user-permissions': 'admin.security.manage',
        'x-rescue-id': 'rsc-attacker',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as ValidatedHeaders;
    expect(body['x-user-id']).toBeUndefined();
    expect(body['x-user-roles']).toBeUndefined();
    expect(body['x-user-permissions']).toBeUndefined();
    expect(body['x-rescue-id']).toBeUndefined();
    // Never even called ValidateToken — no Authorization header.
    expect(validateMock).not.toHaveBeenCalled();
  });

  it('replaces client-supplied x-user-* with the validated principal when Authorization is present', async () => {
    validateMock.mockResolvedValueOnce(VALIDATED_RES);

    const res = await app.inject({
      method: 'GET',
      url: '/api/echo',
      headers: {
        authorization: 'Bearer good.token',
        'x-user-id': 'attacker',
        'x-user-roles': 'super_admin',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      userId: string;
      roles: string;
      permissions: string;
      rescueId: string;
    };
    expect(body.userId).toBe('usr-1');
    expect(body.roles).toBe('rescue_staff,admin');
    expect(body.permissions).toBe('pets.read,pets.update');
    expect(body.rescueId).toBe('rsc-1');
  });
});

describe('registerAuthenticate — accessToken cookie fallback (ADS-919)', () => {
  let app: FastifyInstance;
  let validateMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeAuthClient();
    validateMock = m.validateMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('authenticates via the httpOnly accessToken cookie when no Authorization header is present', async () => {
    validateMock.mockResolvedValueOnce(VALIDATED_RES);

    const res = await app.inject({
      method: 'GET',
      url: '/api/echo',
      headers: { cookie: 'accessToken=cookie.jwt' },
    });

    expect(res.statusCode).toBe(200);
    expect(validateMock).toHaveBeenCalledWith({ accessToken: 'cookie.jwt' }, expect.anything());
    const body = res.json() as { userId: string | null };
    expect(body.userId).toBe('usr-1');
  });

  it('prefers the Authorization header over the accessToken cookie when both are present', async () => {
    validateMock.mockResolvedValueOnce(VALIDATED_RES);

    await app.inject({
      method: 'GET',
      url: '/api/echo',
      headers: {
        authorization: 'Bearer header.jwt',
        cookie: 'accessToken=cookie.jwt',
      },
    });

    expect(validateMock).toHaveBeenCalledWith({ accessToken: 'header.jwt' }, expect.anything());
  });

  it('401s a protected path with an invalid accessToken cookie', async () => {
    validateMock.mockRejectedValueOnce(Object.assign(new Error('bad token'), { code: 16 }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/echo',
      headers: { cookie: 'accessToken=expired.jwt' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('passes through with no principal when neither an Authorization header nor a cookie is present (public route)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public-echo' });

    expect(res.statusCode).toBe(200);
    expect(validateMock).not.toHaveBeenCalled();
    const body = res.json() as { userId: string | null };
    expect(body.userId).toBeNull();
  });
});

describe('registerAuthenticate — rescueId enrichment (ADS-863)', () => {
  // Distinct userIds per test so the module-level memoisation cache doesn't
  // bleed one test's resolved rescueId into the next.
  const staffNoRescue = (userId: string): ValidateTokenResponse => ({
    principal: {
      userId,
      roles: [AuthV1.UserRole.USER_ROLE_RESCUE_STAFF],
      permissions: ['pets.create'],
      rescueId: '',
    },
    expiresAt: '2026-06-05T18:30:00Z',
  });

  it('resolves and stamps x-rescue-id for a rescue-staff principal that lacks one', async () => {
    const { client, validateMock } = makeAuthClient();
    validateMock.mockResolvedValueOnce(staffNoRescue('usr-rescue-a'));
    const { client: rescueClient, mock } = makeRescueClient(async () => ({
      staffMember: { rescueId: 'rsc-resolved' },
    }));
    const app = await makeApp(client, undefined, rescueClient);
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/echo',
        headers: { authorization: 'Bearer good.token' },
      });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { rescueId: string | null }).rescueId).toBe('rsc-resolved');
      expect(mock).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it('proceeds without x-rescue-id when the lookup finds no membership (fail-open)', async () => {
    const { client, validateMock } = makeAuthClient();
    validateMock.mockResolvedValueOnce(staffNoRescue('usr-rescue-b'));
    // grpc-js status.NOT_FOUND = 5
    const { client: rescueClient } = makeRescueClient(async () => {
      throw Object.assign(new Error('no membership'), { code: 5 });
    });
    const app = await makeApp(client, undefined, rescueClient);
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/echo',
        headers: { authorization: 'Bearer good.token' },
      });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { rescueId: string | null }).rescueId).toBeNull();
    } finally {
      await app.close();
    }
  });

  it('does not call the rescue service for a non-rescue principal', async () => {
    const { client, validateMock } = makeAuthClient();
    validateMock.mockResolvedValueOnce({
      principal: {
        userId: 'usr-adopter',
        roles: [AuthV1.UserRole.USER_ROLE_ADOPTER],
        permissions: ['pets.read'],
        rescueId: '',
      },
      expiresAt: '2026-06-05T18:30:00Z',
    });
    const { client: rescueClient, mock } = makeRescueClient(async () => ({
      staffMember: { rescueId: 'should-not-be-used' },
    }));
    const app = await makeApp(client, undefined, rescueClient);
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/echo',
        headers: { authorization: 'Bearer good.token' },
      });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { rescueId: string | null }).rescueId).toBeNull();
      expect(mock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});

describe('registerAuthenticate — public paths', () => {
  let app: FastifyInstance;
  let validateMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeAuthClient();
    validateMock = m.validateMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('does not call ValidateToken for /health/simple', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(200);
    expect(validateMock).not.toHaveBeenCalled();
  });

  it('passes through /api/v1/auth/login even when ValidateToken would reject the token', async () => {
    validateMock.mockRejectedValueOnce(Object.assign(new Error('expired'), { code: 16 }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { authorization: 'Bearer expired.token' },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
  });

  // Regression: the public allowlist must match the REAL registered route
  // prefix (`/api/v1/auth/*`). A stale access token attached to a
  // refresh-token call must not 401 before the handler runs, or
  // token-based clients can never recover an expired session.
  it('passes through /api/v1/auth/refresh-token when an expired token is attached', async () => {
    validateMock.mockRejectedValueOnce(Object.assign(new Error('expired'), { code: 16 }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh-token',
      headers: { authorization: 'Bearer expired.token' },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ refreshed: true });
  });

  it('exposes only the shared-infra prefixes as the non-config public exception', () => {
    // The /api/v1/* surface is public-gated per-route via config.public; only
    // the shared-package infra endpoints are matched by prefix, and each must
    // be collision-free (no protected route lives under these).
    expect([...__TEST_INFRA_PUBLIC_PREFIXES]).toEqual(['/health', '/metrics', '/openapi.json']);
  });

  it('lets tokenless requests through to the infra endpoints via the prefix exception', async () => {
    for (const url of ['/health/simple', '/metrics', '/openapi.json']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(200);
    }
    expect(validateMock).not.toHaveBeenCalled();
  });
});

describe('registerAuthenticate — token validation errors', () => {
  let app: FastifyInstance;
  let validateMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeAuthClient();
    validateMock = m.validateMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 on a protected route when ValidateToken returns UNAUTHENTICATED', async () => {
    // grpc-js status.UNAUTHENTICATED = 16
    validateMock.mockRejectedValueOnce(Object.assign(new Error('expired'), { code: 16 }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/echo',
      headers: { authorization: 'Bearer expired.token' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'invalid token' });
  });

  it('returns 500 on a protected route when ValidateToken throws an unrelated error', async () => {
    validateMock.mockRejectedValueOnce(new Error('network unreachable'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/echo',
      headers: { authorization: 'Bearer bad.token' },
    });

    expect(res.statusCode).toBe(500);
  });

  it('ignores a malformed Authorization header (no Bearer prefix)', async () => {
    // A malformed header yields no token, so on a public route the request
    // proceeds unauthenticated and ValidateToken is never called with garbage.
    // (On a protected route the same no-token state is 401'd by the backstop —
    // covered separately.)
    const res = await app.inject({
      method: 'GET',
      url: '/api/public-echo',
      headers: { authorization: 'not-bearer-format' },
    });
    expect(res.statusCode).toBe(200);
    expect(validateMock).not.toHaveBeenCalled();
  });
});

describe('registerAuthenticate — tokenless backstop (ADS-1255)', () => {
  let app: FastifyInstance;
  let validateMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeAuthClient();
    validateMock = m.validateMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('401s a tokenless request to a protected route (no config.public)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/echo' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'authentication required' });
    // Rejected before any upstream call — no token to validate.
    expect(validateMock).not.toHaveBeenCalled();
  });

  it('passes a tokenless request through to a route marked config.public', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public-echo' });

    expect(res.statusCode).toBe(200);
    expect(validateMock).not.toHaveBeenCalled();
    // The strip still ran; no principal was stamped.
    expect((res.json() as ValidatedHeaders)['x-user-id']).toBeUndefined();
  });

  it('401s a tokenless mutation even when a sibling GET on the same path is public', async () => {
    // Distinct from the public GET /api/public-echo above: a route that did
    // not opt in stays protected. This is the property a URL-prefix allowlist
    // could not provide (GET public + POST protected on one path).
    const res = await app.inject({ method: 'POST', url: '/api/echo' });
    expect(res.statusCode).toBe(401);
  });
});

describe('registerAuthenticate — signed principal token (ADS-800)', () => {
  const SIGNING_KEY = 'gateway-test-signing-key';

  it('strips a client-supplied x-principal-token even when no signing key is configured', async () => {
    const { client } = makeAuthClient();
    const app = await makeApp(client);
    try {
      // Public route: a tokenless request reaches the handler so we can assert
      // the forged principal token was stripped (a protected route would 401).
      const res = await app.inject({
        method: 'GET',
        url: '/api/public-echo',
        headers: { 'x-principal-token': 'forged.token' },
      });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { principalToken: string | null }).principalToken).toBeNull();
    } finally {
      await app.close();
    }
  });

  it('stamps a verifiable x-principal-token over the validated principal when a key is configured', async () => {
    const { client, validateMock } = makeAuthClient();
    validateMock.mockResolvedValueOnce(VALIDATED_RES);
    const app = await makeApp(client, SIGNING_KEY);
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/echo',
        headers: {
          authorization: 'Bearer good.token',
          // Forged token alongside a valid bearer: must be replaced.
          'x-principal-token': 'forged.token',
        },
      });
      expect(res.statusCode).toBe(200);
      const { principalToken } = res.json() as { principalToken: string | null };
      expect(principalToken).not.toBeNull();
      expect(principalToken).not.toBe('forged.token');
      const principal = verifyPrincipalToken(String(principalToken), SIGNING_KEY);
      expect(principal.userId).toBe('usr-1');
      expect(principal.roles).toEqual(['rescue_staff', 'admin']);
      expect(principal.permissions).toEqual(['pets.read', 'pets.update']);
      expect(principal.rescueId).toBe('rsc-1');
    } finally {
      await app.close();
    }
  });

  it('does not stamp x-principal-token when no signing key is configured', async () => {
    const { client, validateMock } = makeAuthClient();
    validateMock.mockResolvedValueOnce(VALIDATED_RES);
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/echo',
        headers: { authorization: 'Bearer good.token' },
      });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { principalToken: string | null }).principalToken).toBeNull();
    } finally {
      await app.close();
    }
  });

  it('does not stamp x-principal-token for an unauthenticated request even with a key', async () => {
    const { client, validateMock } = makeAuthClient();
    const app = await makeApp(client, SIGNING_KEY);
    try {
      // Public route so the tokenless request is not backstopped; even so, with
      // no validated principal nothing is signed.
      const res = await app.inject({ method: 'GET', url: '/api/public-echo' });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { principalToken: string | null }).principalToken).toBeNull();
      expect(validateMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
