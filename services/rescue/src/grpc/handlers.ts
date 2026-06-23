// gRPC handler implementations for RescueService.{Create, Get, List,
// Update, Verify, InviteStaff}. Plain async functions over
// (deps, principal, request); the adapter (Phase 4.3c) wraps them in
// `(call, callback)` and maps HandlerError → grpc.status. Same
// pure-handler-plus-thin-adapter shape as service.pets / service.auth.
//
// Discipline:
//   - State-changing handlers run their DB write + NATS event inside
//     @adopt-dont-shop/events.withTransaction so events only fire after
//     commit (publish-after-commit).
//   - Verify is the status-machine command: it validates the transition
//     against the pure status-machine + denormalises verified_at /
//     verification_source / failure_reason in ONE transaction and
//     publishes rescue.verified (or rescue.rejected, etc.) after commit.
//   - InviteStaff mints a high-entropy token, persists the row, and
//     publishes rescue.staffInvited. The token is returned ONCE and
//     never read back through Get/List (the monolith contract).
//   - Permission gating uses @adopt-dont-shop/authz.requirePermission
//     scoped to the rescue (rescue staff can only mutate their own
//     rescue; super_admin bypasses).

import { randomBytes, randomUUID } from 'node:crypto';

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission, RescueId } from '@adopt-dont-shop/lib.types';
import {
  RescueV1,
  type CountRescuesRequest,
  type CountRescuesResponse,
  type CreateRescueRequest,
  type CreateRescueResponse,
  type GetRescueRequest,
  type GetRescueResponse,
  type GetRescueStatisticsRequest,
  type GetRescueStatisticsResponse,
  type InviteStaffRequest,
  type InviteStaffResponse,
  type Invitation,
  type ListRescuesRequest,
  type ListRescuesResponse,
  type Rescue,
  type SendRescueEmailRequest,
  type SendRescueEmailResponse,
  type UpdateRescuePlanRequest,
  type UpdateRescuePlanResponse,
  type UpdateRescueRequest,
  type UpdateRescueResponse,
  type VerifyRescueRequest,
  type VerifyRescueResponse,
} from '@adopt-dont-shop/proto';

import {
  statusFromDb,
  statusToDb,
  verificationSourceFromDb,
  verificationSourceToDb,
  type RescueStatusDb,
  type RescueVerificationSourceDb,
} from './enum-map.js';
import { isLegalTransition } from './status-machine.js';

export type HandlerDeps = WithTransactionDeps;

export type HandlerErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'FAILED_PRECONDITION'
  | 'INTERNAL';

