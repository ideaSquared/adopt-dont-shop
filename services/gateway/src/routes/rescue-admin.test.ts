import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RescueV1, type Rescue } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { registerRescueAdminRoutes } from './rescue-admin.js';

type Mocks = {
  client: RescueClient;
  updatePlan: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
  sendEmail: ReturnType<typeof vi.fn>;
  verify: ReturnType<typeof vi.fn>;
  listStaffMembers: ReturnType<typeof vi.fn>;
  removeStaffMember: ReturnType<typeof vi.fn>;
  listRescueInvitations: ReturnType<typeof vi.fn>;
  inviteStaff: ReturnType<typeof vi.fn>;
  cancelRescueInvitation: ReturnType<typeof vi.fn>;
};

function makeClient(): Mocks {
  const updatePlan = vi.fn();
  const getStats = vi.fn();
  const sendEmail = vi.fn();
  const verify = vi.fn();
  const listStaffMembers = vi.fn();
  const removeStaffMember = vi.fn();
  const listRescueInvitations = vi.fn();
  const inviteStaff = vi.fn();
  const cancelRescueInvitation = vi.fn();
  // Only the methods these routes touch need to be real; the rest are
  // present to satisfy the RescueClient shape.
  const client = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    updateRescuePlan: updatePlan,
    getRescueStatistics: getStats,
    sendRescueEmail: sendEmail,
    verify,
    inviteStaff,
    getMyStaffMembership: vi.fn(),
    listStaffMembers,
    removeStaffMember,
    listRescueInvitations,
    cancelRescueInvitation,
    createFosterPlacement: vi.fn(),
    listFosterPlacements: vi.fn(),
    getFosterPlacement: vi.fn(),
    endFosterPlacement: vi.fn(),
    getInvitationByToken: vi.fn(),
    acceptInvitation: vi.fn(),
    listApplicationQuestions: vi.fn(),
    createApplicationQuestion: vi.fn(),
    deleteApplicationQuestion: vi.fn(),
    close: vi.fn(),
  } satisfies RescueClient;
  return {
    client,
    updatePlan,
    getStats,
    sendEmail,
    verify,
    listStaffMembers,
    removeStaffMember,
    listRescueInvitations,
    inviteStaff,
    cancelRescueInvitation,
  };
}

async function makeApp(client: RescueClient, authClient?: AuthClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerRescueAdminRoutes(app, { client, authClient });
  return app;
}

const ADMIN_HEADERS = {
  'x-user-id': 'admin-1',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.security.manage',
};

