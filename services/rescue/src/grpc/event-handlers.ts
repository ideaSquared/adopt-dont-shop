// gRPC handler implementations for RescueService event RPCs:
// ListEvents, GetEvent, CreateEvent, UpdateEvent, DeleteEvent,
// GetEventAttendees, AddEventAttendee, CheckInAttendee, GetEventAnalytics.
//
// Events are rescue-owned: every query is scoped by rescue_id taken from
// principal.rescueId (set by the auth middleware from x-rescue-id).
// super_admin bypasses rescue scoping on reads.
//
// Follows the same (deps, principal, req) → Promise<Res> shape as the
// other handler files in this directory.

import { randomUUID } from 'node:crypto';

import type { Logger } from 'winston';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';
import {
  RescueV1,
  type AddEventAttendeeRequest,
  type AddEventAttendeeResponse,
  type CheckInAttendeeRequest,
  type CheckInAttendeeResponse,
  type CreateEventRequest,
  type CreateEventResponse,
  type DeleteEventRequest,
  type DeleteEventResponse,
  type GetEventAnalyticsRequest,
  type GetEventAnalyticsResponse,
  type GetEventAttendeesRequest,
  type GetEventAttendeesResponse,
  type GetEventRequest,
  type GetEventResponse,
  type ListEventsRequest,
  type ListEventsResponse,
  type RescueEvent,
  type RescueEventAnalytics,
  type RescueEventAttendee,
  type UpdateEventRequest,
  type UpdateEventResponse,
} from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from './applications-client.js';
import { HandlerError, type HandlerDeps } from './handlers.js';
import { principalToMetadata } from './principal.js';

// ── Permissions ─────────────────────────────────────────────────────────

const EVENTS_READ: Permission = 'events.read' as Permission;
const EVENTS_CREATE: Permission = 'events.create' as Permission;
const EVENTS_UPDATE: Permission = 'events.update' as Permission;
const EVENTS_DELETE: Permission = 'events.delete' as Permission;

// ── Adoption attribution (ADS-941) ────────────────────────────────────────
//
// adoptionsFromEvent uses a "registered → later adopted" attribution
// model: an adoption is attributed to event X when a user who
// REGISTERED for event X (rescue.event_attendees — every registrant,
// not just those who checked in) later has an application AT THIS EVENT'S
// RESCUE (rescue_id is passed to CountAdoptedAdopters, ADS-1023 — an
// adopter who adopted from a different rescue doesn't count) that reaches
// APPROVED or ADOPTED status. Attribution is by adopter identity within
// a bounded post-event window, not by any adoption↔event link table.
//
// The count is DISTINCT ADOPTERS, not applications — an adopter with
// two qualifying applications after the event still counts once. The
// proto field is named `adoptions_from_event`, and its own comment
// ("how many adoptions were driven by this event") is satisfied either
// way in the common case (one adopter, one adoption); we chose the
// adopter-count reading because that's what the product decision this
// ticket implements explicitly asked for.
//
// Window: 90 days after the event's start_date, bounding
// actioned_at — WHEN THE APPLICATION REACHED APPROVED/ADOPTED (ADS-1025;
// service.applications stamps this from the deciding event, not from
// created_at) — not the application's creation date. A reasonable
// adoption-cycle length (submit → review → home visit → decision).
// Single named constant so it's easy to find and retune.
const ATTRIBUTION_WINDOW_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Mirrors service.applications' CountAdoptedAdopters k-anonymity floor
// (MIN_COHORT_SIZE, ADS-1006). Kept in sync by value rather than imported —
// services do not depend on each other's source.
const ATTRIBUTION_MIN_COHORT = 20;
// Mirrors service.applications' CountAdoptedAdopters adopter_ids cap
// (MAX_ADOPTER_IDS, ADS-1024). An event with more registrants than this
// can't be attributed in one call; countAdoptionsFromEvent fails with a
// clear error rather than silently truncating the registrant list.
const ATTRIBUTION_MAX_COHORT = 10_000;

// grpc-js status codes service.applications can return on CountAdoptedAdopters
// (ADS-1022). Kept as local numeric constants — same pattern as the pets
// client mapping in staff-foster-handlers.ts. INVALID_ARGUMENT and any
// unmapped status fall through to INTERNAL, so only the mapped ones are named.
const GRPC_DEADLINE_EXCEEDED = 4;
const GRPC_PERMISSION_DENIED = 7;
const GRPC_UNAVAILABLE = 14;