export class HandlerError extends Error {
  constructor(
    public readonly code: HandlerErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}

// --- Row shape -------------------------------------------------------

type RescueRow = {
  rescue_id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  state: string | null;
  zip_code: string;
  country: string;
  website: string | null;
  description: string | null;
  mission: string | null;
  companies_house_number: string | null;
  charity_registration_number: string | null;
  contact_person: string;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: RescueStatusDb;
  verified_at: Date | null;
  verified_by: string | null;
  verification_source: RescueVerificationSourceDb | null;
  verification_failure_reason: string | null;
  settings: Record<string, unknown> | null;
  plan: string;
  plan_expires_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
};

type InvitationRow = {
  invitation_id: string;
  email: string;
  rescue_id: string;
  user_id: string | null;
  title: string | null;
  invited_by: string | null;
  expiration: Date;
  used: boolean;
  created_at: Date;
};

function rowToProto(row: RescueRow): Rescue {
  return {
    rescueId: row.rescue_id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    address: row.address,
    city: row.city,
    county: row.state ?? undefined,
    postcode: row.zip_code,
    country: row.country,
    website: row.website ?? undefined,
    description: row.description ?? undefined,
    mission: row.mission ?? undefined,
    companiesHouseNumber: row.companies_house_number ?? undefined,
    charityRegistrationNumber: row.charity_registration_number ?? undefined,
    contactPerson: row.contact_person,
    contactTitle: row.contact_title ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    status: statusFromDb(row.status),
    verifiedAt: row.verified_at?.toISOString(),
    verifiedBy: row.verified_by ?? undefined,
    verificationSource: row.verification_source
      ? verificationSourceFromDb(row.verification_source)
      : undefined,
    verificationFailureReason: row.verification_failure_reason ?? undefined,
    settingsJson: JSON.stringify(row.settings ?? {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    plan: row.plan,
    planExpiresAt: row.plan_expires_at?.toISOString(),
  };
}

function invitationRowToProto(row: InvitationRow): Invitation {
  return {
    invitationId: row.invitation_id,
    email: row.email,
    rescueId: row.rescue_id,
    userId: row.user_id ?? undefined,
    title: row.title ?? undefined,
    invitedBy: row.invited_by ?? undefined,
    expiration: row.expiration.toISOString(),
    used: row.used,
    createdAt: row.created_at.toISOString(),
  };
}

const RESCUES_SELECT = `
  rescue_id, name, email, phone, address, city, state, zip_code, country,
  website, description, mission, companies_house_number, charity_registration_number,
  contact_person, contact_title, contact_email, contact_phone,
  status, verified_at, verified_by, verification_source, verification_failure_reason,
  settings, plan, plan_expires_at, version, created_at, updated_at
`;

const RESCUES_CREATE: Permission = 'rescues.create' as Permission;
const RESCUES_READ: Permission = 'rescues.read' as Permission;
const RESCUES_UPDATE: Permission = 'rescues.update' as Permission;
const ADMIN_SECURITY_MANAGE: Permission = 'admin.security.manage' as Permission;
const STAFF_CREATE: Permission = 'staff.create' as Permission;

const DEFAULT_INVITATION_TTL_SECONDS = 7 * 24 * 60 * 60;

// --- Create ----------------------------------------------------------

export async function createRescue(
  deps: HandlerDeps,
  principal: Principal,
  req: CreateRescueRequest
): Promise<CreateRescueResponse> {
  if (!req.name) {
    throw new HandlerError('INVALID_ARGUMENT', 'name is required');
  }
  if (!req.email) {
    throw new HandlerError('INVALID_ARGUMENT', 'email is required');
  }
  if (!req.address || !req.city || !req.postcode) {
    throw new HandlerError('INVALID_ARGUMENT', 'address, city, postcode are required');
  }
  if (!req.contactPerson) {
    throw new HandlerError('INVALID_ARGUMENT', 'contact_person is required');
  }
  if (!hasPermission(principal, RESCUES_CREATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${RESCUES_CREATE}' required`);
  }

  const rescueId = randomUUID();
  let inserted: RescueRow | undefined;

  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<RescueRow>(
      `
      INSERT INTO rescue.rescues (
        rescue_id, name, email, phone, address, city, state, zip_code, country,
        website, description, mission, companies_house_number, charity_registration_number,
        contact_person, contact_title, contact_email, contact_phone,
        status, settings, created_by, version, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        'pending', '{}'::jsonb, $19, 0, now(), now()
      )
      RETURNING ${RESCUES_SELECT}
      `,
      [
        rescueId,
        req.name,
        req.email,
        req.phone ?? null,
        req.address,
        req.city,
        req.county ?? null,
        req.postcode,
        req.country || 'GB',
        req.website ?? null,
        req.description ?? null,
        req.mission ?? null,
        req.companiesHouseNumber ?? null,
        req.charityRegistrationNumber ?? null,
        req.contactPerson,
        req.contactTitle ?? null,
        req.contactEmail ?? null,
        req.contactPhone ?? null,
        principal.userId,
      ]
    );
    inserted = result.rows[0];

    publish({
      type: 'rescue.created',
      id: `rescue.created.${rescueId}`,
      payload: { rescueId, name: req.name, createdBy: principal.userId },
    });
  });

  if (!inserted) {
    throw new HandlerError('INTERNAL', 'insert returned no rows');
  }
  return { rescue: rowToProto(inserted) };
}

// --- Get -------------------------------------------------------------

export async function getRescue(
  deps: HandlerDeps,
  principal: Principal,
  req: GetRescueRequest
): Promise<GetRescueResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!hasPermission(principal, RESCUES_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${RESCUES_READ}' required`);
  }

  const row = await fetchRescue(deps, req.rescueId);
  if (!row) {
    throw new HandlerError('NOT_FOUND', `rescue ${req.rescueId} not found`);
  }
  return { rescue: rowToProto(row) };
}

// --- List ------------------------------------------------------------

type ListCursor = { createdAt: string; rescueId: string };

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

export async function listRescues(
  deps: HandlerDeps,
  principal: Principal,
  req: ListRescuesRequest
): Promise<ListRescuesResponse> {
  if (!hasPermission(principal, RESCUES_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${RESCUES_READ}' required`);
  }

  const limit = clampLimit(req.limit);
  const cursor = req.cursor ? parseCursor(req.cursor) : undefined;

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let n = 1;

  // UNSPECIFIED in the filter slot = the public default ("verified
  // only"). super_admin bypasses the default by passing a concrete
  // status; everyone else can still filter on PENDING / SUSPENDED /
  // etc. but won't see them in the default list.
  if (req.statusFilter === RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED) {
    where.push(`status = $${n}`);
    params.push('verified');
    n++;
  } else {
    where.push(`status = $${n}`);
    params.push(statusToDb(req.statusFilter));
    n++;
  }

  // Free-text name search (case-insensitive substring).
  if (req.nameSearch !== undefined && req.nameSearch !== '') {
    where.push(`name ILIKE $${n}`);
    params.push(`%${req.nameSearch}%`);
    n++;
  }

  // "Nearby" — the rescue.rescues schema doesn't carry lat/lng columns
  // today (postcode + city only). Accept the filter at the API boundary
  // so the SPA's /rescues/nearby route is wired, but return an empty
  // result-shape signal by forcing an impossible predicate. A future
  // migration can replace this with a real geo filter (PostGIS, or
  // lat/lng columns + earth_distance) without changing the wire shape.
  if (
    req.latitude !== undefined &&
    req.longitude !== undefined &&
    req.radiusKm !== undefined &&
    req.radiusKm > 0
  ) {
    where.push('FALSE');
  }

  // Keyset cursor is only meaningful in the default (created_at DESC)
  // ordering; randomize bypasses it.
  const useRandom = req.randomize === true;
  if (cursor && !useRandom) {
    where.push(`(created_at, rescue_id) < ($${n}, $${n + 1})`);
    params.push(new Date(cursor.createdAt));
    params.push(cursor.rescueId);
    n += 2;
  }

  const orderBy = useRandom ? 'random()' : 'created_at DESC, rescue_id DESC';

  const result = await deps.pool.query<RescueRow>(
    `
    SELECT ${RESCUES_SELECT} FROM rescue.rescues
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${n}
    `,
    [...params, limit + 1]
  );

  const hasMore = result.rows.length > limit;
  const page = hasMore ? result.rows.slice(0, limit) : result.rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.created_at.toISOString(), rescueId: last.rescue_id })
      : undefined;

