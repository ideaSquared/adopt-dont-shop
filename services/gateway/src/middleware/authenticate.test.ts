import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthV1, type ValidateTokenResponse } from '@adopt-dont-shop/proto';
import { verifyPrincipalToken } from '@adopt-dont-shop/service-bootstrap';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { __TEST_PUBLIC_PATH_PREFIXES, registerAuthenticate } from './authenticate.js';

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

function makeApp(authClient: AuthClient, principalSigningKey?: string): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  // Echo endpoint that returns the headers the middleware left on
  // the request. Anything spoofable that survives is a failure.
  app.get('/api/echo', async req => {
    const h = req.headers as Record<string, string | undefined>;
    return {
      userId: h['x-user-id'] ?? null,
      roles: h['x-user-roles'] ?? null,
      permissions: h['x-user-permissions'] ?? null,
      rescueId: h['x-rescue-id'] ?? null,
      principalToken: h['x-principal-token'] ?? null,
    };
  });
  app.get('/health/simple', async () => ({ ok: true }));
  app.post('/api/v1/auth/login', async () => ({ logged: 'in' }));
  app.post('/api/v1/auth/refresh-token', async () => ({ refreshed: true }));
  return registerAuthenticate(app, { authClient, logger: quietLogger, principalSigningKey }).then(
    () => app
  );
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
    const res = await app.inject({
      method: 'GET',
      url: '/api/echo',
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

  it('lists only real /api/v1/auth/* prefixes in the public allowlist', () => {
    for (const prefix of __TEST_PUBLIC_PATH_PREFIXES) {
      expect(prefix === '/health' || prefix.startsWith('/api/v1/auth/')).toBe(true);
    }
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
    const res = await app.inject({
      method: 'GET',
      url: '/api/echo',
      headers: { authorization: 'not-bearer-format' },
    });
    expect(res.statusCode).toBe(200);
    expect(validateMock).not.toHaveBeenCalled();
  });
});

describe('registerAuthenticate — no token on protected route', () => {
  it('passes through (strangler-fig: catch-all proxy / downstream service decides)', async () => {
    const { client } = makeAuthClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({ method: 'GET', url: '/api/echo' });
      expect(res.statusCode).toBe(200);
      // Headers absent because the strip step removed any potential
      // spoof, and the middleware didn't add any.
      const body = res.json() as ValidatedHeaders;
      expect(body['x-user-id']).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});

describe('registerAuthenticate — signed principal token (ADS-800)', () => {
  const SIGNING_KEY = 'gateway-test-signing-key';

  it('strips a client-supplied x-principal-token even when no signing key is configured', async () => {
    const { client } = makeAuthClient();
    const app = await makeApp(client);
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/echo',
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
      const res = await app.inject({ method: 'GET', url: '/api/echo' });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { principalToken: string | null }).principalToken).toBeNull();
      expect(validateMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