// ── DB row types ────────────────────────────────────────────────────────

type EventLocation = {
  type: string;
  address?: string;
  city?: string;
  postcode?: string;
  virtual_link?: string;
  venue?: string;
};

type EventRow = {
  event_id: string;
  rescue_id: string;
  name: string;
  description: string;
  type: 'adoption' | 'fundraising' | 'volunteer' | 'community';
  start_date: Date;
  end_date: Date;
  location: EventLocation;
  capacity: number | null;
  registration_required: boolean;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
  featured_pets: string[];
  assigned_staff: string[];
  is_public: boolean;
  image_url: string | null;
  current_attendance: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

type AttendeeRow = {
  user_id: string;
  name: string;
  email: string;
  registered_at: Date;
  checked_in: boolean;
  checked_in_at: Date | null;
  notes: string | null;
};

const EVENT_SELECT = `
  event_id, rescue_id, name, description, type, start_date, end_date,
  location, capacity, registration_required, status, featured_pets,
  assigned_staff, is_public, image_url, current_attendance,
  created_by, created_at, updated_at
`;

const ATTENDEE_SELECT = `
  user_id, name, email, registered_at, checked_in, checked_in_at, notes
`;

// ── Row → proto ─────────────────────────────────────────────────────────

function eventTypeToProto(v: EventRow['type']): RescueV1.EventType {
  switch (v) {
    case 'adoption':
      return RescueV1.EventType.EVENT_TYPE_ADOPTION;
    case 'fundraising':
      return RescueV1.EventType.EVENT_TYPE_FUNDRAISING;
    case 'volunteer':
      return RescueV1.EventType.EVENT_TYPE_VOLUNTEER;
    case 'community':
      return RescueV1.EventType.EVENT_TYPE_COMMUNITY;
  }
}

function eventTypeFromProto(v: RescueV1.EventType): EventRow['type'] {
  switch (v) {
    case RescueV1.EventType.EVENT_TYPE_ADOPTION:
      return 'adoption';
    case RescueV1.EventType.EVENT_TYPE_FUNDRAISING:
      return 'fundraising';
    case RescueV1.EventType.EVENT_TYPE_VOLUNTEER:
      return 'volunteer';
    default:
      return 'community';
  }
}

function eventStatusToProto(v: EventRow['status']): RescueV1.EventStatus {
  switch (v) {
    case 'draft':
      return RescueV1.EventStatus.EVENT_STATUS_DRAFT;
    case 'published':
      return RescueV1.EventStatus.EVENT_STATUS_PUBLISHED;
    case 'in_progress':
      return RescueV1.EventStatus.EVENT_STATUS_IN_PROGRESS;
    case 'completed':
      return RescueV1.EventStatus.EVENT_STATUS_COMPLETED;
    case 'cancelled':
      return RescueV1.EventStatus.EVENT_STATUS_CANCELLED;
  }
}

function eventStatusFromProto(v: RescueV1.EventStatus): EventRow['status'] {
  switch (v) {
    case RescueV1.EventStatus.EVENT_STATUS_PUBLISHED:
      return 'published';
    case RescueV1.EventStatus.EVENT_STATUS_IN_PROGRESS:
      return 'in_progress';
    case RescueV1.EventStatus.EVENT_STATUS_COMPLETED:
      return 'completed';
    case RescueV1.EventStatus.EVENT_STATUS_CANCELLED:
      return 'cancelled';
    default:
      return 'draft';
  }
}

function rowToEvent(row: EventRow): RescueEvent {
  return {
    id: row.event_id,
    rescueId: row.rescue_id,
    name: row.name,
    description: row.description,
    type: eventTypeToProto(row.type),
    startDate: row.start_date.toISOString(),
    endDate: row.end_date.toISOString(),
    location: {
      type: row.location.type ?? 'physical',
      address: row.location.address,
      city: row.location.city,
      postcode: row.location.postcode,
      virtualLink: row.location.virtual_link,
      venue: row.location.venue,
    },
    capacity: row.capacity ?? undefined,
    registrationRequired: row.registration_required,
    status: eventStatusToProto(row.status),
    featuredPets: row.featured_pets ?? [],
    assignedStaff: row.assigned_staff ?? [],
    isPublic: row.is_public,
    imageUrl: row.image_url ?? undefined,
    currentAttendance: row.current_attendance,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function rowToAttendee(row: AttendeeRow): RescueEventAttendee {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    registeredAt: row.registered_at.toISOString(),
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at?.toISOString(),
    notes: row.notes ?? undefined,
  };
}

// ── Rescue scope helpers ────────────────────────────────────────────────

function isSuperAdmin(principal: Principal): boolean {
  return principal.roles.includes('super_admin');
}

function assertRescueAccess(
  principal: Principal,
  eventRescueId: string,
  permission: Permission
): void {
  if (isSuperAdmin(principal)) {
    return;
  }
  if (!hasPermission(principal, permission)) {
    throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
  }
  if (!principal.rescueId) {
    throw new HandlerError('PERMISSION_DENIED', 'rescue context required');
  }
  if (principal.rescueId !== eventRescueId) {
    throw new HandlerError('PERMISSION_DENIED', 'you may only access events for your own rescue');
  }
}

// ── ListEvents ──────────────────────────────────────────────────────────

export async function listEvents(
  deps: HandlerDeps,
  principal: Principal,
  req: ListEventsRequest
): Promise<ListEventsResponse> {
  if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_READ}' required`);
  }

  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  // Rescue scoping: staff are pinned to their own rescue; super_admin sees all.
  // Fail closed: a non-super-admin without a rescueId gets PERMISSION_DENIED rather
  // than silently seeing every rescue's events.
  if (!isSuperAdmin(principal)) {
    if (!principal.rescueId) {
      throw new HandlerError('PERMISSION_DENIED', 'rescue context required');
    }
    params.push(principal.rescueId);
    conditions.push(`rescue_id = $${params.length}`);
  }

  if (req.type) {
    params.push(req.type);
    conditions.push(`type = $${params.length}`);
  }
  if (req.status) {
    params.push(req.status);
    conditions.push(`status = $${params.length}`);
  }
  if (req.startDate) {
    params.push(req.startDate);
    conditions.push(`start_date >= $${params.length}`);
  }
  if (req.endDate) {
    params.push(req.endDate);
    conditions.push(`end_date <= $${params.length}`);
  }
  if (req.search) {
    params.push(`%${req.search}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  if (req.assignedStaff) {
    params.push(req.assignedStaff);
    conditions.push(`$${params.length} = ANY(assigned_staff)`);
  }
  if (req.isPublic !== undefined && req.isPublic !== null) {
    params.push(req.isPublic);
    conditions.push(`is_public = $${params.length}`);
  }

  const where = conditions.join(' AND ');
  const res = await deps.pool.query<EventRow>(
    `SELECT ${EVENT_SELECT} FROM rescue.events WHERE ${where} ORDER BY start_date ASC`,
    params
  );
  return { events: res.rows.map(rowToEvent) };
}

// ── GetEvent ────────────────────────────────────────────────────────────

export async function getEvent(
  deps: HandlerDeps,
  principal: Principal,
  req: GetEventRequest
): Promise<GetEventResponse> {
  if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_READ}' required`);
  }
  if (!req.id) {
    throw new HandlerError('INVALID_ARGUMENT', 'id is required');
  }

  const res = await deps.pool.query<EventRow>(
    `SELECT ${EVENT_SELECT} FROM rescue.events WHERE event_id = $1 AND deleted_at IS NULL`,
    [req.id]
  );
  const row = res.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `event ${req.id} not found`);
  }

  assertRescueAccess(principal, row.rescue_id, EVENTS_READ);
  return { event: rowToEvent(row) };
}