  return { rescues: page.map(rowToProto), nextCursor };
}

// --- Update ----------------------------------------------------------

export async function updateRescue(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdateRescueRequest
): Promise<UpdateRescueResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }

  const existing = await fetchRescue(deps, req.rescueId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `rescue ${req.rescueId} not found`);
  }
  if (!requirePermission(principal, RESCUES_UPDATE, { rescueId: req.rescueId as RescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${RESCUES_UPDATE}' required for this rescue`);
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  let n = 1;
  const set = (col: string, val: unknown): void => {
    sets.push(`${col} = $${n}`);
    params.push(val);
    n++;
  };

  if (req.name !== undefined) {
    set('name', req.name);
  }
  if (req.phone !== undefined) {
    set('phone', req.phone);
  }
  if (req.address !== undefined) {
    set('address', req.address);
  }
  if (req.city !== undefined) {
    set('city', req.city);
  }
  if (req.county !== undefined) {
    set('state', req.county);
  }
  if (req.postcode !== undefined) {
    set('zip_code', req.postcode);
  }
  if (req.country !== undefined) {
    set('country', req.country);
  }
  if (req.website !== undefined) {
    set('website', req.website);
  }
  if (req.description !== undefined) {
    set('description', req.description);
  }
  if (req.mission !== undefined) {
    set('mission', req.mission);
  }
  if (req.contactPerson !== undefined) {
    set('contact_person', req.contactPerson);
  }
  if (req.contactTitle !== undefined) {
    set('contact_title', req.contactTitle);
  }
  if (req.contactEmail !== undefined) {
    set('contact_email', req.contactEmail);
  }
  if (req.contactPhone !== undefined) {
    set('contact_phone', req.contactPhone);
  }
  if (req.settingsJson !== undefined) {
    set('settings', req.settingsJson || '{}');
  }

  if (sets.length === 0) {
    return { rescue: rowToProto(existing) };
  }

  set('updated_by', principal.userId);
  sets.push('updated_at = now()');
  sets.push('version = version + 1');

  let updated: RescueRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<RescueRow>(
      `UPDATE rescue.rescues SET ${sets.join(', ')} WHERE rescue_id = $${n} RETURNING ${RESCUES_SELECT}`,
      [...params, req.rescueId]
    );
    updated = result.rows[0];
    // Deterministic idempotency key: aggregateId:version. The UPDATE just
    // bumped version, so each committed update maps to exactly one id and
    // a replay de-dups in JetStream instead of minting a fresh id.
    publish({
      type: 'rescue.updated',
      id: `rescue.updated.${req.rescueId}:${updated?.version}`,
      payload: { rescueId: req.rescueId },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'update returned no rows');
  }
  return { rescue: rowToProto(updated) };
}

// --- Verify (status-machine command) --------------------------------

export async function verifyRescue(
  deps: HandlerDeps,
  principal: Principal,
  req: VerifyRescueRequest
): Promise<VerifyRescueResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (req.toStatus === RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'to_status is required');
  }
  if (!requirePermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  const existing = await fetchRescue(deps, req.rescueId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `rescue ${req.rescueId} not found`);
  }
  const toStatus = statusToDb(req.toStatus);
  if (!isLegalTransition(existing.status, toStatus)) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `illegal status transition ${existing.status} → ${toStatus}`
    );
  }
  // A rejection must carry a reason — the SQL denormalises it onto the
  // row and downstream consumers / the audit trail rely on it.
  if (toStatus === 'rejected' && !req.failureReason) {
    throw new HandlerError('INVALID_ARGUMENT', 'failure_reason is required when rejecting');
  }

  let updated: RescueRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<RescueRow>(
      `
      UPDATE rescue.rescues
      SET status = $1,
          verified_at = CASE WHEN $1 = 'verified' THEN now() ELSE verified_at END,
          verified_by = CASE WHEN $1 = 'verified' THEN $2 ELSE verified_by END,
          verification_source = CASE WHEN $1 = 'verified' THEN $3::rescue_verification_source ELSE verification_source END,
          verification_failure_reason = CASE WHEN $1 = 'rejected' THEN $4 ELSE verification_failure_reason END,
          updated_at = now(), updated_by = $2, version = version + 1
      WHERE rescue_id = $5
      RETURNING ${RESCUES_SELECT}
      `,
      [
        toStatus,
        principal.userId,
        req.verificationSource !== undefined
          ? verificationSourceToDb(req.verificationSource)
          : null,
        req.failureReason ?? null,
        req.rescueId,
      ]
    );
    updated = result.rows[0];

    // Subject mirrors the new status so downstream subscribers can
    // wildcard `rescue.*` or pin a single transition.
    const subject =
      toStatus === 'verified'
        ? 'rescue.verified'
        : toStatus === 'rejected'
          ? 'rescue.rejected'
          : `rescue.statusChanged`;
    publish({
      type: subject,
      id: `${subject}.${req.rescueId}:${updated?.version}`,
      payload: {
        rescueId: req.rescueId,
        fromStatus: existing.status,
        toStatus,
        reason: req.failureReason ?? null,
      },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'verify update returned no rows');
  }
  return { rescue: rowToProto(updated) };
}

