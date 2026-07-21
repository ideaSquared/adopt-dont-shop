import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';
import { RescueV1 } from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from './applications-client.js';
import type { HandlerDeps } from './handlers.js';
import {
  addEventAttendee,
  checkInAttendee,
  createEvent,
  deleteEvent,
  getEvent,
  getEventAttendees,
  listEvents,
  makeGetEventAnalytics,
  updateEvent,
} from './event-handlers.js';

const RESCUE_ID = 'rsc-1';
const EVENT_ID = 'evt-1';
const USER_ID = 'usr-staff';

const STAFF: Principal = {
  userId: USER_ID as UserId,
  roles: ['rescue_staff'],
  permissions: [
    'events.read' as Permission,
    'events.create' as Permission,
    'events.update' as Permission,
    'events.delete' as Permission,
  ],
  rescueId: RESCUE_ID as RescueId,
};

const STAFF_READ_ONLY: Principal = {
  userId: USER_ID as UserId,
  roles: ['rescue_staff'],
  permissions: ['events.read' as Permission],
  rescueId: RESCUE_ID as RescueId,
};

const STAFF_NO_RESCUE: Principal = {
  userId: USER_ID as UserId,
  roles: ['rescue_staff'],
  permissions: [
    'events.read' as Permission,
    'events.create' as Permission,
    'events.update' as Permission,
    'events.delete' as Permission,
  ],
  // rescueId intentionally absent — simulates stale token / role misconfiguration
};

const UNPRIVILEGED: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const SUPER_ADMIN: Principal = {
  userId: 'usr-super' as UserId,
  roles: ['super_admin'],
  permissions: [],
};

function makeClientQuery() {
  const script: Array<{ rows: unknown[] }> = [];
  const fn = vi.fn().mockImplementation(async (sql: string) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [] };
    }
    return script.shift() ?? { rows: [] };
  });
  return { fn, push: (rows: unknown[]) => script.push({ rows }) };
}

function makeMocks() {
  const c = makeClientQuery();
  const client = { query: c.fn, release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn() };
  pool.query.mockResolvedValue({ rows: [] });
  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool, clientMock: client, clientScript: c.push };
}

const eventRow = (overrides: Record<string, unknown> = {}) => ({
  event_id: EVENT_ID,
  rescue_id: RESCUE_ID,
  name: 'Adoption Day',
  description: 'Come adopt a pet!',
  type: 'adoption' as const,
  start_date: new Date('2026-07-01T10:00:00Z'),
  end_date: new Date('2026-07-01T16:00:00Z'),
  location: { type: 'physical', address: '1 Main St', city: 'London', postcode: 'SW1A 1AA' },
  capacity: 50,
  registration_required: false,
  status: 'draft' as const,
  featured_pets: [],
  assigned_staff: [],
  is_public: true,
  image_url: null,
  current_attendance: 0,
  created_by: USER_ID,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

const attendeeRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'usr-attendee',
  name: 'Alice Smith',
  email: 'alice@example.com',
  registered_at: new Date('2026-06-15T00:00:00Z'),
  checked_in: false,
  checked_in_at: null,
  notes: null,
  ...overrides,
});

// ── ListEvents ──────────────────────────────────────────────────────────