// ── CreateEvent ─────────────────────────────────────────────────────────

export async function createEvent(
  deps: HandlerDeps,
  principal: Principal,
  req: CreateEventRequest
): Promise<CreateEventResponse> {
  if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_CREATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_CREATE}' required`);
  }
  if (!req.name) {
    throw new HandlerError('INVALID_ARGUMENT', 'name is required');
  }
  if (!req.startDate || !req.endDate) {
    throw new HandlerError('INVALID_ARGUMENT', 'start_date and end_date are required');
  }

  const rescueId = principal.rescueId;
  if (!rescueId && !isSuperAdmin(principal)) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue context required');
  }

  const eventId = randomUUID();
  const typeDb = eventTypeFromProto(req.type ?? RescueV1.EventType.EVENT_TYPE_COMMUNITY);
  const location: EventLocation = {
    type: req.location?.type ?? 'physical',
    address: req.location?.address,
    city: req.location?.city,
    postcode: req.location?.postcode,
    virtual_link: req.location?.virtualLink,
    venue: req.location?.venue,
  };

  let inserted: EventRow | undefined;

  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<EventRow>(
      `
      INSERT INTO rescue.events (
        event_id, rescue_id, name, description, type,
        start_date, end_date, location, capacity,
        registration_required, status, featured_pets,
        assigned_staff, is_public, image_url,
        current_attendance, created_by, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8::jsonb, $9,
        $10, 'draft', $11::uuid[],
        $12::uuid[], $13, $14,
        0, $15, now(), now()
      )
      RETURNING ${EVENT_SELECT}
      `,
      [
        eventId,
        rescueId,
        req.name,
        req.description ?? '',
        typeDb,
        req.startDate,
        req.endDate,
        JSON.stringify(location),
        req.capacity ?? null,
        req.registrationRequired ?? false,
        `{${(req.featuredPets ?? []).join(',')}}`,
        `{${(req.assignedStaff ?? []).join(',')}}`,
        req.isPublic ?? true,
        req.imageUrl ?? null,
        principal.userId,
      ]
    );
    inserted = result.rows[0];
    publish({
      type: 'rescue.eventCreated',
      id: `rescue.eventCreated.${eventId}`,
      payload: { eventId, rescueId, name: req.name, createdBy: principal.userId },
    });
  });

  if (!inserted) {
    throw new HandlerError('INTERNAL', 'insert returned no rows');
  }
  return { event: rowToEvent(inserted) };
}