// --- InviteStaff -----------------------------------------------------

export async function inviteStaff(
  deps: HandlerDeps,
  principal: Principal,
  req: InviteStaffRequest
): Promise<InviteStaffResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!req.email) {
    throw new HandlerError('INVALID_ARGUMENT', 'email is required');
  }
  // Rescue-portal staff with `staff.create` scoped to this rescue, OR a
  // platform admin with `admin.security.manage` (the admin StaffTab acts
  // cross-rescue — see GetRescueStatistics for the same admin gate).
  if (
    !requirePermission(principal, STAFF_CREATE, { rescueId: req.rescueId as RescueId }) &&
    !hasPermission(principal, ADMIN_SECURITY_MANAGE)
  ) {
    throw new HandlerError('PERMISSION_DENIED', `'${STAFF_CREATE}' required for this rescue`);
  }

  const existing = await fetchRescue(deps, req.rescueId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `rescue ${req.rescueId} not found`);
  }

  const invitationId = randomUUID();
  // High-entropy URL-safe token. The hex form is the same shape the
  // monolith returns; downstream consumers compare byte-for-byte.
  const token = randomBytes(32).toString('hex');
  const ttlSeconds =
    req.expiresInSeconds && req.expiresInSeconds > 0
      ? req.expiresInSeconds
      : DEFAULT_INVITATION_TTL_SECONDS;
  const expiration = new Date(Date.now() + ttlSeconds * 1000);

  let inserted: InvitationRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    // Dedupe: a pending invite (used = false) to the same rescue+email is
    // refreshed in place rather than duplicated. The partial unique index
    // invitations_one_pending_per_email on (rescue_id, lower(email)) WHERE
    // used = false is the conflict target; on hit we rotate the token,
    // extend the expiry and update the title. Accepted invites (used =
    // true) fall outside the index, so a fresh row is inserted normally.
    const result = await client.query<InvitationRow>(
      `
      INSERT INTO rescue.invitations (
        invitation_id, email, token, rescue_id, title, invited_by,
        expiration, used, created_by, version, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, $6, 0, now(), now())
      ON CONFLICT (rescue_id, lower(email)) WHERE used = false
      DO UPDATE SET
        token = EXCLUDED.token,
        expiration = EXCLUDED.expiration,
        title = EXCLUDED.title,
        invited_by = EXCLUDED.invited_by,
        updated_by = EXCLUDED.invited_by,
        version = rescue.invitations.version + 1,
        updated_at = now()
      RETURNING invitation_id, email, rescue_id, user_id, title, invited_by, expiration, used, created_at
      `,
      [
        invitationId,
        req.email,
        token,
        req.rescueId,
        req.title ?? null,
        principal.userId,
        expiration,
      ]
    );
    inserted = result.rows[0];

    // Key the event on the PERSISTED id (the existing row's id on a
    // refresh), not the freshly-minted one, so a re-invite is idempotent.
    const persistedId = inserted?.invitation_id ?? invitationId;
    publish({
      type: 'rescue.staffInvited',
      id: `rescue.staffInvited.${persistedId}`,
      payload: {
        invitationId: persistedId,
        rescueId: req.rescueId,
        email: req.email,
        invitedBy: principal.userId,
        expiration: expiration.toISOString(),
      },
    });
  });

  if (!inserted) {
    throw new HandlerError('INTERNAL', 'invitation insert returned no rows');
  }
  return { invitation: invitationRowToProto(inserted), token };
}

