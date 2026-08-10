import type { NatsConnection } from 'nats';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { status as grpcStatus } from '@grpc/grpc-js';

import { GDPR_ERASURE_REQUESTED } from '@adopt-dont-shop/events';

import type { AuditClient } from '../grpc-clients/audit-client.js';
import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerGdprRoutes, type ErasureStore } from './gdpr.js';

// The password the step-up check (ADS-1205) requires in every erasure POST.
const PASSWORD = 'hunter2';

function fakeNats() {
  const published: Array<{ subject: string; data: string }> = [];
  // The route publishes the request through JetStream now. The fake decodes
  // the Uint8Array back to a string so the existing payload assertions hold,
  // and returns a PubAck so the awaited publish resolves.
  const jsPublish = vi.fn(async (subject: string, data: Uint8Array) => {
    published.push({ subject, data: new TextDecoder().decode(data) });
    return { stream: 'DOMAIN_EVENTS', seq: published.length, duplicate: false };
  });
  const nats = {
    jetstream: () => ({ publish: jsPublish }),
  } as unknown as NatsConnection;
  return { nats, published };
}

function fakeNatsFailingPublish() {
  const jsPublish = vi.fn(async () => {
    throw new Error('NATS broker unreachable');
  });
  const nats = {
    jetstream: () => ({ publish: jsPublish }),
  } as unknown as NatsConnection;
  return { nats };
}

function fakeRedis() {
  const store = new Map<string, string>();
  const redis: ErasureStore = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
  };
  return { redis, store };
}

function fakeAuditClient(): { client: AuditClient; getGdpr: ReturnType<typeof vi.fn> } {
  const getGdpr = vi.fn();
  const client = { getGdprErasureRequest: getGdpr } as unknown as AuditClient;
  return { client, getGdpr };
}

// Step-up auth double. Defaults to "credentials verified"; individual tests
// override the verify verdict or the getMe email as needed.
function makeAuthClient(
  opts: {
    verifyCredentials?: ReturnType<typeof vi.fn>;
    getMe?: ReturnType<typeof vi.fn>;
  } = {}
): {
  client: AuthClient;
  verifyCredentials: ReturnType<typeof vi.fn>;
  getMe: ReturnType<typeof vi.fn>;
} {
  const verifyCredentials =
    opts.verifyCredentials ??
    vi.fn().mockResolvedValue({ verified: true, twoFactorRequired: false });
  const getMe = opts.getMe ?? vi.fn().mockResolvedValue({ user: { email: 'erased@example.com' } });
  const client = { verifyCredentials, getMe } as unknown as AuthClient;
  return { client, verifyCredentials, getMe };
}

describe('POST /api/v1/users/me/erasure-request', () => {
  let app: FastifyInstance;
  let published: Array<{ subject: string; data: string }>;
  let verifyCredentials: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { nats, published: p } = fakeNats();
    published = p;
    const auth = makeAuthClient();
    verifyCredentials = auth.verifyCredentials;
    await registerGdprRoutes(app, { nats, authClient: auth.client });
  });

  afterEach(async () => {
    await app.close();
  });

  it('verifies credentials, publishes gdpr.erasureRequested and returns 202 + correlationId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { reason: 'closing account', password: PASSWORD },
    });
    expect(res.statusCode).toBe(202);
    const body = res.json() as { success: boolean; correlationId: string };
    expect(body.success).toBe(true);
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/);

    // The credential check ran before anything was published.
    expect(verifyCredentials).toHaveBeenCalledTimes(1);
    expect(verifyCredentials.mock.calls[0][0]).toMatchObject({ password: PASSWORD });

    expect(published).toHaveLength(1);
    expect(published[0].subject).toBe(GDPR_ERASURE_REQUESTED);
    const envelope = JSON.parse(published[0].data) as {
      payload: { userId: string; reason: string; correlationId: string };
    };
    expect(envelope.payload.userId).toBe('usr-1');
    expect(envelope.payload.reason).toBe('closing account');
    expect(envelope.payload.correlationId).toBe(body.correlationId);
  });

  it('forwards a supplied twoFactorToken to VerifyCredentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: PASSWORD, twoFactorToken: '123456' },
    });
    expect(res.statusCode).toBe(202);
    expect(verifyCredentials.mock.calls[0][0]).toMatchObject({
      password: PASSWORD,
      twoFactorToken: '123456',
    });
  });

  it('refuses without an x-user-id header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    expect(published).toHaveLength(0);
    expect(verifyCredentials).not.toHaveBeenCalled();
  });

  it('does not require a reason', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: PASSWORD },
    });
    expect(res.statusCode).toBe(202);
    const envelope = JSON.parse(published[0].data) as {
      payload: { reason?: string };
    };
    expect(envelope.payload.reason).toBeUndefined();
  });

  it('returns 401 and publishes nothing when no password is supplied', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { reason: 'closing account' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: 'credential_verification_failed' });
    // No round-trip and no saga when the password is missing.
    expect(verifyCredentials).not.toHaveBeenCalled();
    expect(published).toHaveLength(0);
  });

  it('returns 401 and publishes nothing when the credentials are rejected', async () => {
    verifyCredentials.mockResolvedValue({ verified: false, twoFactorRequired: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: 'credential_verification_failed' });
    expect(published).toHaveLength(0);
  });

  it('returns 401 two_factor_required when the account needs a TOTP code', async () => {
    verifyCredentials.mockResolvedValue({ verified: false, twoFactorRequired: true });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: PASSWORD },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ success: false, error: 'two_factor_required' });
    expect(published).toHaveLength(0);
  });
});