// ── UpdateEvent ─────────────────────────────────────────────────────────

export async function updateEvent(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdateEventRequest
): Promise<UpdateEventResponse> {
  if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_UPDATE}' required`);
  }
  if (!req.id) {
    throw new HandlerError('INVALID_ARGUMENT', 'id is required');
  }

  const existing = await deps.pool.query<EventRow>(
    `SELECT ${EVENT_SELECT} FROM rescue.events WHERE event_id = $1 AND deleted_at IS NULL`,
    [req.id]
  );
  const row = existing.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `event ${req.id} not found`);
  }
  assertRescueAccess(principal, row.rescue_id, EVENTS_UPDATE);

  // Build the SET clause only for provided fields.
  const setClauses: string[] = ['updated_at = now()'];
  const params: unknown[] = [];

  const push = (expr: string, value: unknown) => {
    params.push(value);
    setClauses.push(`${expr} = $${params.length}`);
  };

  if (req.name !== undefined && req.name !== null) {
    push('name', req.name);
  }
  if (req.description !== undefined && req.description !== null) {
    push('description', req.description);
  }
  if (req.type !== undefined && req.type !== null) {
    push('type', eventTypeFromProto(req.type));
  }
  if (req.startDate !== undefined && req.startDate !== null) {
    push('start_date', req.startDate);
  }
  if (req.endDate !== undefined && req.endDate !== null) {
    push('end_date', req.endDate);
  }
  if (req.location !== undefined && req.location !== null) {
    const loc: EventLocation = {
      type: req.location.type ?? 'physical',
      address: req.location.address,
      city: req.location.city,
      postcode: req.location.postcode,
      virtual_link: req.location.virtualLink,
      venue: req.location.venue,
    };
    params.push(JSON.stringify(loc));
    setClauses.push(`location = $${params.length}::jsonb`);
  }
  if (req.capacity !== undefined && req.capacity !== null) {
    push('capacity', req.capacity);
  }
  if (req.registrationRequired !== undefined && req.registrationRequired !== null) {
    push('registration_required', req.registrationRequired);
  }
  if (req.hasFeaturedPets) {
    params.push(`{${(req.featuredPets ?? []).join(',')}}`);
    setClauses.push(`featured_pets = $${params.length}::uuid[]`);
  }
  if (req.hasAssignedStaff) {
    params.push(`{${(req.assignedStaff ?? []).join(',')}}`);
    setClauses.push(`assigned_staff = $${params.length}::uuid[]`);
  }
  if (req.isPublic !== undefined && req.isPublic !== null) {
    push('is_public', req.isPublic);
  }
  if (req.imageUrl !== undefined && req.imageUrl !== null) {
    push('image_url', req.imageUrl);
  }
  if (req.status !== undefined && req.status !== null) {
    push('status', eventStatusFromProto(req.status));
  }

  params.push(req.id);
  const idParam = `$${params.length}`;

  let updated: EventRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<EventRow>(
      `UPDATE rescue.events SET ${setClauses.join(', ')}
       WHERE event_id = ${idParam} AND deleted_at IS NULL
       RETURNING ${EVENT_SELECT}`,
      params
    );
    updated = result.rows[0];
    // Only publish when a row was actually updated. A concurrent soft-delete
    // can make the UPDATE ... WHERE deleted_at IS NULL match zero rows; the
    // handler then throws NOT_FOUND below, so emitting the event here would be
    // a phantom event for a no-op (ADS-1176 — mirrors updateRescue's guard).
    if (updated) {
      publish({
        type: 'rescue.eventUpdated',
        id: `rescue.eventUpdated.${req.id}`,
        payload: { eventId: req.id, updatedBy: principal.userId },
      });
    }
  });

  if (!updated) {
    throw new HandlerError('NOT_FOUND', `event ${req.id} not found`);
  }
  return { event: rowToEvent(updated) };
}