// --- UpdateRescuePlan (admin) ----------------------------------------

// Canonical tier list — mirrors @adopt-dont-shop/lib.types RescuePlan and
// the DB CHECK constraint (migration 008). Kept inline so the service has
// no frontend-lib dependency.
const VALID_PLANS = new Set(['free', 'growth', 'professional']);

export async function updateRescuePlan(
  deps: HandlerDeps,
  principal: Principal,
  req: UpdateRescuePlanRequest
): Promise<UpdateRescuePlanResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!VALID_PLANS.has(req.plan)) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `plan must be one of ${[...VALID_PLANS].join(', ')}`
    );
  }
  if (!requirePermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  const existing = await fetchRescue(deps, req.rescueId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `rescue ${req.rescueId} not found`);
  }

  const planExpiresAt =
    req.planExpiresAt !== undefined && req.planExpiresAt !== ''
      ? new Date(req.planExpiresAt)
      : null;

  let updated: RescueRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<RescueRow>(
      `UPDATE rescue.rescues
         SET plan = $1, plan_expires_at = $2, updated_at = now(), updated_by = $3,
             version = version + 1
       WHERE rescue_id = $4
       RETURNING ${RESCUES_SELECT}`,
      [req.plan, planExpiresAt, principal.userId, req.rescueId]
    );
    updated = result.rows[0];

    publish({
      type: 'rescue.planUpdated',
      id: `rescue.planUpdated.${req.rescueId}:${updated?.version}`,
      payload: {
        rescueId: req.rescueId,
        fromPlan: existing.plan,
        toPlan: req.plan,
        updatedBy: principal.userId,
      },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'plan update returned no rows');
  }
  return { rescue: rowToProto(updated) };
}

// --- GetRescueStatistics ---------------------------------------------