function makeRescue(overrides: Partial<Rescue> = {}): Rescue {
  return {
    rescueId: 'rsc-1',
    name: 'Happy Tails',
    email: 'hi@happytails.org',
    address: '1 Paw St',
    city: 'Leeds',
    postcode: 'LS1 1AA',
    country: 'GB',
    contactPerson: 'Sam',
    status: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
    settingsJson: '{}',
    plan: 'free',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

const STATS = {
  totalPets: 0,
  availablePets: 0,
  adoptedPets: 0,
  pendingApplications: 0,
  totalApplications: 0,
  staffCount: 4,
  activeListings: 0,
  monthlyAdoptions: 0,
  averageTimeToAdoption: 0,
};

describe('PATCH /api/v1/admin/rescues/:rescueId/plan', () => {
  let app: FastifyInstance;
  let m: Mocks;

  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('forwards plan + planExpiresAt and returns the updated rescue', async () => {
    m.updatePlan.mockResolvedValue({ rescue: makeRescue({ plan: 'growth' }) });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/rescues/rsc-1/plan',
      headers: ADMIN_HEADERS,
      payload: { plan: 'growth', planExpiresAt: '2027-01-01T00:00:00.000Z' },
    });

    expect(res.statusCode).toBe(200);
    expect(m.updatePlan.mock.calls[0][0]).toMatchObject({
      rescueId: 'rsc-1',
      plan: 'growth',
      planExpiresAt: '2027-01-01T00:00:00.000Z',
    });
    expect(res.json()).toMatchObject({
      success: true,
      message: 'Rescue plan updated',
      data: { rescue_id: 'rsc-1', plan: 'growth' },
    });
  });

  it('rejects a missing plan with 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/rescues/rsc-1/plan',
      headers: ADMIN_HEADERS,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(m.updatePlan).not.toHaveBeenCalled();
  });

  it('maps PERMISSION_DENIED to 403', async () => {
    m.updatePlan.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED, details: 'nope' });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/rescues/rsc-1/plan',
      headers: ADMIN_HEADERS,
      payload: { plan: 'growth' },
    });

    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/v1/rescues/:rescueId/analytics', () => {
  let app: FastifyInstance;
  let m: Mocks;

  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the statistics in a {success, data} envelope', async () => {
    m.getStats.mockResolvedValue({ statistics: STATS });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/rescues/rsc-1/analytics',
      headers: ADMIN_HEADERS,
    });

    expect(res.statusCode).toBe(200);
    expect(m.getStats.mock.calls[0][0]).toMatchObject({ rescueId: 'rsc-1' });
    expect(res.json()).toEqual({ success: true, data: STATS });
  });

  it('maps NOT_FOUND to 404', async () => {
    m.getStats.mockRejectedValue({ code: grpcStatus.NOT_FOUND, details: 'gone' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/rescues/rsc-1/analytics',
      headers: ADMIN_HEADERS,
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/v1/rescues/:rescueId/send-email', () => {
  let app: FastifyInstance;
  let m: Mocks;

  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('forwards a custom subject + body', async () => {
    m.sendEmail.mockResolvedValue({ queued: true });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/rsc-1/send-email',
      headers: ADMIN_HEADERS,
      payload: { subject: 'Hello', body: 'Welcome aboard' },
    });

    expect(res.statusCode).toBe(200);
    expect(m.sendEmail.mock.calls[0][0]).toMatchObject({
      rescueId: 'rsc-1',
      subject: 'Hello',
      body: 'Welcome aboard',
    });
    expect(res.json()).toEqual({ success: true, message: 'Email queued' });
  });

  it('forwards a template id', async () => {
    m.sendEmail.mockResolvedValue({ queued: true });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/rsc-1/send-email',
      headers: ADMIN_HEADERS,
      payload: { templateId: 'welcome' },
    });

    expect(res.statusCode).toBe(200);
    expect(m.sendEmail.mock.calls[0][0]).toMatchObject({ templateId: 'welcome' });
  });

  it('rejects when neither templateId nor subject is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/rsc-1/send-email',
      headers: ADMIN_HEADERS,
      payload: { body: 'orphan body' },
    });

    expect(res.statusCode).toBe(400);
    expect(m.sendEmail).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/rescues/bulk-update', () => {
  let app: FastifyInstance;
  let m: Mocks;

  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('verifies each id and counts successes + failures', async () => {
    m.verify
      .mockResolvedValueOnce({ rescue: makeRescue() })
      .mockRejectedValueOnce({ code: grpcStatus.FAILED_PRECONDITION, details: 'bad transition' })
      .mockResolvedValueOnce({ rescue: makeRescue() });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/bulk-update',
      headers: ADMIN_HEADERS,
      payload: { rescueIds: ['r1', 'r2', 'r3'], action: 'approve' },
    });

    expect(res.statusCode).toBe(200);
    expect(m.verify).toHaveBeenCalledTimes(3);
    expect(m.verify.mock.calls[0][0]).toMatchObject({
      rescueId: 'r1',
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
      verificationSource: RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL,
    });
    expect(res.json()).toMatchObject({ data: { successCount: 2, failedCount: 1 } });
  });

  it('maps action=suspend to the SUSPENDED status', async () => {
    m.verify.mockResolvedValue({ rescue: makeRescue() });

    await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/bulk-update',
      headers: ADMIN_HEADERS,
      payload: { rescueIds: ['r1'], action: 'suspend' },
    });

    expect(m.verify.mock.calls[0][0]).toMatchObject({
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_SUSPENDED,
    });
  });

  it('rejects an empty rescueIds list with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/bulk-update',
      headers: ADMIN_HEADERS,
      payload: { rescueIds: [], action: 'approve' },
    });

    expect(res.statusCode).toBe(400);
    expect(m.verify).not.toHaveBeenCalled();
  });

  it('rejects an unknown action with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/bulk-update',
      headers: ADMIN_HEADERS,
      payload: { rescueIds: ['r1'], action: 'frobnicate' },
    });

    expect(res.statusCode).toBe(400);
    expect(m.verify).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/rescues/:rescueId/{verify,reject}', () => {
  let app: FastifyInstance;
  let m: Mocks;

  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('verify forwards VERIFIED + MANUAL and returns the rescue', async () => {
    m.verify.mockResolvedValue({ rescue: makeRescue() });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/rsc-1/verify',
      headers: ADMIN_HEADERS,
      payload: { notes: 'looks good' },
    });

    expect(res.statusCode).toBe(200);
    expect(m.verify.mock.calls[0][0]).toMatchObject({
      rescueId: 'rsc-1',
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
      verificationSource: RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL,
    });
    expect(res.json()).toMatchObject({
      success: true,
      message: 'Rescue verified',
      data: { rescue_id: 'rsc-1' },
    });
  });

  it('reject forwards REJECTED + the failure reason', async () => {
    m.verify.mockResolvedValue({
      rescue: makeRescue({ status: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/rsc-1/reject',
      headers: ADMIN_HEADERS,
      payload: { reason: 'incomplete documents' },
    });

    expect(res.statusCode).toBe(200);
    expect(m.verify.mock.calls[0][0]).toMatchObject({
      rescueId: 'rsc-1',
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED,
      failureReason: 'incomplete documents',
    });
  });

  it('reject without a reason returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/rsc-1/reject',
      headers: ADMIN_HEADERS,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(m.verify).not.toHaveBeenCalled();
  });
});