// ── DeleteEvent ─────────────────────────────────────────────────────────

export async function deleteEvent(
  deps: HandlerDeps,
  principal: Principal,
  req: DeleteEventRequest
): Promise<DeleteEventResponse> {
  if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_DELETE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_DELETE}' required`);
  }
  if (!req.id) {
    throw new HandlerError('INVALID_ARGUMENT', 'id is required');
  }

  const existing = await deps.pool.query<EventRow>(
    `SELECT event_id, rescue_id FROM rescue.events WHERE event_id = $1 AND deleted_at IS NULL`,
    [req.id]
  );
  const row = existing.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `event ${req.id} not found`);
  }
  assertRescueAccess(principal, row.rescue_id, EVENTS_DELETE);

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(`UPDATE rescue.events SET deleted_at = now() WHERE event_id = $1`, [req.id]);
    publish({
      type: 'rescue.eventDeleted',
      id: `rescue.eventDeleted.${req.id}`,
      payload: { eventId: req.id, deletedBy: principal.userId },
    });
  });

  return {};
}

// ── GetEventAttendees ───────────────────────────────────────────────────

export async function getEventAttendees(
  deps: HandlerDeps,
  principal: Principal,
  req: GetEventAttendeesRequest
): Promise<GetEventAttendeesResponse> {
  if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_READ}' required`);
  }

  const eventRes = await deps.pool.query<Pick<EventRow, 'event_id' | 'rescue_id'>>(
    `SELECT event_id, rescue_id FROM rescue.events
     WHERE event_id = $1 AND deleted_at IS NULL`,
    [req.eventId]
  );
  const event = eventRes.rows[0];
  if (!event) {
    throw new HandlerError('NOT_FOUND', `event ${req.eventId} not found`);
  }
  assertRescueAccess(principal, event.rescue_id, EVENTS_READ);

  const res = await deps.pool.query<AttendeeRow>(
    `SELECT ${ATTENDEE_SELECT} FROM rescue.event_attendees
     WHERE event_id = $1 ORDER BY registered_at ASC`,
    [req.eventId]
  );
  return { attendees: res.rows.map(rowToAttendee) };
}

// ── AddEventAttendee ────────────────────────────────────────────────────

