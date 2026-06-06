import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RescueV1,
  type CreateRescueResponse,
  type GetRescueResponse,
  type InviteStaffResponse,
  type ListRescuesResponse,
  type Rescue,
  type UpdateRescueResponse,
  type VerifyRescueResponse,
} from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { registerRescueRoutes } from './rescue.js';

function makeClient(): {
  client: RescueClient;
  createMock: ReturnType<typeof vi.fn>;
  getMock: ReturnType<typeof vi.fn>;
  listMock: ReturnType<typeof vi.fn>;
  updateMock: ReturnType<typeof vi.fn>;
  verifyMock: ReturnType<typeof vi.fn>;
  inviteStaffMock: ReturnType<typeof vi.fn>;
} {
  const createMock = vi.fn();
  const getMock = vi.fn();
  const listMock = vi.fn();
  const updateMock = vi.fn();
  const verifyMock = vi.fn();
  const inviteStaffMock = vi.fn();
  const client: RescueClient = {
    create: createMock,
    get: getMock,
    list: listMock,
    update: updateMock,
    verify: verifyMock,
    inviteStaff: inviteStaffMock,
    close: vi.fn(),
  };
  return { client, createMock, getMock, listMock, updateMock, verifyMock, inviteStaffMock };
}

async function makeApp(client: RescueClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerRescueRoutes(app, { client });
  return app;
}