describe('listEvents', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without events.read', async () => {
    await expect(listEvents(mocks.deps, UNPRIVILEGED, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it("returns events for the caller's rescue", async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    const res = await listEvents(mocks.deps, STAFF, {});
    expect(res.events).toHaveLength(1);
    expect(res.events[0].id).toBe(EVENT_ID);
    expect(res.events[0].name).toBe('Adoption Day');
    expect(res.events[0].rescueId).toBe(RESCUE_ID);
  });

  it('returns empty array when no events exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    const res = await listEvents(mocks.deps, STAFF, {});
    expect(res.events).toEqual([]);
  });

  it('maps event type to proto enum', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow({ type: 'fundraising' })] });
    const res = await listEvents(mocks.deps, STAFF, {});
    expect(res.events[0].type).toBe(RescueV1.EventType.EVENT_TYPE_FUNDRAISING);
  });

  it('maps event status to proto enum', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow({ status: 'published' })] });
    const res = await listEvents(mocks.deps, STAFF, {});
    expect(res.events[0].status).toBe(RescueV1.EventStatus.EVENT_STATUS_PUBLISHED);
  });

  it('super_admin can list without a rescue scope', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    const res = await listEvents(mocks.deps, SUPER_ADMIN, {});
    expect(res.events).toHaveLength(1);
  });

  it('rejects non-super-admin with events.read but no rescueId', async () => {
    await expect(listEvents(mocks.deps, STAFF_NO_RESCUE, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

// ── GetEvent ────────────────────────────────────────────────────────────

describe('getEvent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without events.read', async () => {
    await expect(getEvent(mocks.deps, UNPRIVILEGED, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns a single event by id', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    const res = await getEvent(mocks.deps, STAFF, { id: EVENT_ID });
    expect(res.event?.id).toBe(EVENT_ID);
  });

  it('throws NOT_FOUND when the event does not exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(getEvent(mocks.deps, STAFF, { id: 'nonexistent' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws PERMISSION_DENIED for events belonging to a different rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [eventRow({ rescue_id: 'rsc-other' })],
    });
    await expect(getEvent(mocks.deps, STAFF, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects missing id argument', async () => {
    await expect(getEvent(mocks.deps, STAFF, { id: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects principal with events.read but no rescueId', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    await expect(getEvent(mocks.deps, STAFF_NO_RESCUE, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

// ── CreateEvent ─────────────────────────────────────────────────────────

describe('createEvent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without events.create', async () => {
    await expect(
      createEvent(mocks.deps, STAFF_READ_ONLY, {
        name: 'Event',
        description: '',
        type: RescueV1.EventType.EVENT_TYPE_ADOPTION,
        startDate: '2026-07-01T10:00:00Z',
        endDate: '2026-07-01T16:00:00Z',
        location: { type: 'physical' },
        registrationRequired: false,
        isPublic: true,
        featuredPets: [],
        assignedStaff: [],
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects missing name', async () => {
    await expect(
      createEvent(mocks.deps, STAFF, {
        name: '',
        description: '',
        type: RescueV1.EventType.EVENT_TYPE_ADOPTION,
        startDate: '2026-07-01T10:00:00Z',
        endDate: '2026-07-01T16:00:00Z',
        location: { type: 'physical' },
        registrationRequired: false,
        isPublic: true,
        featuredPets: [],
        assignedStaff: [],
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('creates an event and returns it with draft status', async () => {
    mocks.clientScript([eventRow()]);
    const res = await createEvent(mocks.deps, STAFF, {
      name: 'Adoption Day',
      description: 'Come adopt a pet!',
      type: RescueV1.EventType.EVENT_TYPE_ADOPTION,
      startDate: '2026-07-01T10:00:00Z',
      endDate: '2026-07-01T16:00:00Z',
      location: { type: 'physical', address: '1 Main St', city: 'London', postcode: 'SW1A 1AA' },
      registrationRequired: false,
      isPublic: true,
      featuredPets: [],
      assignedStaff: [],
    });
    expect(res.event?.id).toBe(EVENT_ID);
    expect(res.event?.status).toBe(RescueV1.EventStatus.EVENT_STATUS_DRAFT);
  });
});

// ── UpdateEvent ─────────────────────────────────────────────────────────

describe('updateEvent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without events.update', async () => {
    await expect(updateEvent(mocks.deps, STAFF_READ_ONLY, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects missing id', async () => {
    await expect(updateEvent(mocks.deps, STAFF, { id: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('throws NOT_FOUND for unknown event', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(updateEvent(mocks.deps, STAFF, { id: 'nonexistent' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('updates the event and returns it', async () => {
    // First query: fetch existing (for rescue scope check). Second: RETURNING.
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    mocks.clientScript([eventRow({ name: 'Updated Name' })]);
    const res = await updateEvent(mocks.deps, STAFF, { id: EVENT_ID, name: 'Updated Name' });
    expect(res.event?.name).toBe('Updated Name');
  });

  it('rejects cross-rescue update', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow({ rescue_id: 'rsc-other' })] });
    await expect(updateEvent(mocks.deps, STAFF, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects principal with events.update but no rescueId', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    await expect(updateEvent(mocks.deps, STAFF_NO_RESCUE, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

// ── DeleteEvent ─────────────────────────────────────────────────────────

describe('deleteEvent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without events.delete', async () => {
    await expect(deleteEvent(mocks.deps, STAFF_READ_ONLY, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('throws NOT_FOUND for unknown event', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(deleteEvent(mocks.deps, STAFF, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('soft-deletes the event and returns empty response', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    mocks.clientScript([eventRow()]);
    const res = await deleteEvent(mocks.deps, STAFF, { id: EVENT_ID });
    expect(res).toEqual({});
  });

  it('rejects cross-rescue delete', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow({ rescue_id: 'rsc-other' })] });
    await expect(deleteEvent(mocks.deps, STAFF, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects principal with events.delete but no rescueId', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    await expect(deleteEvent(mocks.deps, STAFF_NO_RESCUE, { id: EVENT_ID })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

// ── GetEventAttendees ───────────────────────────────────────────────────

describe('getEventAttendees', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without events.read', async () => {
    await expect(
      getEventAttendees(mocks.deps, UNPRIVILEGED, { eventId: EVENT_ID })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws NOT_FOUND when the event does not exist or belongs to another rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(getEventAttendees(mocks.deps, STAFF, { eventId: EVENT_ID })).rejects.toMatchObject(
      { code: 'NOT_FOUND' }
    );
  });

  it('returns attendees for an event', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [eventRow()] })
      .mockResolvedValueOnce({ rows: [attendeeRow()] });
    const res = await getEventAttendees(mocks.deps, STAFF, { eventId: EVENT_ID });
    expect(res.attendees).toHaveLength(1);
    expect(res.attendees[0].userId).toBe('usr-attendee');
    expect(res.attendees[0].checkedIn).toBe(false);
  });

  it('rejects principal with events.read but no rescueId', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    await expect(
      getEventAttendees(mocks.deps, STAFF_NO_RESCUE, { eventId: EVENT_ID })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// ── AddEventAttendee ────────────────────────────────────────────────────

describe('addEventAttendee', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without events.update', async () => {
    await expect(
      addEventAttendee(mocks.deps, STAFF_READ_ONLY, {
        eventId: EVENT_ID,
        userId: 'usr-attendee',
        name: 'Alice',
        email: 'alice@example.com',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws NOT_FOUND when the event does not exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      addEventAttendee(mocks.deps, STAFF, {
        eventId: EVENT_ID,
        userId: 'usr-attendee',
        name: 'Alice',
        email: 'alice@example.com',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('registers an attendee and returns them', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    mocks.clientScript([attendeeRow()]);
    const res = await addEventAttendee(mocks.deps, STAFF, {
      eventId: EVENT_ID,
      userId: 'usr-attendee',
      name: 'Alice Smith',
      email: 'alice@example.com',
    });
    expect(res.attendee?.userId).toBe('usr-attendee');
    expect(res.attendee?.checkedIn).toBe(false);
  });

  it('rejects principal with events.update but no rescueId', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    await expect(
      addEventAttendee(mocks.deps, STAFF_NO_RESCUE, {
        eventId: EVENT_ID,
        userId: 'usr-attendee',
        name: 'Alice',
        email: 'alice@example.com',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// ── CheckInAttendee ─────────────────────────────────────────────────────

describe('checkInAttendee', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects callers without events.update', async () => {
    await expect(
      checkInAttendee(mocks.deps, STAFF_READ_ONLY, {
        eventId: EVENT_ID,
        userId: 'usr-attendee',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws NOT_FOUND when the attendee does not exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    mocks.clientScript([]);
    await expect(
      checkInAttendee(mocks.deps, STAFF, { eventId: EVENT_ID, userId: 'usr-nobody' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('marks the attendee as checked in', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    mocks.clientScript([attendeeRow({ checked_in: true, checked_in_at: new Date() })]);
    const res = await checkInAttendee(mocks.deps, STAFF, {
      eventId: EVENT_ID,
      userId: 'usr-attendee',
    });
    expect(res.attendee?.checkedIn).toBe(true);
  });

  it('rejects principal with events.update but no rescueId', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    await expect(
      checkInAttendee(mocks.deps, STAFF_NO_RESCUE, { eventId: EVENT_ID, userId: 'usr-attendee' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// ── GetEventAnalytics ───────────────────────────────────────────────────

describe('getEventAnalytics', () => {
  let mocks: ReturnType<typeof makeMocks>;
  let applicationsStub: {
    countAdoptedAdopters: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let getEventAnalytics: ReturnType<typeof makeGetEventAnalytics>;

  beforeEach(() => {
    mocks = makeMocks();
    // Default: nobody from the candidate set has adopted.
    applicationsStub = {
      countAdoptedAdopters: vi.fn(async () => ({ count: 0 })),
      close: vi.fn(),
    };
    getEventAnalytics = makeGetEventAnalytics(applicationsStub as unknown as ApplicationsClient);
  });

  it('rejects callers without events.read', async () => {
    await expect(
      getEventAnalytics(mocks.deps, UNPRIVILEGED, { eventId: EVENT_ID })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws NOT_FOUND when the event does not exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(getEventAnalytics(mocks.deps, STAFF, { eventId: EVENT_ID })).rejects.toMatchObject(
      { code: 'NOT_FOUND' }
    );
  });

  it('returns 100% attendanceRate when all registrants checked in', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [eventRow({ status: 'completed' })] })
      .mockResolvedValueOnce({ rows: [{ total: '1', checked_in: '1' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-attendee' }] });
    const res = await getEventAnalytics(mocks.deps, STAFF, { eventId: EVENT_ID });
    expect(res.analytics?.totalRegistrations).toBe(1);
    expect(res.analytics?.actualAttendance).toBe(1);
    expect(res.analytics?.attendanceRate).toBe(100);
  });

  it('returns 50% attendanceRate when half of registrants checked in', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [eventRow({ status: 'active' })] })
      .mockResolvedValueOnce({ rows: [{ total: '2', checked_in: '1' }] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 'usr-attendee' }, { user_id: 'usr-other' }],
      });
    const res = await getEventAnalytics(mocks.deps, STAFF, { eventId: EVENT_ID });
    expect(res.analytics?.totalRegistrations).toBe(2);
    expect(res.analytics?.actualAttendance).toBe(1);
    expect(res.analytics?.attendanceRate).toBe(50);
  });

  it('returns 0% attendanceRate when no registrants', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [eventRow()] })
      .mockResolvedValueOnce({ rows: [{ total: '0', checked_in: '0' }] });
    const res = await getEventAnalytics(mocks.deps, STAFF, { eventId: EVENT_ID });
    expect(res.analytics?.totalRegistrations).toBe(0);
    expect(res.analytics?.actualAttendance).toBe(0);
    expect(res.analytics?.attendanceRate).toBe(0);
    // No registrants → no attribution lookup needed.
    expect(applicationsStub.countAdoptedAdopters).not.toHaveBeenCalled();
  });

  it('rejects principal with events.read but no rescueId', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [eventRow()] });
    await expect(
      getEventAnalytics(mocks.deps, STAFF_NO_RESCUE, { eventId: EVENT_ID })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  // ── adoptionsFromEvent — registered-then-adopted attribution (ADS-941) ──

  it('resolves the registrant ids (not just checked-in attendees) and reports the adopted count', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({
        rows: [eventRow({ status: 'completed', start_date: new Date('2026-07-01T10:00:00Z') })],
      })
      .mockResolvedValueOnce({ rows: [{ total: '2', checked_in: '1' }] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 'usr-registrant-1' }, { user_id: 'usr-registrant-2' }],
      });
    applicationsStub.countAdoptedAdopters.mockResolvedValueOnce({ count: 2 });

    const res = await getEventAnalytics(mocks.deps, STAFF, { eventId: EVENT_ID });

    expect(res.analytics?.adoptionsFromEvent).toBe(2);
    expect(applicationsStub.countAdoptedAdopters).toHaveBeenCalledTimes(1);
    const [req] = applicationsStub.countAdoptedAdopters.mock.calls[0];
    expect(req.adopterIds).toEqual(['usr-registrant-1', 'usr-registrant-2']);
  });

  it('queries a 90-day post-event window anchored on the event start date', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({
        rows: [eventRow({ status: 'completed', start_date: new Date('2026-07-01T10:00:00Z') })],
      })
      .mockResolvedValueOnce({ rows: [{ total: '1', checked_in: '0' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-registrant-1' }] });

    await getEventAnalytics(mocks.deps, STAFF, { eventId: EVENT_ID });

    const [req] = applicationsStub.countAdoptedAdopters.mock.calls[0];
    expect(req.createdAfter).toBe('2026-07-01T10:00:00.000Z');
    expect(req.createdBefore).toBe('2026-09-29T10:00:00.000Z'); // +90 days
  });

  it('returns zero adoptions when nobody in the registrant set has adopted', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [eventRow({ status: 'completed' })] })
      .mockResolvedValueOnce({ rows: [{ total: '1', checked_in: '0' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-registrant-1' }] });
    applicationsStub.countAdoptedAdopters.mockResolvedValueOnce({ count: 0 });

    const res = await getEventAnalytics(mocks.deps, STAFF, { eventId: EVENT_ID });

    expect(res.analytics?.adoptionsFromEvent).toBe(0);
  });

  it('surfaces a downstream attribution failure as INTERNAL rather than silently reporting zero', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [eventRow({ status: 'completed' })] })
      .mockResolvedValueOnce({ rows: [{ total: '1', checked_in: '0' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-registrant-1' }] });
    applicationsStub.countAdoptedAdopters.mockRejectedValueOnce({ code: 14 });

    await expect(getEventAnalytics(mocks.deps, STAFF, { eventId: EVENT_ID })).rejects.toMatchObject(
      { code: 'INTERNAL' }
    );
  });
});
