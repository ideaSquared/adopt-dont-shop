import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
import { RescueV1, type CreateRescueRequest } from '@adopt-dont-shop/proto';

import {
  countRescues,
  createRescue,
  getRescue,
  getRescueStatistics,
  HandlerError,
  inviteStaff,
  listRescues,
  sendRescueEmail,
  updateRescue,
  updateRescuePlan,
  verifyRescue,
  type HandlerDeps,
} from './handlers.js';

// --- Fixtures --------------------------------------------------------

const RESCUE_ID = 'rsc-1';

const STAFF: Principal = {
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: [
    'rescues.read' as Permission,
    'rescues.update' as Permission,
    'staff.create' as Permission,
  ],
  rescueId: RESCUE_ID as RescueId,
};

const OTHER_STAFF: Principal = {
  userId: 'usr-other' as UserId,
  roles: ['rescue_staff'],
  permissions: [
    'rescues.update' as Permission,
    'staff.create' as Permission,
    'rescues.read' as Permission,
  ],
  rescueId: 'rsc-2' as RescueId,
};

const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['rescues.read' as Permission],
};

const ADMIN: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: [
    'admin.security.manage' as Permission,
    'rescues.create' as Permission,
    'rescues.read' as Permission,
    'rescues.update' as Permission,
  ],
};

