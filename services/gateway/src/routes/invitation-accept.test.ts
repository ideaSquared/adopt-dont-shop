import { status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';

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
  rescueClient: RescueClient
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerInvitationAcceptRoutes(app, { authClient, rescueClient });
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