describe('POST /api/v1/users/me/erasure-request — auth client unavailable', () => {
  let app: FastifyInstance;
  let published: Array<{ subject: string; data: string }>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { nats, published: p } = fakeNats();
    published = p;
    // No authClient wired — step-up cannot run.
    await registerGdprRoutes(app, { nats });
  });

  afterEach(async () => {
    await app.close();
  });

  it('fails closed with 500 and publishes nothing when the auth client is absent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: PASSWORD },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ success: false, error: 'verification_unavailable' });
    expect(published).toHaveLength(0);
  });
});

describe('POST /api/v1/users/me/erasure-request — broker failure', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { nats } = fakeNatsFailingPublish();
    await registerGdprRoutes(app, { nats, authClient: makeAuthClient().client });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 503 service_unavailable when the JetStream publish throws', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: PASSWORD },
    });
    expect(res.statusCode).toBe(503);
    const body = res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('service_unavailable');
  });
});

describe('POST /api/v1/users/me/erasure-request — idempotency', () => {
  let app: FastifyInstance;
  let published: Array<{ subject: string; data: string }>;
  let redisSet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { nats, published: p } = fakeNats();
    published = p;
    const { redis } = fakeRedis();
    redisSet = redis.set as ReturnType<typeof vi.fn>;
    await registerGdprRoutes(app, { nats, authClient: makeAuthClient().client, redis });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the original correlationId on a second POST for the same user', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': '11111111-1111-1111-1111-111111111111' },
      payload: { password: PASSWORD },
    });
    expect(first.statusCode).toBe(202);
    const { correlationId, requestedAt } = first.json() as {
      correlationId: string;
      requestedAt: string;
    };

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': '11111111-1111-1111-1111-111111111111' },
      payload: { password: PASSWORD },
    });
    expect(second.statusCode).toBe(202);
    const secondBody = second.json() as { correlationId: string; requestedAt: string };
    expect(secondBody.correlationId).toBe(correlationId);
    expect(secondBody.requestedAt).toBe(requestedAt);

    // Only one JetStream publish — the second POST was served from cache.
    expect(published).toHaveLength(1);
  });

  it('rejects a non-UUID x-user-id rather than building an unvalidated Redis key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: PASSWORD },
    });
    expect(res.statusCode).toBe(500);
  });

  it('does not deduplicate across different users', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': '22222222-2222-2222-2222-222222222222' },
      payload: { password: PASSWORD },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': '33333333-3333-3333-3333-333333333333' },
      payload: { password: PASSWORD },
    });
    expect(res.statusCode).toBe(202);
    expect(published).toHaveLength(2);
    const idA = (JSON.parse(published[0].data) as { payload: { correlationId: string } }).payload
      .correlationId;
    const idB = (JSON.parse(published[1].data) as { payload: { correlationId: string } }).payload
      .correlationId;
    expect(idA).not.toBe(idB);
  });

  it('writes no idempotency key when the credential check fails', async () => {
    const auth = makeAuthClient({
      verifyCredentials: vi.fn().mockResolvedValue({ verified: false, twoFactorRequired: false }),
    });
    const failApp = Fastify({ logger: false });
    const { nats } = fakeNats();
    const { redis } = fakeRedis();
    await registerGdprRoutes(failApp, { nats, authClient: auth.client, redis });
    try {
      const res = await failApp.inject({
        method: 'POST',
        url: '/api/v1/users/me/erasure-request',
        headers: { 'x-user-id': '44444444-4444-4444-4444-444444444444' },
        payload: { password: 'wrong-password' },
      });
      expect(res.statusCode).toBe(401);
      expect(redis.set).not.toHaveBeenCalled();
    } finally {
      await failApp.close();
    }
    // The suite-level redis (a different instance) is untouched too.
    expect(redisSet).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/users/me/erasure-request — rate-limit', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    // Register the global plugin so per-route config.rateLimit takes effect.
    await app.register(rateLimit, { global: true, max: 1000, timeWindow: '1 minute' });
    const { nats } = fakeNats();
    const { redis } = fakeRedis();
    await registerGdprRoutes(app, { nats, authClient: makeAuthClient().client, redis });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 after the per-user limit (5/hour) is exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/erasure-request',
        headers: { 'x-user-id': '44444444-4444-4444-4444-444444444444' },
        payload: { password: PASSWORD },
      });
      expect(res.statusCode).toBe(202);
    }
    const limited = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': '44444444-4444-4444-4444-444444444444' },
      payload: { password: PASSWORD },
    });
    expect(limited.statusCode).toBe(429);
  });

  it('rate-limits per user — a different user is not affected', async () => {
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/erasure-request',
        headers: { 'x-user-id': '55555555-5555-5555-5555-555555555555' },
        payload: { password: PASSWORD },
      });
    }
    const other = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': '66666666-6666-6666-6666-666666666666' },
      payload: { password: PASSWORD },
    });
    expect(other.statusCode).toBe(202);
  });
});