export async function addEventAttendee(
  deps: HandlerDeps,
  principal: Principal,
  req: AddEventAttendeeRequest
): Promise<AddEventAttendeeResponse> {
  if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_UPDATE}' required`);
  }
  if (!req.eventId || !req.userId || !req.name || !req.email) {
    throw new HandlerError('INVALID_ARGUMENT', 'event_id, user_id, name, and email are required');
  }

  const eventRes = await deps.pool.query<Pick<EventRow, 'event_id' | 'rescue_id'>>(
    `SELECT event_id, rescue_id FROM rescue.events
     WHERE event_id = $1 AND deleted_at IS NULL`,
    [req.eventId]
  );
  const event = eventRes.rows[0];
  if (!event) {
    throw new HandlerError('NOT_FOUND', `event ${req.eventId} not found`);
  }
  assertRescueAccess(principal, event.rescue_id, EVENTS_UPDATE);

  const attendeeId = randomUUID();
  let inserted: AttendeeRow | undefined;

  await withTransaction(deps, async ({ client }) => {
    const result = await client.query<AttendeeRow>(
      `
      INSERT INTO rescue.event_attendees (
        attendee_id, event_id, user_id, name, email,
        registered_at, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, now(), $6, now(), now())
      ON CONFLICT (event_id, user_id) DO NOTHING
      RETURNING ${ATTENDEE_SELECT}
      `,
      [attendeeId, req.eventId, req.userId, req.name, req.email, req.notes ?? null]
    );
    inserted = result.rows[0];
  });

  if (!inserted) {
    throw new HandlerError('ALREADY_EXISTS', `attendee ${req.userId} is already registered`);
  }
  return { attendee: rowToAttendee(inserted) };
}

// ── CheckInAttendee ─────────────────────────────────────────────────────

export async function checkInAttendee(
  deps: HandlerDeps,
  principal: Principal,
  req: CheckInAttendeeRequest
): Promise<CheckInAttendeeResponse> {
  if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_UPDATE}' required`);
  }

  const eventRes = await deps.pool.query<Pick<EventRow, 'event_id' | 'rescue_id'>>(
    `SELECT event_id, rescue_id FROM rescue.events
     WHERE event_id = $1 AND deleted_at IS NULL`,
    [req.eventId]
  );
  const event = eventRes.rows[0];
  if (!event) {
    throw new HandlerError('NOT_FOUND', `event ${req.eventId} not found`);
  }
  assertRescueAccess(principal, event.rescue_id, EVENTS_UPDATE);

  let updated: AttendeeRow | undefined;

  await withTransaction(deps, async ({ client }) => {
    const result = await client.query<AttendeeRow>(
      `
      UPDATE rescue.event_attendees
      SET checked_in = true, checked_in_at = now(), updated_at = now()
      WHERE event_id = $1 AND user_id = $2
      RETURNING ${ATTENDEE_SELECT}
      `,
      [req.eventId, req.userId]
    );
    updated = result.rows[0];
  });

  if (!updated) {
    throw new HandlerError(
      'NOT_FOUND',
      `attendee ${req.userId} not found for event ${req.eventId}`
    );
  }
  return { attendee: rowToAttendee(updated) };
}

// ── GetEventAnalytics ───────────────────────────────────────────────────