// --- StaffTab: staff + invitations ----------------------------------

const staffMember = (overrides: Partial<RescueV1.StaffMember> = {}): RescueV1.StaffMember => ({
  staffMemberId: 'stf-1',
  userId: 'usr-1',
  rescueId: 'rsc-1',
  title: 'Volunteer',
  isVerified: true,
  addedBy: 'usr-admin',
  addedAt: '2026-06-01T00:00:00.000Z',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const invitation = (overrides: Partial<RescueV1.Invitation> = {}): RescueV1.Invitation => ({
  invitationId: 'inv-1',
  email: 'invitee@example.com',
  rescueId: 'rsc-1',
  title: 'Volunteer',
  invitedBy: 'usr-admin',
  expiration: '2099-01-01T00:00:00.000Z',
  used: false,
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

// Minimal AuthClient — only adminGetUser is exercised by the staff route.
// The `as unknown as AuthClient` cast avoids stubbing the ~50 other methods.
function makeAuthClient(getUser: ReturnType<typeof vi.fn>): AuthClient {
  return { adminGetUser: getUser } as unknown as AuthClient;
}

describe('GET /api/v1/rescues/:rescueId/staff', () => {
  it('enriches each member with name/email and wraps in a paginated envelope', async () => {
    const m = makeClient();
    const getUser = vi.fn().mockResolvedValue({
      user: { userId: 'usr-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
    });
    const app = await makeApp(m.client, makeAuthClient(getUser));
    try {
      m.listStaffMembers.mockResolvedValue({ staffMembers: [staffMember()] });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/rescues/rsc-1/staff',
        headers: ADMIN_HEADERS,
      });

      expect(m.listStaffMembers.mock.calls[0][0]).toMatchObject({ rescueId: 'rsc-1' });
      expect(getUser.mock.calls[0][0]).toMatchObject({ userId: 'usr-1' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        success: true,
        data: [
          {
            staffMemberId: 'stf-1',
            userId: 'usr-1',
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
            isVerified: true,
          },
        ],
        pagination: { page: 1, total: 1, totalPages: 1 },
      });
    } finally {
      await app.close();
    }
  });

  it('degrades to empty name fields when a user lookup fails', async () => {
    const m = makeClient();
    const getUser = vi.fn().mockRejectedValue(new Error('auth down'));
    const app = await makeApp(m.client, makeAuthClient(getUser));
    try {
      m.listStaffMembers.mockResolvedValue({ staffMembers: [staffMember()] });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/rescues/rsc-1/staff',
        headers: ADMIN_HEADERS,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data[0]).toMatchObject({ userId: 'usr-1', firstName: '', email: '' });
    } finally {
      await app.close();
    }
  });

  it('works without an auth client (names blank, no lookup)', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.listStaffMembers.mockResolvedValue({ staffMembers: [staffMember()] });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/rescues/rsc-1/staff',
        headers: ADMIN_HEADERS,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data[0]).toMatchObject({ userId: 'usr-1', firstName: '' });
    } finally {
      await app.close();
    }
  });

  it('maps a gRPC PERMISSION_DENIED to 403', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.listStaffMembers.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/rescues/rsc-1/staff',
        headers: ADMIN_HEADERS,
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});