describe('GET /api/v1/users/me/erasure-request/:correlationId', () => {
  let app: FastifyInstance;
  let getGdpr: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { nats } = fakeNats();
    const { client, getGdpr: g } = fakeAuditClient();
    getGdpr = g;
    await registerGdprRoutes(app, { nats, auditClient: client });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the saga row + parses completionsJson into a real object', async () => {
    getGdpr.mockResolvedValue({
      request: {
        correlationId: 'corr-1',
        userId: 'usr-1',
        reason: 'leaving',
        requestedAt: '2026-06-09T12:00:00Z',
        completionsJson: '{"auth":{"recordsErased":7,"completedAt":"2026-06-09T12:01:00Z"}}',
        completedAt: undefined,
        createdAt: '2026-06-09T12:00:00Z',
        updatedAt: '2026-06-09T12:01:00Z',
      },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/erasure-request/corr-1',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: { completions: Record<string, unknown>; correlationId: string };
    };
    expect(body.data.correlationId).toBe('corr-1');
    expect(body.data.completions).toEqual({
      auth: { recordsErased: 7, completedAt: '2026-06-09T12:01:00Z' },
    });
  });

  it('maps gRPC NOT_FOUND → 404', async () => {
    getGdpr.mockRejectedValue({ code: grpcStatus.NOT_FOUND, details: 'no row' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/erasure-request/corr-x',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('maps gRPC PERMISSION_DENIED → 403', async () => {
    getGdpr.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED, details: 'no' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/erasure-request/corr-1',
      headers: { 'x-user-id': 'usr-2' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/v1/users/me/erasure-request — email resolution', () => {
  let app: FastifyInstance;
  let published: Array<{ subject: string; data: string }>;

  afterEach(async () => {
    await app.close();
  });

  const erasedEmail = (): string | undefined => {
    const env = JSON.parse(published[0].data) as { payload: { email?: string } };
    return env.payload.email;
  };

  it('resolves the email from auth.getMe and carries it on the payload', async () => {
    app = Fastify({ logger: false });
    const { nats, published: p } = fakeNats();
    published = p;
    const getMe = vi.fn().mockResolvedValue({ user: { email: 'erased@example.com' } });
    await registerGdprRoutes(app, { nats, authClient: makeAuthClient({ getMe }).client });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: PASSWORD },
    });
    expect(res.statusCode).toBe(202);
    // The email is resolved against the requesting principal's metadata.
    expect(getMe).toHaveBeenCalledTimes(1);
    expect(erasedEmail()).toBe('erased@example.com');
  });

  it('publishes a userId-only event when the auth lookup fails (erasure not blocked)', async () => {
    app = Fastify({ logger: false });
    const { nats, published: p } = fakeNats();
    published = p;
    const getMe = vi.fn().mockRejectedValue(new Error('auth unavailable'));
    await registerGdprRoutes(app, { nats, authClient: makeAuthClient({ getMe }).client });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { password: PASSWORD },
    });
    expect(res.statusCode).toBe(202);
    expect(erasedEmail()).toBeUndefined();
  });
});