function rescueRow(overrides: Record<string, unknown> = {}) {
  return {
    rescue_id: 'rsc-1',
    name: 'Pawsome',
    email: 'hi@p.example',
    phone: null,
    address: '1 High St',
    city: 'London',
    state: null,
    zip_code: 'SW1A 1AA',
    country: 'GB',
    website: null,
    description: null,
    mission: null,
    companies_house_number: null,
    charity_registration_number: null,
    contact_person: 'Alex',
    contact_title: null,
    contact_email: null,
    contact_phone: null,
    status: 'pending',
    verified_at: null,
    verified_by: null,
    verification_source: null,
    verification_failure_reason: null,
    settings: {},
    plan: 'free',
    plan_expires_at: null,
    version: 0,
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

function makeMocks() {
  const client = { query: vi.fn(), release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn() };
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool, clientMock: client, natsMock: nats };
}

const BASE_CREATE: CreateRescueRequest = {
  name: 'Pawsome',
  email: 'hi@p.example',
  address: '1 High St',
  city: 'London',
  postcode: 'SW1A 1AA',
  contactPerson: 'Alex',
};

// --- createRescue ----------------------------------------------------

describe('createRescue', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing required fields', async () => {
    await expect(
      createRescue(mocks.deps, ADMIN, { ...BASE_CREATE, name: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(
      createRescue(mocks.deps, ADMIN, { ...BASE_CREATE, email: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(
      createRescue(mocks.deps, ADMIN, { ...BASE_CREATE, address: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(
      createRescue(mocks.deps, ADMIN, { ...BASE_CREATE, contactPerson: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('PERMISSION_DENIED when caller lacks rescues.create', async () => {
    await expect(createRescue(mocks.deps, ADOPTER, BASE_CREATE)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('inserts in a transaction and publishes rescue.created AFTER commit', async () => {
    const order: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      return { rows: [rescueRow()] };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await createRescue(mocks.deps, ADMIN, BASE_CREATE);
    expect(res.rescue.name).toBe('Pawsome');
    expect(res.rescue.status).toBe(RescueV1.RescueStatus.RESCUE_STATUS_PENDING);
    expect(order).toEqual(['BEGIN', 'INSERT', 'COMMIT', 'NATS_PUBLISH']);
  });
});

// --- getRescue -------------------------------------------------------

describe('getRescue', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns the rescue for any rescues.read holder', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    const res = await getRescue(mocks.deps, ADOPTER, { rescueId: 'rsc-1' });
    expect(res.rescue.rescueId).toBe('rsc-1');
    expect(JSON.parse(res.rescue.settingsJson)).toEqual({});
  });

  it('NOT_FOUND when missing/soft-deleted', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(getRescue(mocks.deps, ADOPTER, { rescueId: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// --- listRescues -----------------------------------------------------

describe('listRescues', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('defaults to verified-only when status_filter is UNSPECIFIED', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listRescues(mocks.deps, ADOPTER, {
      limit: 0,
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
    } as never);
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('verified');
  });

  it('honours a concrete status filter (admin scoping)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listRescues(mocks.deps, ADMIN, {
      limit: 0,
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_PENDING,
    } as never);
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('pending');
  });

  it('rejects limit over the max', async () => {
    await expect(
      listRescues(mocks.deps, ADOPTER, {
        limit: 200,
        statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
      } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns next_cursor when more rows exist', async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      rescueRow({ rescue_id: `rsc-${i}`, created_at: new Date(2026, 5, 3 - i) })
    );
    mocks.poolMock.query.mockResolvedValueOnce({ rows });
    const res = await listRescues(mocks.deps, ADMIN, {
      limit: 2,
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
    } as never);
    expect(res.rescues).toHaveLength(2);
    expect(res.nextCursor).toBeDefined();
  });
});

// --- updateRescue ----------------------------------------------------

describe('updateRescue', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('NOT_FOUND when the rescue is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      updateRescue(mocks.deps, STAFF, { rescueId: 'ghost', name: 'x' } as never)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('PERMISSION_DENIED for staff at a different rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    await expect(
      updateRescue(mocks.deps, OTHER_STAFF, { rescueId: 'rsc-1', name: 'x' } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('no-ops when no fields supplied', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    const res = await updateRescue(mocks.deps, STAFF, { rescueId: 'rsc-1' } as never);
    expect(res.rescue.name).toBe('Pawsome');
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('writes only the supplied fields + publishes rescue.updated after commit', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    const order: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      return { rows: [rescueRow({ name: 'Pawsome 2' })] };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await updateRescue(mocks.deps, STAFF, {
      rescueId: 'rsc-1',
      name: 'Pawsome 2',
    } as never);
    expect(res.rescue.name).toBe('Pawsome 2');
    expect(order).toEqual(['BEGIN', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
    // calls[0] is the wrapper's BEGIN; the UPDATE is calls[1].
    const sql = mocks.clientMock.query.mock.calls[1][0] as string;
    expect(sql).toMatch(/name = \$1/);
    expect(sql).toMatch(/version = version \+ 1/);
  });

  it('keys rescue.updated on aggregateId:version (deterministic, replay-safe)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    mocks.clientMock.query.mockResolvedValue({ rows: [rescueRow({ version: 3 })] });
    let msgID: string | undefined;
    mocks.natsMock.publish.mockImplementation(
      (_subject: string, _data: unknown, opts: { msgID?: string }) => {
        msgID = opts.msgID;
      }
    );

    await updateRescue(mocks.deps, STAFF, { rescueId: 'rsc-1', name: 'Pawsome 2' } as never);
    expect(msgID).toBe('rescue.updated.rsc-1:3');
  });
});

// --- verifyRescue ----------------------------------------------------

describe('verifyRescue', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('PERMISSION_DENIED for non-admin', async () => {
    await expect(
      verifyRescue(mocks.deps, STAFF, {
        rescueId: 'rsc-1',
        toStatus: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
      } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('INVALID_ARGUMENT on illegal transition (verified → rejected)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow({ status: 'verified' })] });
    await expect(
      verifyRescue(mocks.deps, ADMIN, {
        rescueId: 'rsc-1',
        toStatus: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED,
      } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('verifies a pending rescue: stamps verified_at + source + publishes rescue.verified', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow({ status: 'pending' })] });
    const order: string[] = [];
    const publishedSubjects: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      return { rows: [rescueRow({ status: 'verified' })] };
    });
    mocks.natsMock.publish.mockImplementation((subject: string) => {
      order.push('NATS_PUBLISH');
      publishedSubjects.push(subject);
    });

    const res = await verifyRescue(mocks.deps, ADMIN, {
      rescueId: 'rsc-1',
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
      verificationSource: RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL,
    } as never);

    expect(res.rescue.status).toBe(RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED);
    expect(order).toEqual(['BEGIN', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
    expect(publishedSubjects).toEqual(['rescue.verified']);
  });

  it('INVALID_ARGUMENT when rejecting without a failure reason', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow({ status: 'pending' })] });
    await expect(
      verifyRescue(mocks.deps, ADMIN, {
        rescueId: 'rsc-1',
        toStatus: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED,
      } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    // No write happened — the guard fires before the transaction.
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('publishes rescue.rejected when transitioning pending → rejected with a reason', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow({ status: 'pending' })] });
    const publishedSubjects: string[] = [];
    mocks.clientMock.query.mockResolvedValue({ rows: [rescueRow({ status: 'rejected' })] });
    mocks.natsMock.publish.mockImplementation((subject: string) => publishedSubjects.push(subject));

    await verifyRescue(mocks.deps, ADMIN, {
      rescueId: 'rsc-1',
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED,
      failureReason: 'no proof of charity registration',
    } as never);

    expect(publishedSubjects).toEqual(['rescue.rejected']);
  });
});

// --- inviteStaff -----------------------------------------------------

describe('inviteStaff', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing fields', async () => {
    await expect(
      inviteStaff(mocks.deps, STAFF, { rescueId: '', email: 'a@b' } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(
      inviteStaff(mocks.deps, STAFF, { rescueId: 'rsc-1', email: '' } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('PERMISSION_DENIED for staff at a different rescue', async () => {
    await expect(
      inviteStaff(mocks.deps, OTHER_STAFF, { rescueId: 'rsc-1', email: 'new@p.example' } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('NOT_FOUND when the rescue is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      inviteStaff(mocks.deps, STAFF, { rescueId: 'rsc-1', email: 'new@p.example' } as never)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('platform admin (admin.security.manage) can invite to any rescue', async () => {
    // Gets past the rescue-scoped staff.create gate via the admin override,
    // then NOT_FOUND only because we stub the rescue lookup empty — proving
    // the permission check itself passed for a non-member admin.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      inviteStaff(mocks.deps, ADMIN, { rescueId: 'rsc-other', email: 'new@p.example' } as never)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('persists the invitation and returns the plain-text token once', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    const order: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      return {
        rows: [
          {
            invitation_id: 'inv-1',
            email: 'new@p.example',
            rescue_id: 'rsc-1',
            user_id: null,
            title: null,
            invited_by: STAFF.userId,
            expiration: new Date('2026-06-08T00:00:00Z'),
            used: false,
            created_at: new Date('2026-06-01T00:00:00Z'),
          },
        ],
      };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await inviteStaff(mocks.deps, STAFF, {
      rescueId: 'rsc-1',
      email: 'new@p.example',
      title: 'Volunteer',
    } as never);

    expect(res.invitation.invitationId).toBe('inv-1');
    expect(res.token).toMatch(/^[0-9a-f]{64}$/);
    expect(order).toEqual(['BEGIN', 'INSERT', 'COMMIT', 'NATS_PUBLISH']);
  });

  it('upserts on the pending-email conflict instead of inserting a duplicate row', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    let insertSql = '';
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql.trim().startsWith('INSERT')) {
        insertSql = sql;
      }
      return {
        rows: [
          {
            invitation_id: 'inv-existing',
            email: 'dup@p.example',
            rescue_id: 'rsc-1',
            user_id: null,
            title: 'Refreshed',
            invited_by: STAFF.userId,
            expiration: new Date('2026-06-15T00:00:00Z'),
            used: false,
            created_at: new Date('2026-06-01T00:00:00Z'),
          },
        ],
      };
    });

    const res = await inviteStaff(mocks.deps, STAFF, {
      rescueId: 'rsc-1',
      email: 'dup@p.example',
      title: 'Refreshed',
    } as never);

    // The write targets the partial-unique conflict and refreshes the
    // existing row's token + expiry rather than inserting a second row.
    expect(insertSql).toMatch(/ON CONFLICT/i);
    expect(insertSql).toMatch(/lower\(email\)/i);
    expect(insertSql).toMatch(/DO UPDATE/i);
    expect(insertSql).toMatch(/token = EXCLUDED\.token/i);
    expect(insertSql).toMatch(/expiration = EXCLUDED\.expiration/i);
    // The returned invitation carries the EXISTING row's id (no duplicate).
    expect(res.invitation.invitationId).toBe('inv-existing');
  });

  it('keys the published event on the persisted invitation id (stable on refresh)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    mocks.clientMock.query.mockResolvedValue({
      rows: [
        {
          invitation_id: 'inv-existing',
          email: 'dup@p.example',
          rescue_id: 'rsc-1',
          user_id: null,
          title: null,
          invited_by: STAFF.userId,
          expiration: new Date('2026-06-15T00:00:00Z'),
          used: false,
          created_at: new Date('2026-06-01T00:00:00Z'),
        },
      ],
    });

    await inviteStaff(mocks.deps, STAFF, {
      rescueId: 'rsc-1',
      email: 'dup@p.example',
    } as never);

    const published = mocks.natsMock.publish.mock.calls[0];
    const opts = published[2] as { msgID?: string };
    expect(opts.msgID).toBe('rescue.staffInvited.inv-existing');
  });
});

describe('HandlerError', () => {
  it('carries the code', () => {
    expect(new HandlerError('NOT_FOUND', 'x').code).toBe('NOT_FOUND');
  });
});

describe('listRescues — new filters', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('threads a free-text name search as ILIKE %term%', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listRescues(mocks.deps, ADOPTER, {
      limit: 0,
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
      nameSearch: 'happy',
    } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    const params = mocks.poolMock.query.mock.calls[0][1] as unknown[];
    expect(sql).toContain('ILIKE');
    expect(params).toContain('%happy%');
  });

  it('randomize switches ORDER BY to random()', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listRescues(mocks.deps, ADOPTER, {
      limit: 0,
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
      randomize: true,
    } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY random()');
    expect(sql).not.toContain('created_at DESC');
  });

  it('lat/lng/radius today maps to an impossible WHERE (no geo columns in the schema yet)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await listRescues(mocks.deps, ADOPTER, {
      limit: 0,
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED,
      latitude: 53.96,
      longitude: -1.08,
      radiusKm: 25,
    } as never);
    const sql = mocks.poolMock.query.mock.calls[0][0] as string;
    expect(sql).toContain('FALSE');
  });
});

// --- updateRescuePlan ------------------------------------------------

describe('updateRescuePlan', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('INVALID_ARGUMENT for an unknown plan tier', async () => {
    await expect(
      updateRescuePlan(mocks.deps, ADMIN, { rescueId: 'rsc-1', plan: 'platinum' } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    // The bad-plan guard fires before any DB read.
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('PERMISSION_DENIED for a non-admin', async () => {
    await expect(
      updateRescuePlan(mocks.deps, STAFF, { rescueId: 'rsc-1', plan: 'growth' } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('NOT_FOUND when the rescue is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      updateRescuePlan(mocks.deps, ADMIN, { rescueId: 'ghost', plan: 'growth' } as never)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('writes the plan + expiry and publishes rescue.planUpdated after commit', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow({ plan: 'free' })] });
    const order: string[] = [];
    const publishedSubjects: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql.trim().split(/\s+/)[0]);
      return { rows: [rescueRow({ plan: 'professional' })] };
    });
    mocks.natsMock.publish.mockImplementation((subject: string) => {
      order.push('NATS_PUBLISH');
      publishedSubjects.push(subject);
    });

    const res = await updateRescuePlan(mocks.deps, ADMIN, {
      rescueId: 'rsc-1',
      plan: 'professional',
      planExpiresAt: '2027-01-01T00:00:00.000Z',
    } as never);

    expect(res.rescue.plan).toBe('professional');
    expect(order).toEqual(['BEGIN', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
    expect(publishedSubjects).toEqual(['rescue.planUpdated']);
    // The UPDATE binds the parsed expiry as a Date, not the raw string.
    const params = mocks.clientMock.query.mock.calls[1][1] as unknown[];
    expect(params[1]).toBeInstanceOf(Date);
  });

  it('treats an empty planExpiresAt as null (clears the expiry)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    mocks.clientMock.query.mockResolvedValue({ rows: [rescueRow({ plan: 'growth' })] });

    await updateRescuePlan(mocks.deps, ADMIN, {
      rescueId: 'rsc-1',
      plan: 'growth',
      planExpiresAt: '',
    } as never);

    const params = mocks.clientMock.query.mock.calls[1][1] as unknown[];
    expect(params[1]).toBeNull();
  });
});

// --- getRescueStatistics ---------------------------------------------

describe('getRescueStatistics', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('PERMISSION_DENIED without rescues.read', async () => {
    const noRead: Principal = {
      userId: 'usr-x' as UserId,
      roles: ['adopter'],
      permissions: [],
    };
    await expect(
      getRescueStatistics(mocks.deps, noRead, { rescueId: 'rsc-1' } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('NOT_FOUND when the rescue is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      getRescueStatistics(mocks.deps, ADOPTER, { rescueId: 'ghost' } as never)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the real staff_count with zero defaults for cross-vertical fields', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [rescueRow()] })
      .mockResolvedValueOnce({ rows: [{ count: '4' }] });

    const res = await getRescueStatistics(mocks.deps, ADOPTER, { rescueId: 'rsc-1' } as never);

    expect(res.statistics.staffCount).toBe(4);
    expect(res.statistics.totalPets).toBe(0);
    expect(res.statistics.totalApplications).toBe(0);
    expect(res.statistics.averageTimeToAdoption).toBe(0);
  });
});

// --- countRescues ----------------------------------------------------

describe('countRescues', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('PERMISSION_DENIED without rescues.read', async () => {
    const noRead: Principal = {
      userId: 'usr-x' as UserId,
      roles: ['adopter'],
      permissions: [],
    };
    await expect(countRescues(mocks.deps, noRead, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('maps the grouped count into per-status fields and a summed total', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [
        { status: 'verified', count: '150' },
        { status: 'pending', count: '12' },
        { status: 'suspended', count: '3' },
      ],
    });

    const res = await countRescues(mocks.deps, ADOPTER, {});

    expect(res.verified).toBe(150);
    expect(res.pending).toBe(12);
    expect(res.suspended).toBe(3);
    expect(res.inactive).toBe(0);
    expect(res.rejected).toBe(0);
    expect(res.total).toBe(165);
  });

  it('runs a single grouped count (no per-status fan-out, uncapped)', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ status: 'verified', count: '0' }] });

    await countRescues(mocks.deps, ADOPTER, {});

    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
    const [sql] = mocks.poolMock.query.mock.calls[0] as [string];
    expect(sql).toMatch(/GROUP BY status/);
  });

  it('returns all-zero counts when there are no rescues', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    const res = await countRescues(mocks.deps, ADOPTER, {});

    expect(res).toEqual({
      pending: 0,
      verified: 0,
      suspended: 0,
      inactive: 0,
      rejected: 0,
      total: 0,
    });
  });
});

// --- sendRescueEmail -------------------------------------------------

describe('sendRescueEmail', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('INVALID_ARGUMENT when neither a template nor subject+body is supplied', async () => {
    await expect(
      sendRescueEmail(mocks.deps, ADMIN, { rescueId: 'rsc-1' } as never)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('PERMISSION_DENIED for a non-admin', async () => {
    await expect(
      sendRescueEmail(mocks.deps, STAFF, {
        rescueId: 'rsc-1',
        templateId: 'tmpl_welcome',
      } as never)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('NOT_FOUND when the rescue is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      sendRescueEmail(mocks.deps, ADMIN, {
        rescueId: 'ghost',
        templateId: 'tmpl_welcome',
      } as never)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('publishes rescue.adminEmailRequested for a custom email and returns queued', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [rescueRow()] });
    const publishedSubjects: string[] = [];
    mocks.natsMock.publish.mockImplementation((subject: string) => publishedSubjects.push(subject));

    const res = await sendRescueEmail(mocks.deps, ADMIN, {
      rescueId: 'rsc-1',
      subject: 'Hello',
      body: 'A message',
    } as never);

    expect(res.queued).toBe(true);
    expect(publishedSubjects).toEqual(['rescue.adminEmailRequested']);
  });
});