// getEventAnalytics is a factory closing over the ApplicationsClient so the
// gRPC server boot injects the real client and tests inject a stub. See
// "Adoption attribution (ADS-941)" above for the counting rule. Direct port
// of staff-foster-handlers.ts's makeCreateFosterPlacement pattern.
export function makeGetEventAnalytics(
  applicationsClient: ApplicationsClient,
  logger: Logger
): (
  deps: HandlerDeps,
  principal: Principal,
  req: GetEventAnalyticsRequest
) => Promise<GetEventAnalyticsResponse> {
  return async (deps, principal, req) => {
    if (!isSuperAdmin(principal) && !hasPermission(principal, EVENTS_READ)) {
      throw new HandlerError('PERMISSION_DENIED', `'${EVENTS_READ}' required`);
    }

    const eventRes = await deps.pool.query<EventRow>(
      `SELECT ${EVENT_SELECT} FROM rescue.events WHERE event_id = $1 AND deleted_at IS NULL`,
      [req.eventId]
    );
    const row = eventRes.rows[0];
    if (!row) {
      throw new HandlerError('NOT_FOUND', `event ${req.eventId} not found`);
    }
    assertRescueAccess(principal, row.rescue_id, EVENTS_READ);

    const countRes = await deps.pool.query<{ total: string; checked_in: string }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE checked_in) AS checked_in
         FROM rescue.event_attendees WHERE event_id = $1`,
      [req.eventId]
    );
    const totalRegistrations = parseInt(countRes.rows[0]?.total ?? '0', 10);
    const actualAttendance = parseInt(countRes.rows[0]?.checked_in ?? '0', 10);
    const attendanceRate =
      totalRegistrations > 0 ? (actualAttendance / totalRegistrations) * 100 : 0;

    const adoptionsFromEvent =
      totalRegistrations > 0
        ? await countAdoptionsFromEvent(
            deps,
            applicationsClient,
            principal,
            req.eventId,
            row,
            logger
          )
        : 0;

    const analytics: RescueEventAnalytics = {
      eventId: row.event_id,
      totalRegistrations,
      actualAttendance,
      attendanceRate,
      adoptionsFromEvent,
    };

    return { analytics };
  };
}

// Resolves the event's registrant ids (every registrant, not just those
// checked in — the attribution model is "registered → later adopted") and
// asks service.applications how many of them have since adopted within the
// window. Forwards the caller's identity so applications runs its own
// ANALYTICS_VIEW gate (ADS-1006).
//
// Downstream failures are mapped by gRPC status rather than flattened to
// INTERNAL (ADS-1022): a caller lacking the analytics permission gets the
// attribution field degraded to 0 (the rest of the analytics — which only
// needs events.read — still returns), transient failures surface as a
// retryable UNAVAILABLE, and everything else is our INTERNAL. Every failure
// path logs exactly one line with the downstream code and event id, and no
// downstream message text is forwarded to the client (ADS-977).
async function countAdoptionsFromEvent(
  deps: HandlerDeps,
  applicationsClient: ApplicationsClient,
  principal: Principal,
  eventId: string,
  event: EventRow,
  logger: Logger
): Promise<number> {
  // Fetch one more than the cap so we can detect "more than the cap"
  // without a separate COUNT query, and without ever silently truncating
  // the registrant list handed to service.applications (ADS-1024).
  const attendeeRes = await deps.pool.query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM rescue.event_attendees WHERE event_id = $1 LIMIT $2`,
    [eventId, ATTRIBUTION_MAX_COHORT + 1]
  );
  const adopterIds = attendeeRes.rows.map(r => r.user_id);
  if (adopterIds.length > ATTRIBUTION_MAX_COHORT) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `event ${eventId} has more than ${ATTRIBUTION_MAX_COHORT} registrants; adoption attribution is not supported at this scale`
    );
  }
  // service.applications enforces a k-anonymity cohort floor on the
  // attribution count (ADS-1006) so it can never become a per-user oracle.
  // Below that floor the RPC would reject with INVALID_ARGUMENT, so skip the
  // call: small events degrade to a 0 attribution count rather than failing.
  if (adopterIds.length < ATTRIBUTION_MIN_COHORT) {
    return 0;
  }

  const actionedAfter = event.start_date.toISOString();
  const actionedBefore = new Date(
    event.start_date.getTime() + ATTRIBUTION_WINDOW_DAYS * MS_PER_DAY
  ).toISOString();

  try {
    // rescue_id (ADS-1023) scopes the count to adoptions at THIS rescue —
    // a registrant who adopted from a different rescue shouldn't inflate
    // this event's attribution number.
    const res = await applicationsClient.countAdoptedAdopters(
      { adopterIds, actionedAfter, actionedBefore, rescueId: event.rescue_id },
      principalToMetadata(principal)
    );
    return res.count;
  } catch (err) {
    const code = (err as { code?: number }).code;
    logger.warn('event adoption attribution failed', {
      eventId,
      grpcCode: code,
      adopterIdCount: adopterIds.length,
    });

    // Caller lacks the admin-only analytics permission the attribution count
    // requires (ADS-1006). Degrade this one field to 0 rather than failing
    // the whole analytics call — registrations/attendance only need
    // events.read, which the caller already holds.
    if (code === GRPC_PERMISSION_DENIED) {
      return 0;
    }

    // Transient downstream conditions — surface as a retryable status
    // distinct from INTERNAL so the caller/SPA can distinguish "try again"
    // from "server fault".
    if (code === GRPC_UNAVAILABLE || code === GRPC_DEADLINE_EXCEEDED) {
      throw new HandlerError('UNAVAILABLE', 'adoption attribution temporarily unavailable');
    }

    // INVALID_ARGUMENT is our request-construction bug, not the caller's;
    // it and any unmapped status are an INTERNAL fault. Message stays generic
    // so no downstream internals leak (ADS-977).
    throw new HandlerError('INTERNAL', 'failed to resolve adoption attribution');
  }
}
