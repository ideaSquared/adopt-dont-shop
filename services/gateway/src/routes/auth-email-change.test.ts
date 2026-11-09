// Behaviour tests for the verified email-change routes:
//   POST /api/v1/users/me/email-change     (authenticated, step-up re-auth)
//   POST /api/v1/auth/confirm-email-change (public, the token is the credential)

import { Metadata, status as grpcStatus, type ServiceError } from '@grpc/grpc-js';
import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { AUTH_RATE_LIMITS, registerAuthRoutes } from './auth.js';

const grpcError = (code: grpcStatus, details: string): ServiceError =>
  Object.assign(new Error(details), { code, details, metadata: new Metadata() });

function makeClient() {
  const requestEmailChange = vi.fn();
  const confirmEmailChange = vi.fn();
  return {
    requestEmailChange,
    confirmEmailChange,
    client: { requestEmailChange, confirmEmailChange, close: vi.fn() } as unknown as AuthClient,
  };
}

async function makeApp(client: AuthClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cookie);
  await registerAuthRoutes(app, { client });
  return app;
}

// Captures the route config each URL is registered with.
async function routeConfigs(client: AuthClient): Promise<Map<string, Record<string, unknown>>> {
  const configs = new Map<string, Record<string, unknown>>();
  const probe = Fastify({ logger: false });
  probe.addHook('onRoute', route => {
    configs.set(`${route.method} ${route.url}`, (route.config ?? {}) as Record<string, unknown>);
  });
  await registerAuthRoutes(probe, { client });
  await probe.close();
  return configs;
}

describe('POST /api/v1/users/me/email-change', () => {
  let m: ReturnType<typeof makeClient>;
  let app: FastifyInstance;

  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  const post = (payload: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/users/me/email-change',
      headers: { 'x-user-id': 'usr-1' },
      payload,
    });

  it('is authenticated (not public) and carries its own rate limit', async () => {
    const config = (await routeConfigs(m.client)).get('POST /api/v1/users/me/email-change');
    expect(config?.public).toBeUndefined();
    expect(config?.rateLimit).toEqual(AUTH_RATE_LIMITS.requestEmailChange);
  });

  it('answers 202 { success: true } once the credentials check out', async () => {
    m.requestEmailChange.mockResolvedValueOnce({ verified: true, twoFactorRequired: false });

    const res = await post({
      newEmail: 'new@example.com',
      password: 'hunter22',
      twoFactorToken: '123456',
    });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ success: true });
    expect(m.requestEmailChange).toHaveBeenCalledWith(
      { newEmail: 'new@example.com', password: 'hunter22', twoFactorToken: '123456' },
      expect.any(Metadata)
    );
  });

  it('answers a taken address with the same 202 (the auth service reports it as accepted)', async () => {
    m.requestEmailChange.mockResolvedValueOnce({ verified: true, twoFactorRequired: false });

    const res = await post({ newEmail: 'taken@example.com', password: 'hunter22' });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ success: true });
  });

  it.each(['invalid_email', 'email_unchanged'])(
    'answers 400 { success: false, error: "%s" }',
    async error => {
      m.requestEmailChange.mockRejectedValueOnce(grpcError(grpcStatus.INVALID_ARGUMENT, error));

      const res = await post({ newEmail: 'whatever', password: 'hunter22' });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ success: false, error });
    }
  );

  it('answers 401 credential_verification_failed for a wrong password or code', async () => {
    m.requestEmailChange.mockResolvedValueOnce({ verified: false, twoFactorRequired: false });

    const res = await post({ newEmail: 'new@example.com', password: 'wrong' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ success: false, error: 'credential_verification_failed' });
  });

  it('answers 401 two_factor_required when a 2FA account sent no code', async () => {
    m.requestEmailChange.mockResolvedValueOnce({ verified: false, twoFactorRequired: true });

    const res = await post({ newEmail: 'new@example.com', password: 'hunter22' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ success: false, error: 'two_factor_required' });
  });

  it('answers 401 credential_verification_failed without calling the auth service when the password is missing', async () => {
    const res = await post({ newEmail: 'new@example.com' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ success: false, error: 'credential_verification_failed' });
    expect(m.requestEmailChange).not.toHaveBeenCalled();
  });

  it('forwards a missing address as empty so the auth service answers invalid_email', async () => {
    m.requestEmailChange.mockRejectedValueOnce(
      grpcError(grpcStatus.INVALID_ARGUMENT, 'invalid_email')
    );

    const res = await post({ password: 'hunter22' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ success: false, error: 'invalid_email' });
    expect(m.requestEmailChange).toHaveBeenCalledWith(
      { newEmail: '', password: 'hunter22', twoFactorToken: undefined },
      expect.any(Metadata)
    );
  });

  it('maps any other upstream failure through the shared gRPC error mapping', async () => {
    m.requestEmailChange.mockRejectedValueOnce(grpcError(grpcStatus.UNAVAILABLE, 'down'));

    const res = await post({ newEmail: 'new@example.com', password: 'hunter22' });

    expect(res.statusCode).toBe(503);
  });
});

describe('POST /api/v1/auth/confirm-email-change', () => {
  let m: ReturnType<typeof makeClient>;
  let app: FastifyInstance;

  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  const post = (payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: '/api/v1/auth/confirm-email-change', payload });

  it('is public and rate limited like verify-email', async () => {
    const config = (await routeConfigs(m.client)).get('POST /api/v1/auth/confirm-email-change');
    expect(config?.public).toBe(true);
    expect(config?.rateLimit).toEqual(AUTH_RATE_LIMITS.confirmEmailChange);
  });

  it('answers 200 { success: true } and forwards the token', async () => {
    m.confirmEmailChange.mockResolvedValueOnce({});

    const res = await post({ token: 'tok-123' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
    expect(m.confirmEmailChange).toHaveBeenCalledWith({ token: 'tok-123' }, expect.any(Metadata));
  });

  it('answers 400 invalid_or_expired_token for an unknown, used or expired token', async () => {
    m.confirmEmailChange.mockRejectedValueOnce(
      grpcError(grpcStatus.INVALID_ARGUMENT, 'invalid_or_expired_token')
    );

    const res = await post({ token: 'stale' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ success: false, error: 'invalid_or_expired_token' });
  });

  it.each([
    ['a missing token', {}],
    ['an empty token', { token: '' }],
    ['a non-string token', { token: 42 }],
    ['an overlong token', { token: 'x'.repeat(513) }],
  ])(
    'answers 400 invalid_or_expired_token without calling the auth service for %s',
    async (_label, payload) => {
      const res = await post(payload);

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ success: false, error: 'invalid_or_expired_token' });
      expect(m.confirmEmailChange).not.toHaveBeenCalled();
    }
  );

  it('answers 409 email_in_use when the address was taken meanwhile', async () => {
    m.confirmEmailChange.mockRejectedValueOnce(
      grpcError(grpcStatus.ALREADY_EXISTS, 'email_in_use')
    );

    const res = await post({ token: 'tok-123' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ success: false, error: 'email_in_use' });
  });

  it('maps any other upstream failure through the shared gRPC error mapping', async () => {
    m.confirmEmailChange.mockRejectedValueOnce(grpcError(grpcStatus.INTERNAL, 'boom'));

    const res = await post({ token: 'tok-123' });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'internal_error' });
  });
});
