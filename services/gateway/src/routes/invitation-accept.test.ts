import { status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { createEmailRateLimiter } from './email-rate-limiter.js';
import { registerInvitationAcceptRoutes } from './invitation-accept.js';

function makeClients() {
  const getInvitationByTokenMock = vi.fn();
  const provisionInvitedUserMock = vi.fn();
  const acceptInvitationMock = vi.fn();

  const rescueClient = {
    getInvitationByToken: getInvitationByTokenMock,
    acceptInvitation: acceptInvitationMock,
    close: vi.fn(),
  } as unknown as RescueClient;

  const authClient = {
    provisionInvitedUser: provisionInvitedUserMock,
    close: vi.fn(),
  } as unknown as AuthClient;

  return {
    authClient,
    rescueClient,
    getInvitationByTokenMock,
    provisionInvitedUserMock,
    acceptInvitationMock,
  };
}

async function makeApp(
  authClient: AuthClient,
  rescueClient: RescueClient,
  extraOpts: Partial<Parameters<typeof registerInvitationAcceptRoutes>[1]> = {}
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: true });
  await registerInvitationAcceptRoutes(app, { authClient, rescueClient, ...extraOpts });
  return app;
}

const VALID_BODY = {
  token: 'tok-abc',
  password: 'hunter22',
  firstName: 'Jo',
  lastName: 'Bloggs',
};

describe('POST /api/v1/invitations/accept', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClients>;

  beforeEach(async () => {
    m = makeClients();
    app = await makeApp(m.authClient, m.rescueClient);
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  it('orchestrates validate → provision → accept and returns 201', async () => {
    m.getInvitationByTokenMock.mockResolvedValueOnce({
      invitation: { email: 'invitee@example.com', rescueId: 'rsc-1' },
    });
    m.provisionInvitedUserMock.mockResolvedValueOnce({
      user: { userId: 'usr-new' },
      created: true,
    });
    m.acceptInvitationMock.mockResolvedValueOnce({
      staffMember: { staffMemberId: 'stf-1', userId: 'usr-new', rescueId: 'rsc-1' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      payload: VALID_BODY,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.userId).toBe('usr-new');
    expect(body.data.staffMemberId).toBe('stf-1');

    // The invitee's trusted email is read from the invitation, not the body.
    expect(m.provisionInvitedUserMock.mock.calls[0][0]).toMatchObject({
      email: 'invitee@example.com',
      password: 'hunter22',
      firstName: 'Jo',
      lastName: 'Bloggs',
    });
    expect(m.acceptInvitationMock.mock.calls[0][0]).toEqual({
      token: 'tok-abc',
      userId: 'usr-new',
    });
  });

  it('accepts snake_case name fields', async () => {
    m.getInvitationByTokenMock.mockResolvedValueOnce({
      invitation: { email: 'invitee@example.com', rescueId: 'rsc-1' },
    });
    m.provisionInvitedUserMock.mockResolvedValueOnce({ user: { userId: 'usr-new' } });
    m.acceptInvitationMock.mockResolvedValueOnce({ staffMember: { userId: 'usr-new' } });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      payload: { token: 'tok-abc', password: 'hunter22', first_name: 'Jo', last_name: 'Bloggs' },
    });

    expect(res.statusCode).toBe(201);
    expect(m.provisionInvitedUserMock.mock.calls[0][0]).toMatchObject({
      firstName: 'Jo',
      lastName: 'Bloggs',
    });
  });

  it('returns 400 when the token is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      payload: { ...VALID_BODY, token: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(m.getInvitationByTokenMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the password is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      payload: { ...VALID_BODY, password: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when names are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      payload: { token: 'tok-abc', password: 'hunter22' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('maps an invalid/used/expired token (NOT_FOUND) to 404 and never provisions', async () => {
    m.getInvitationByTokenMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'invitation not found or no longer valid',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      payload: VALID_BODY,
    });

    expect(res.statusCode).toBe(404);
    expect(m.provisionInvitedUserMock).not.toHaveBeenCalled();
    expect(m.acceptInvitationMock).not.toHaveBeenCalled();
  });

  it('maps an already-consumed token at accept (NOT_FOUND) to 404', async () => {
    m.getInvitationByTokenMock.mockResolvedValueOnce({
      invitation: { email: 'invitee@example.com', rescueId: 'rsc-1' },
    });
    m.provisionInvitedUserMock.mockResolvedValueOnce({ user: { userId: 'usr-new' } });
    m.acceptInvitationMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'invitation not found or no longer valid',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/accept',
      payload: VALID_BODY,
    });

    expect(res.statusCode).toBe(404);
  });
});