describe('DELETE /api/v1/rescues/:rescueId/staff/:userId', () => {
  it('removes the staff member', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.removeStaffMember.mockResolvedValue({ removed: true });
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/rescues/rsc-1/staff/usr-1',
        headers: ADMIN_HEADERS,
      });
      expect(m.removeStaffMember.mock.calls[0][0]).toMatchObject({
        rescueId: 'rsc-1',
        userId: 'usr-1',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true });
    } finally {
      await app.close();
    }
  });

  it('maps a gRPC NOT_FOUND to 404', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.removeStaffMember.mockRejectedValue({ code: grpcStatus.NOT_FOUND });
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/rescues/rsc-1/staff/usr-1',
        headers: ADMIN_HEADERS,
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/rescues/:rescueId/invitations', () => {
  it('lists pending invitations as the SPA shape (status pending, no token)', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.listRescueInvitations.mockResolvedValue({ invitations: [invitation()] });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/rescues/rsc-1/invitations',
        headers: ADMIN_HEADERS,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data[0]).toMatchObject({
        invitationId: 'inv-1',
        email: 'invitee@example.com',
        status: 'pending',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });
      expect(body.data[0]).not.toHaveProperty('token');
    } finally {
      await app.close();
    }
  });

  it('flags a lapsed invitation as expired', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.listRescueInvitations.mockResolvedValue({
        invitations: [invitation({ expiration: '2020-01-01T00:00:00.000Z' })],
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/rescues/rsc-1/invitations',
        headers: ADMIN_HEADERS,
      });
      expect(res.json().data[0].status).toBe('expired');
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/rescues/:rescueId/invitations', () => {
  it('invites a staff member and returns 201 with the invitation', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.inviteStaff.mockResolvedValue({ invitation: invitation(), token: 'plain-token' });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/rescues/rsc-1/invitations',
        headers: ADMIN_HEADERS,
        payload: { email: 'invitee@example.com', title: 'Volunteer' },
      });
      expect(m.inviteStaff.mock.calls[0][0]).toMatchObject({
        rescueId: 'rsc-1',
        email: 'invitee@example.com',
        title: 'Volunteer',
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ success: true, data: { invitationId: 'inv-1' } });
      // The plain-text token is never echoed back through the admin route.
      expect(res.json().data).not.toHaveProperty('token');
    } finally {
      await app.close();
    }
  });

  it('rejects a missing email with 400 (no gRPC call)', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/rescues/rsc-1/invitations',
        headers: ADMIN_HEADERS,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(m.inviteStaff).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});

describe('DELETE /api/v1/rescues/:rescueId/invitations/:invitationId', () => {
  it('cancels the invitation', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.cancelRescueInvitation.mockResolvedValue({ cancelled: true });
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/rescues/rsc-1/invitations/inv-1',
        headers: ADMIN_HEADERS,
      });
      expect(m.cancelRescueInvitation.mock.calls[0][0]).toMatchObject({
        rescueId: 'rsc-1',
        invitationId: 'inv-1',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true });
    } finally {
      await app.close();
    }
  });

  it('maps a gRPC NOT_FOUND to 404', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.cancelRescueInvitation.mockRejectedValue({ code: grpcStatus.NOT_FOUND });
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/rescues/rsc-1/invitations/inv-1',
        headers: ADMIN_HEADERS,
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