const RESCUE_FIXTURE: Rescue = {
  rescueId: 'rsc-1',
  name: 'Pawsome',
  email: 'hi@p.example',
  address: '1 High St',
  city: 'London',
  postcode: 'SW1A 1AA',
  country: 'GB',
  contactPerson: 'Alex',
  status: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
  settingsJson: '{}',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

describe('GET /api/rescue', () => {
  let app: FastifyInstance;
  let listMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    listMock = m.listMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists rescues and parses the canonical status filter', async () => {
    const listRes: ListRescuesResponse = { rescues: [RESCUE_FIXTURE], nextCursor: 'cur' };
    listMock.mockResolvedValueOnce(listRes);

    const res = await app.inject({
      method: 'GET',
      url: '/api/rescue?status=verified&limit=10',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { rescues: unknown[]; nextCursor?: string };
    expect(body.rescues).toHaveLength(1);
    expect(body.nextCursor).toBe('cur');
    const [req] = listMock.mock.calls[0];
    expect(req.statusFilter).toBe(RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED);
    expect(req.limit).toBe(10);
  });

  it('coerces an unknown status to UNSPECIFIED', async () => {
    listMock.mockResolvedValueOnce({ rescues: [] });
    await app.inject({ method: 'GET', url: '/api/rescue?status=not_a_status' });
    const [req] = listMock.mock.calls[0];
    expect(req.statusFilter).toBe(RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED);
  });

  it('maps INVALID_ARGUMENT → 400', async () => {
    listMock.mockRejectedValueOnce(
      Object.assign(new Error('limit too big'), {
        code: grpcStatus.INVALID_ARGUMENT,
        details: 'limit must be <= 100',
      })
    );
    const res = await app.inject({ method: 'GET', url: '/api/rescue?limit=200' });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/rescue/:id', () => {
  it('threads the path param and returns the rescue', async () => {
    const { client, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      const getRes: GetRescueResponse = { rescue: RESCUE_FIXTURE };
      getMock.mockResolvedValueOnce(getRes);
      const res = await app.inject({
        method: 'GET',
        url: '/api/rescue/rsc-1',
        headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { rescue: { rescueId: string } };
      expect(body.rescue.rescueId).toBe('rsc-1');
      const [req, metadata] = getMock.mock.calls[0];
      expect(req.rescueId).toBe('rsc-1');
      expect(metadata.get('x-user-id')[0]).toBe('usr-1');
    } finally {
      await app.close();
    }
  });

  it('maps NOT_FOUND → 404', async () => {
    const { client, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      getMock.mockRejectedValueOnce(
        Object.assign(new Error('gone'), {
          code: grpcStatus.NOT_FOUND,
          details: 'rescue ghost not found',
        })
      );
      const res = await app.inject({ method: 'GET', url: '/api/rescue/ghost' });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/rescue', () => {
  it('returns 201 + threads body fields into the gRPC request', async () => {
    const { client, createMock } = makeClient();
    const app = await makeApp(client);
    try {
      const createRes: CreateRescueResponse = { rescue: RESCUE_FIXTURE };
      createMock.mockResolvedValueOnce(createRes);

      const res = await app.inject({
        method: 'POST',
        url: '/api/rescue',
        headers: { 'x-user-id': 'usr-admin', 'x-user-roles': 'admin' },
        payload: {
          name: 'Pawsome',
          email: 'hi@p.example',
          address: '1 High St',
          city: 'London',
          postcode: 'SW1A 1AA',
          contactPerson: 'Alex',
        },
      });

      expect(res.statusCode).toBe(201);
      const [req] = createMock.mock.calls[0];
      expect(req.name).toBe('Pawsome');
      expect(req.email).toBe('hi@p.example');
    } finally {
      await app.close();
    }
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    const { client, createMock } = makeClient();
    const app = await makeApp(client);
    try {
      createMock.mockRejectedValueOnce(
        Object.assign(new Error('nope'), {
          code: grpcStatus.PERMISSION_DENIED,
          details: 'rescues.create required',
        })
      );
      const res = await app.inject({
        method: 'POST',
        url: '/api/rescue',
        payload: { name: 'Pawsome', email: 'hi@p.example' },
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});

describe('PATCH /api/rescue/:id', () => {
  it('threads path param + body fields', async () => {
    const { client, updateMock } = makeClient();
    const app = await makeApp(client);
    try {
      const updateRes: UpdateRescueResponse = { rescue: { ...RESCUE_FIXTURE, name: 'Pawsome 2' } };
      updateMock.mockResolvedValueOnce(updateRes);
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/rescue/rsc-1',
        payload: { name: 'Pawsome 2' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { rescue: { name: string } };
      expect(body.rescue.name).toBe('Pawsome 2');
      const [req] = updateMock.mock.calls[0];
      expect(req.rescueId).toBe('rsc-1');
      expect(req.name).toBe('Pawsome 2');
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/rescue/:id/verify', () => {
  let app: FastifyInstance;
  let verifyMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    verifyMock = m.verifyMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('parses the canonical status string and verification source', async () => {
    const verifyRes: VerifyRescueResponse = {
      rescue: { ...RESCUE_FIXTURE, status: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED },
    };
    verifyMock.mockResolvedValueOnce(verifyRes);

    const res = await app.inject({
      method: 'POST',
      url: '/api/rescue/rsc-1/verify',
      payload: { toStatus: 'verified', verificationSource: 'companies_house' },
    });

    expect(res.statusCode).toBe(200);
    const [req] = verifyMock.mock.calls[0];
    expect(req.rescueId).toBe('rsc-1');
    expect(req.toStatus).toBe(RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED);
    expect(req.verificationSource).toBe(
      RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_COMPANIES_HOUSE
    );
  });

  it('accepts the SCREAMING proto form too', async () => {
    verifyMock.mockResolvedValueOnce({ rescue: RESCUE_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/rescue/rsc-1/verify',
      payload: { toStatus: 'RESCUE_STATUS_REJECTED', failureReason: 'no docs' },
    });
    const [req] = verifyMock.mock.calls[0];
    expect(req.toStatus).toBe(RescueV1.RescueStatus.RESCUE_STATUS_REJECTED);
    expect(req.failureReason).toBe('no docs');
  });

  it('maps INVALID_ARGUMENT → 400 on illegal transition', async () => {
    verifyMock.mockRejectedValueOnce(
      Object.assign(new Error('illegal'), {
        code: grpcStatus.INVALID_ARGUMENT,
        details: 'illegal status transition verified → rejected',
      })
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/rescue/rsc-1/verify',
      payload: { toStatus: 'rejected' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/rescue/:id/invitations', () => {
  it('returns 201 + the token alongside the invitation', async () => {
    const { client, inviteStaffMock } = makeClient();
    const app = await makeApp(client);
    try {
      const inviteRes: InviteStaffResponse = {
        invitation: {
          invitationId: 'inv-1',
          email: 'new@p.example',
          rescueId: 'rsc-1',
          expiration: '2026-06-08T00:00:00Z',
          used: false,
          createdAt: '2026-06-01T00:00:00Z',
        },
        token: 'a'.repeat(64),
      };
      inviteStaffMock.mockResolvedValueOnce(inviteRes);

      const res = await app.inject({
        method: 'POST',
        url: '/api/rescue/rsc-1/invitations',
        payload: { email: 'new@p.example', title: 'Volunteer' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json() as { invitation: { invitationId: string }; token: string };
      expect(body.invitation.invitationId).toBe('inv-1');
      expect(body.token).toMatch(/^a{64}$/);
    } finally {
      await app.close();
    }
  });
});

describe('error mapping fallback', () => {
  it('unknown gRPC code → 500', async () => {
    const { client, getMock } = makeClient();
    const app = await makeApp(client);
    try {
      getMock.mockRejectedValueOnce(new Error('connection refused'));
      const res = await app.inject({ method: 'GET', url: '/api/rescue/rsc-1' });
      expect(res.statusCode).toBe(500);
    } finally {
      await app.close();
    }
  });
});