// ADS-961: the route provisions an auth user + attaches rescue-staff
// membership from nothing but a bearer token, so a brute-forced token is a
// full account-hijack primitive. Both a per-IP cap (route config.rateLimit)
// and a per-token cap (preHandler, same shape as the login per-email
// limiter in auth.ts/email-rate-limiter.ts) must hold.
describe('POST /api/v1/invitations/accept rate limiting (ADS-961)', () => {
  const successMocks = (m: ReturnType<typeof makeClients>) => {
    m.getInvitationByTokenMock.mockResolvedValue({
      invitation: { email: 'invitee@example.com', rescueId: 'rsc-1' },
    });
    m.provisionInvitedUserMock.mockResolvedValue({ user: { userId: 'usr-new' } });
    m.acceptInvitationMock.mockResolvedValue({ staffMember: { userId: 'usr-new' } });
  };

  it('throttles a per-IP flood (more than 10/min/IP returns 429)', async () => {
    const m = makeClients();
    successMocks(m);
    const app = Fastify({ logger: false, trustProxy: true });
    const { default: rateLimit } = await import('@fastify/rate-limit');
    await app.register(rateLimit, {
      global: true,
      max: 100,
      timeWindow: '1 minute',
      keyGenerator: req => req.ip,
    });
    await registerInvitationAcceptRoutes(app, {
      authClient: m.authClient,
      rescueClient: m.rescueClient,
    });
    try {
      const sameIp = { 'x-forwarded-for': '9.9.9.9' };
      const statuses: number[] = [];
      // Vary the token each call so it's unambiguously the per-IP cap firing.
      for (let i = 0; i < 11; i += 1) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/invitations/accept',
          headers: sameIp,
          payload: { ...VALID_BODY, token: `tok-${i}` },
        });
        statuses.push(res.statusCode);
      }
      // 10 within the per-IP cap pass; the 11th from the same IP is 429.
      expect(statuses.slice(0, 10)).toEqual(new Array(10).fill(201));
      expect(statuses[10]).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('throttles a per-TOKEN flood spread across many IPs (more than 5/5min returns 429)', async () => {
    const m = makeClients();
    successMocks(m);
    const tokenRateLimiter = createEmailRateLimiter({ max: 5, windowMs: 5 * 60_000 });
    const app = await makeApp(m.authClient, m.rescueClient, { tokenRateLimiter });
    try {
      const hit = (ip: string) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/invitations/accept',
          headers: { 'x-forwarded-for': ip },
          payload: { ...VALID_BODY, token: 'shared-guessed-token' },
        });

      const statuses: number[] = [];
      for (let i = 0; i < 6; i += 1) {
        statuses.push((await hit(`1.1.1.${i}`)).statusCode);
      }

      // First 5 (the cap) pass; the 6th — same token, different IP — is 429.
      expect(statuses.slice(0, 5)).toEqual(new Array(5).fill(201));
      expect(statuses[5]).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('does not throttle a DIFFERENT token once one trips the per-token cap', async () => {
    const m = makeClients();
    successMocks(m);
    const tokenRateLimiter = createEmailRateLimiter({ max: 1, windowMs: 5 * 60_000 });
    const app = await makeApp(m.authClient, m.rescueClient, { tokenRateLimiter });
    try {
      await app.inject({
        method: 'POST',
        url: '/api/v1/invitations/accept',
        payload: { ...VALID_BODY, token: 'token-a' },
      });
      const tripped = await app.inject({
        method: 'POST',
        url: '/api/v1/invitations/accept',
        payload: { ...VALID_BODY, token: 'token-a' },
      });
      const other = await app.inject({
        method: 'POST',
        url: '/api/v1/invitations/accept',
        payload: { ...VALID_BODY, token: 'token-b' },
      });

      expect(tripped.statusCode).toBe(429);
      expect(other.statusCode).toBe(201);
    } finally {
      await app.close();
    }
  });

  it('calls onTokenRateLimitTrip when the per-token cap trips', async () => {
    const m = makeClients();
    successMocks(m);
    const onTokenRateLimitTrip = vi.fn();
    const tokenRateLimiter = createEmailRateLimiter({ max: 1, windowMs: 60_000 });
    const app = await makeApp(m.authClient, m.rescueClient, {
      tokenRateLimiter,
      onTokenRateLimitTrip,
    });
    try {
      await app.inject({
        method: 'POST',
        url: '/api/v1/invitations/accept',
        payload: { ...VALID_BODY, token: 'token-c' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/invitations/accept',
        payload: { ...VALID_BODY, token: 'token-c' },
      });

      expect(res.statusCode).toBe(429);
      expect(onTokenRateLimitTrip).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it('does not throttle when no tokenRateLimiter is wired', async () => {
    const m = makeClients();
    successMocks(m);
    const app = await makeApp(m.authClient, m.rescueClient);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/invitations/accept',
        payload: { ...VALID_BODY, token: 'token-d' },
      });
      expect(res.statusCode).toBe(201);
    } finally {
      await app.close();
    }
  });
});
