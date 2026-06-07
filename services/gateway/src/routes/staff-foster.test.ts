import { status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RescueV1 } from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { registerStaffFosterRoutes } from './staff-foster.js';

function makeClient() {
  const getMyStaffMembershipMock = vi.fn();
  const listStaffMembersMock = vi.fn();
  const createFosterPlacementMock = vi.fn();
  const listFosterPlacementsMock = vi.fn();
  const getFosterPlacementMock = vi.fn();
  const endFosterPlacementMock = vi.fn();
  const getInvitationByTokenMock = vi.fn();
  const client = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    verify: vi.fn(),
    inviteStaff: vi.fn(),
    getMyStaffMembership: getMyStaffMembershipMock,
    listStaffMembers: listStaffMembersMock,
    createFosterPlacement: createFosterPlacementMock,
    listFosterPlacements: listFosterPlacementsMock,
    getFosterPlacement: getFosterPlacementMock,
    endFosterPlacement: endFosterPlacementMock,
    getInvitationByToken: getInvitationByTokenMock,
    close: vi.fn(),
  } as unknown as RescueClient;
  return {
    client,
    getMyStaffMembershipMock,
    listStaffMembersMock,
    createFosterPlacementMock,
    listFosterPlacementsMock,
    getFosterPlacementMock,
    endFosterPlacementMock,
    getInvitationByTokenMock,
  };
}

async function makeApp(client: RescueClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerStaffFosterRoutes(app, { client });
  return app;
}

const ADOPTER_HEADERS = { 'x-user-id': 'usr-1', 'x-user-roles': 'rescue_staff' };

const STAFF_FIXTURE = {
  staffMemberId: 'stf-1',
  userId: 'usr-1',
  rescueId: 'rsc-1',
  isVerified: true,
  addedBy: 'usr-admin',
  addedAt: '2026-06-01T00:00:00Z',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const FOSTER_FIXTURE = {
  placementId: 'fp-1',
  rescueId: 'rsc-1',
  petId: 'pet-1',
  fosterUserId: 'usr-foster',
  startDate: '2026-06-01T00:00:00Z',
  status: RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_ACTIVE,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

describe('GET /api/v1/staff/me', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the staff record in { success, data }', async () => {
    m.getMyStaffMembershipMock.mockResolvedValueOnce({ staffMember: STAFF_FIXTURE });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/staff/me',
      headers: ADOPTER_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true, data: STAFF_FIXTURE });
  });

  it('maps NOT_FOUND to 404', async () => {
    m.getMyStaffMembershipMock.mockRejectedValueOnce({ code: status.NOT_FOUND, details: 'nope' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/staff/me',
      headers: ADOPTER_HEADERS,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/v1/staff/colleagues', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('lists colleagues (rescue resolved server-side)', async () => {
    m.listStaffMembersMock.mockResolvedValueOnce({
      staffMembers: [STAFF_FIXTURE, { ...STAFF_FIXTURE, staffMemberId: 'stf-2' }],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/staff/colleagues',
      headers: ADOPTER_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toHaveLength(2);
    // rescue_id passed as undefined → service resolves own rescue.
    expect(m.listStaffMembersMock.mock.calls[0][0]).toEqual({ rescueId: undefined });
  });
});

describe('foster placements', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('POST /placements returns 201', async () => {
    m.createFosterPlacementMock.mockResolvedValueOnce({ placement: FOSTER_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/foster/placements',
      headers: ADOPTER_HEADERS,
      payload: {
        rescueId: 'rsc-1',
        petId: 'pet-1',
        fosterUserId: 'usr-foster',
        startDate: '2026-06-01T00:00:00Z',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.placementId).toBe('fp-1');
  });

  it('GET /placements threads status filter', async () => {
    m.listFosterPlacementsMock.mockResolvedValueOnce({ placements: [FOSTER_FIXTURE] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/foster/placements?rescueId=rsc-1&status=active',
      headers: ADOPTER_HEADERS,
    });
    expect(m.listFosterPlacementsMock.mock.calls[0][0]).toMatchObject({
      rescueId: 'rsc-1',
      statusFilter: RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_ACTIVE,
    });
  });

  it('GET /placements/:id returns the placement', async () => {
    m.getFosterPlacementMock.mockResolvedValueOnce({ placement: FOSTER_FIXTURE });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/foster/placements/fp-1',
      headers: ADOPTER_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(m.getFosterPlacementMock.mock.calls[0][0]).toEqual({ placementId: 'fp-1' });
  });

  it('POST /placements/:id/end maps the outcome string', async () => {
    m.endFosterPlacementMock.mockResolvedValueOnce({
      placement: {
        ...FOSTER_FIXTURE,
        status: RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_COMPLETED,
      },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/foster/placements/fp-1/end',
      headers: ADOPTER_HEADERS,
      payload: { outcome: 'adopted_by_foster' },
    });
    expect(res.statusCode).toBe(200);
    expect(m.endFosterPlacementMock.mock.calls[0][0]).toMatchObject({
      placementId: 'fp-1',
      outcome: RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_ADOPTED_BY_FOSTER,
    });
  });
});

describe('GET /api/v1/invitations/details/:token', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns invitation details for a valid token (no auth headers)', async () => {
    m.getInvitationByTokenMock.mockResolvedValueOnce({
      invitation: {
        invitationId: 'inv-1',
        email: 'invitee@example.com',
        rescueId: 'rsc-1',
        expiration: '2026-12-31T00:00:00Z',
        used: false,
        createdAt: '2026-06-01T00:00:00Z',
      },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/invitations/details/tok-abc',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.email).toBe('invitee@example.com');
    expect(m.getInvitationByTokenMock.mock.calls[0][0]).toEqual({ token: 'tok-abc' });
  });

  it('maps NOT_FOUND (used/expired/unknown) to 404', async () => {
    m.getInvitationByTokenMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'invitation not found or no longer valid',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/invitations/details/tok-bad',
    });
    expect(res.statusCode).toBe(404);
  });
});