// staff_count is real (this vertical owns rescue.staff_members). The
// pet/application-derived counts live in other verticals (service.pets,
// service.applications); rather than fan out a heavy cross-service
// aggregation on the admin detail panel, they return zero defaults. A
// future revision can compose them via those services' gRPC clients.
export async function getRescueStatistics(
  deps: HandlerDeps,
  principal: Principal,
  req: GetRescueStatisticsRequest
): Promise<GetRescueStatisticsResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!hasPermission(principal, RESCUES_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${RESCUES_READ}' required`);
  }

  const existing = await fetchRescue(deps, req.rescueId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `rescue ${req.rescueId} not found`);
  }

  const staffResult = await deps.pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM rescue.staff_members
     WHERE rescue_id = $1 AND deleted_at IS NULL`,
    [req.rescueId]
  );
  const staffCount = Number.parseInt(staffResult.rows[0]?.count ?? '0', 10);

  return {
    statistics: {
      totalPets: 0,
      availablePets: 0,
      adoptedPets: 0,
      pendingApplications: 0,
      totalApplications: 0,
      staffCount,
      activeListings: 0,
      monthlyAdoptions: 0,
      averageTimeToAdoption: 0,
    },
  };
}

// --- CountRescues ----------------------------------------------------

// Exact rescue counts per lifecycle status from a single grouped count.
// Cheap and uncapped — the admin dashboard derives verified/pending/total
// from this rather than counting List() page lengths (capped at 100).
export async function countRescues(
  deps: HandlerDeps,
  principal: Principal,
  _req: CountRescuesRequest
): Promise<CountRescuesResponse> {
  if (!hasPermission(principal, RESCUES_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${RESCUES_READ}' required`);
  }

  const result = await deps.pool.query<{ status: RescueStatusDb; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM rescue.rescues
     WHERE deleted_at IS NULL
     GROUP BY status`
  );

  const counts: Record<RescueStatusDb, number> = {
    pending: 0,
    verified: 0,
    suspended: 0,
    inactive: 0,
    rejected: 0,
  };
  let total = 0;
  for (const row of result.rows) {
    const n = Number.parseInt(row.count, 10);
    counts[row.status] = n;
    total += n;
  }

  return { ...counts, total };
}

// --- SendRescueEmail (admin) -----------------------------------------

// Validate the request + confirm the rescue exists, then publish
// `rescue.adminEmailRequested`. Actual delivery is the notifications
// worker's job (subscriber wiring is out of scope for this RPC); the
// boundary is the published event.
export async function sendRescueEmail(
  deps: HandlerDeps,
  principal: Principal,
  req: SendRescueEmailRequest
): Promise<SendRescueEmailResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  const hasTemplate = req.templateId !== undefined && req.templateId !== '';
  const hasCustom =
    req.subject !== undefined && req.subject !== '' && req.body !== undefined && req.body !== '';
  if (!hasTemplate && !hasCustom) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      'either template_id or both subject and body are required'
    );
  }
  if (!requirePermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  const existing = await fetchRescue(deps, req.rescueId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `rescue ${req.rescueId} not found`);
  }

  await withTransaction(deps, async ({ publish }) => {
    publish({
      type: 'rescue.adminEmailRequested',
      id: `rescue.adminEmailRequested.${req.rescueId}:${Date.now()}`,
      payload: {
        rescueId: req.rescueId,
        recipientEmail: existing.email,
        templateId: hasTemplate ? req.templateId : null,
        subject: hasCustom ? req.subject : null,
        body: hasCustom ? req.body : null,
        requestedBy: principal.userId,
      },
    });
  });

  return { queued: true };
}

// --- Helpers ---------------------------------------------------------

async function fetchRescue(deps: HandlerDeps, rescueId: string): Promise<RescueRow | undefined> {
  const result = await deps.pool.query<RescueRow>(
    `SELECT ${RESCUES_SELECT} FROM rescue.rescues WHERE rescue_id = $1 AND deleted_at IS NULL`,
    [rescueId]
  );
  return result.rows[0];
}

function clampLimit(requested: number): number {
  if (requested === 0) {
    return DEFAULT_LIST_LIMIT;
  }
  if (requested > MAX_LIST_LIMIT) {
    throw new HandlerError('INVALID_ARGUMENT', `limit must be <= ${MAX_LIST_LIMIT}`);
  }
  return requested;
}

function parseCursor(raw: string): ListCursor {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as ListCursor;
    if (!parsed.createdAt || !parsed.rescueId) {
      throw new Error('missing fields');
    }
    return parsed;
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'cursor is malformed');
  }
}

function encodeCursor(cursor: ListCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');
}
