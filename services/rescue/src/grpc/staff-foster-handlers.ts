// gRPC handlers for the rescue service's staff / foster / invitation-
// read surface. Ports service.backend's /api/v1/staff/*, /api/v1/foster/*
// and GET /api/v1/invitations/details/:token onto the rescue.* schema.
//
// Discipline matches handlers.ts:
//   - Permission gating via @adopt-dont-shop/authz; rescue-scoped perms
//     carry the rescueId so a staff member can only act on their own
//     rescue.
//   - State-changing handlers run withTransaction + publish-after-commit.
//   - User name/email are NOT joined here (they live in auth.users) —
//     the StaffMember message carries only rescue-owned columns; the
//     gateway/SPA fetches names separately if needed.

import { randomUUID } from 'node:crypto';

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission, RescueId } from '@adopt-dont-shop/lib.types';
import {
  RescueV1,
  type AcceptInvitationRequest,
  type AcceptInvitationResponse,
  type CancelRescueInvitationRequest,
  type CancelRescueInvitationResponse,
  type CreateFosterPlacementRequest,
  type CreateFosterPlacementResponse,
  type CreateStaffMemberRequest,
  type CreateStaffMemberResponse,
  type EndFosterPlacementRequest,
  type EndFosterPlacementResponse,
  type FosterPlacement,
  type GetFosterPlacementRequest,
  type GetFosterPlacementResponse,
  type GetInvitationByTokenRequest,
  type GetInvitationByTokenResponse,
  type GetMyStaffMembershipRequest,
  type GetMyStaffMembershipResponse,
  type ListFosterPlacementsRequest,
  type ListFosterPlacementsResponse,
  type ListRescueInvitationsRequest,
  type ListRescueInvitationsResponse,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
  type RemoveStaffMemberRequest,
  type RemoveStaffMemberResponse,
  type StaffMember,
  type UpdateStaffMemberRequest,
  type UpdateStaffMemberResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';
import type { PetsClient } from './pets-client.js';
import { principalToMetadata } from './principal.js';

// grpc-js status codes service.pets can return on Get.
const PETS_GRPC_NOT_FOUND = 5;
const PETS_GRPC_PERMISSION_DENIED = 7;

// --- Permissions -----------------------------------------------------

const STAFF_READ: Permission = 'staff.read' as Permission;
const STAFF_CREATE: Permission = 'staff.create' as Permission;
const STAFF_UPDATE: Permission = 'staff.update' as Permission;
const STAFF_DELETE: Permission = 'staff.delete' as Permission;
// Platform-admin gate for the admin StaffTab (cross-rescue). Held only by
// admin / super_admin — NOT rescue_staff (which has staff.* + rescues.read
// scoped to its own rescue), so it can't be used to leak across rescues.
const ADMIN_SECURITY_MANAGE: Permission = 'admin.security.manage' as Permission;
const FOSTER_CREATE: Permission = 'foster.create' as Permission;
const FOSTER_READ: Permission = 'foster.read' as Permission;
const FOSTER_UPDATE: Permission = 'foster.update' as Permission;

// --- Row shapes ------------------------------------------------------

type StaffMemberRow = {
  staff_member_id: string;
  user_id: string;
  rescue_id: string;
  title: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: Date | null;
  added_by: string;
  added_at: Date;
  created_at: Date;
  updated_at: Date;
};

type FosterPlacementRow = {
  placement_id: string;
  rescue_id: string;
  pet_id: string;
  foster_user_id: string;
  start_date: Date;
  end_date: Date | null;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
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

// --- Row → proto -----------------------------------------------------

const staffRowToProto = (row: StaffMemberRow): StaffMember => ({
  staffMemberId: row.staff_member_id,
  userId: row.user_id,
  rescueId: row.rescue_id,
  title: row.title ?? undefined,
  isVerified: row.is_verified,
  verifiedBy: row.verified_by ?? undefined,
  verifiedAt: row.verified_at?.toISOString(),
  addedBy: row.added_by,
  addedAt: row.added_at.toISOString(),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const fosterStatusToProto = (
  v: 'active' | 'completed' | 'cancelled'
): RescueV1.FosterPlacementStatus => {
  switch (v) {
    case 'active':
      return RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_ACTIVE;
    case 'completed':
      return RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_COMPLETED;
    case 'cancelled':
      return RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_CANCELLED;
  }
};

const fosterStatusFilterToDb = (
  v: RescueV1.FosterPlacementStatus
): 'active' | 'completed' | 'cancelled' | null => {
  switch (v) {
    case RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_ACTIVE:
      return 'active';
    case RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_COMPLETED:
      return 'completed';
    case RescueV1.FosterPlacementStatus.FOSTER_PLACEMENT_STATUS_CANCELLED:
      return 'cancelled';
    default:
      return null;
  }
};

const fosterRowToProto = (row: FosterPlacementRow): FosterPlacement => ({
  placementId: row.placement_id,
  rescueId: row.rescue_id,
  petId: row.pet_id,
  fosterUserId: row.foster_user_id,
  startDate: row.start_date.toISOString(),
  endDate: row.end_date?.toISOString(),
  status: fosterStatusToProto(row.status),
  notes: row.notes ?? undefined,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const invitationRowToProto = (row: InvitationRow) => ({
  invitationId: row.invitation_id,
  email: row.email,
  rescueId: row.rescue_id,
  userId: row.user_id ?? undefined,
  title: row.title ?? undefined,
  invitedBy: row.invited_by ?? undefined,
  expiration: row.expiration.toISOString(),
  used: row.used,
  createdAt: row.created_at.toISOString(),
});

const STAFF_SELECT = `
  staff_member_id, user_id, rescue_id, title, is_verified, verified_by,
  verified_at, added_by, added_at, created_at, updated_at
`;

const FOSTER_SELECT = `
  placement_id, rescue_id, pet_id, foster_user_id, start_date, end_date,
  status, notes, created_at, updated_at
`;

// --- GetMyStaffMembership --------------------------------------------

export async function getMyStaffMembership(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetMyStaffMembershipRequest
): Promise<GetMyStaffMembershipResponse> {
  void _req;
  const res = await deps.pool.query<StaffMemberRow>(
    `SELECT ${STAFF_SELECT} FROM rescue.staff_members
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY added_at DESC
     LIMIT 1`,
    [principal.userId]
  );
  if (!res.rows[0]) {
    throw new HandlerError('NOT_FOUND', 'you are not associated with any rescue organisation');
  }
  return { staffMember: staffRowToProto(res.rows[0]) };
}

// --- ListStaffMembers ------------------------------------------------

export async function listStaffMembers(
  deps: HandlerDeps,
  principal: Principal,
  req: ListStaffMembersRequest
): Promise<ListStaffMembersResponse> {
  // Rescue-portal staff with `staff.read` (the "colleagues" view), OR a
  // platform admin with `admin.security.manage` (the admin StaffTab,
  // cross-rescue). Admins are treated like super_admin below: they pass an
  // explicit rescue_id and skip the own-rescue membership check.
  const isAdmin = hasPermission(principal, ADMIN_SECURITY_MANAGE);
  if (!hasPermission(principal, STAFF_READ) && !isAdmin) {
    throw new HandlerError('PERMISSION_DENIED', `'${STAFF_READ}' required`);
  }

  // Resolve the target rescue: explicit rescue_id, or the caller's own
  // rescue (the "colleagues" case). super_admin / platform admins can list
  // any rescue's staff by passing rescue_id.
  let rescueId = req.rescueId;
  if (!rescueId) {
    const mine = await deps.pool.query<{ rescue_id: string }>(
      `SELECT rescue_id FROM rescue.staff_members
       WHERE user_id = $1 AND is_verified = true AND deleted_at IS NULL
       LIMIT 1`,
      [principal.userId]
    );
    if (!mine.rows[0]) {
      throw new HandlerError('NOT_FOUND', 'you are not associated with any rescue organisation');
    }
    rescueId = mine.rows[0].rescue_id;
  } else if (!principal.roles.includes('super_admin') && !isAdmin) {
    // Explicit rescue_id — must be a member of that rescue.
    const member = await deps.pool.query<{ staff_member_id: string }>(
      `SELECT staff_member_id FROM rescue.staff_members
       WHERE user_id = $1 AND rescue_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [principal.userId, rescueId]
    );
    if (!member.rows[0]) {
      throw new HandlerError('PERMISSION_DENIED', 'you may only list staff for your own rescue');
    }
  }

  const res = await deps.pool.query<StaffMemberRow>(
    `SELECT ${STAFF_SELECT} FROM rescue.staff_members
     WHERE rescue_id = $1 AND deleted_at IS NULL
     ORDER BY added_at DESC`,
    [rescueId]
  );
  return { staffMembers: res.rows.map(staffRowToProto) };
}

// --- CreateStaffMember -------------------------------------------------

export type StaffMutationDeps = WithTransactionDeps;

// Directly add an existing auth user as a verified staff member — no
// invitation round-trip. Mirrors AcceptInvitation's INSERT (added_by is
// the caller, not the invitee) but skips the invitations table entirely.
export async function createStaffMember(
  deps: StaffMutationDeps,
  principal: Principal,
  req: CreateStaffMemberRequest
): Promise<CreateStaffMemberResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!requirePermission(principal, STAFF_CREATE, { rescueId: req.rescueId as RescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${STAFF_CREATE}' required for this rescue`);
  }

  const staffMember = await withTransaction(deps, async ({ client, publish }) => {
    const existing = await client.query<StaffMemberRow>(
      `SELECT ${STAFF_SELECT} FROM rescue.staff_members
       WHERE rescue_id = $1 AND user_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [req.rescueId, req.userId]
    );
    if (existing.rows[0]) {
      throw new HandlerError(
        'ALREADY_EXISTS',
        `user ${req.userId} is already a staff member of rescue ${req.rescueId}`
      );
    }

    const staffMemberId = randomUUID();
    const insertRes = await client.query<StaffMemberRow>(
      `
      INSERT INTO rescue.staff_members (
        staff_member_id, rescue_id, user_id, title,
        is_verified, verified_by, verified_at,
        added_by, added_at, created_by, version, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, true, $5, now(), $5, now(), $5, 0, now(), now())
      RETURNING ${STAFF_SELECT}
      `,
      [staffMemberId, req.rescueId, req.userId, req.title ?? null, principal.userId]
    );
    const row = insertRes.rows[0];
    if (!row) {
      throw new HandlerError('INTERNAL', 'staff member insert returned no rows');
    }

    publish({
      type: 'rescue.staffMemberCreated',
      id: `rescue.staffMemberCreated.${staffMemberId}`,
      payload: {
        staffMemberId,
        rescueId: req.rescueId,
        userId: req.userId,
        addedBy: principal.userId,
      },
    });

    return row;
  });

  return { staffMember: staffRowToProto(staffMember) };
}

// --- UpdateStaffMember -------------------------------------------------

export async function updateStaffMember(
  deps: StaffMutationDeps,
  principal: Principal,
  req: UpdateStaffMemberRequest
): Promise<UpdateStaffMemberResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!requirePermission(principal, STAFF_UPDATE, { rescueId: req.rescueId as RescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${STAFF_UPDATE}' required for this rescue`);
  }

  const staffMember = await withTransaction(deps, async ({ client, publish }) => {
    const existing = await client.query<StaffMemberRow>(
      `SELECT ${STAFF_SELECT} FROM rescue.staff_members
       WHERE rescue_id = $1 AND user_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [req.rescueId, req.userId]
    );
    const row = existing.rows[0];
    if (!row) {
      throw new HandlerError(
        'NOT_FOUND',
        `user ${req.userId} is not a staff member of rescue ${req.rescueId}`
      );
    }

    const updateRes = await client.query<StaffMemberRow>(
      `
      UPDATE rescue.staff_members
      SET title = COALESCE($3, title), updated_by = $4, version = version + 1, updated_at = now()
      WHERE rescue_id = $1 AND user_id = $2
      RETURNING ${STAFF_SELECT}
      `,
      [req.rescueId, req.userId, req.title ?? null, principal.userId]
    );
    const updated = updateRes.rows[0];
    if (!updated) {
      throw new HandlerError('INTERNAL', 'staff member update returned no rows');
    }

    publish({
      type: 'rescue.staffMemberUpdated',
      id: `rescue.staffMemberUpdated.${row.staff_member_id}`,
      payload: {
        staffMemberId: row.staff_member_id,
        rescueId: req.rescueId,
        userId: req.userId,
      },
    });

    return updated;
  });

  return { staffMember: staffRowToProto(staffMember) };
}

// --- RemoveStaffMember -------------------------------------------------

// Soft-delete only — preserves the row for audit/history. Idempotent
// would mean "removing an already-removed membership succeeds silently",
// but we instead surface NOT_FOUND so the caller (and the SPA) knows the
// target was already gone, matching the proto contract.
export async function removeStaffMember(
  deps: StaffMutationDeps,
  principal: Principal,
  req: RemoveStaffMemberRequest
): Promise<RemoveStaffMemberResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  // Rescue-portal staff with `staff.delete` scoped to this rescue, OR a
  // platform admin acting cross-rescue from the admin StaffTab.
  if (
    !requirePermission(principal, STAFF_DELETE, { rescueId: req.rescueId as RescueId }) &&
    !hasPermission(principal, ADMIN_SECURITY_MANAGE)
  ) {
    throw new HandlerError('PERMISSION_DENIED', `'${STAFF_DELETE}' required for this rescue`);
  }

  await withTransaction(deps, async ({ client, publish }) => {
    const existing = await client.query<StaffMemberRow>(
      `SELECT ${STAFF_SELECT} FROM rescue.staff_members
       WHERE rescue_id = $1 AND user_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [req.rescueId, req.userId]
    );
    const row = existing.rows[0];
    if (!row) {
      throw new HandlerError(
        'NOT_FOUND',
        `user ${req.userId} is not a staff member of rescue ${req.rescueId}`
      );
    }

    await client.query(
      `UPDATE rescue.staff_members
       SET deleted_at = now(), updated_by = $3, version = version + 1, updated_at = now()
       WHERE rescue_id = $1 AND user_id = $2`,
      [req.rescueId, req.userId, principal.userId]
    );

    publish({
      type: 'rescue.staffMemberRemoved',
      id: `rescue.staffMemberRemoved.${row.staff_member_id}`,
      payload: {
        staffMemberId: row.staff_member_id,
        rescueId: req.rescueId,
        userId: req.userId,
      },
    });
  });

  return { removed: true };
}

// --- ListRescueInvitations (admin) -----------------------------------

// List a rescue's PENDING invitations for the admin StaffTab. Admin-only
// (admin.security.manage) — the rescue-portal `staff.read` is rescue-
// scoped and shared with rescue_staff, so it can't gate a cross-rescue
// admin read. The token column is never selected (only minted once).
export async function listRescueInvitations(
  deps: HandlerDeps,
  principal: Principal,
  req: ListRescueInvitationsRequest
): Promise<ListRescueInvitationsResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!hasPermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  const res = await deps.pool.query<InvitationRow>(
    `SELECT invitation_id, email, rescue_id, user_id, title, invited_by,
            expiration, used, created_at
     FROM rescue.invitations
     WHERE rescue_id = $1 AND used = false
     ORDER BY created_at DESC`,
    [req.rescueId]
  );
  return { invitations: res.rows.map(invitationRowToProto) };
}

// --- CancelRescueInvitation (admin) ----------------------------------

// Hard-delete a single pending invitation. Admin-only. NOT_FOUND when the
// invitation is unknown, already accepted (used = true), or belongs to a
// different rescue — the rescue_id is part of the match so an admin can't
// cancel another rescue's invitation by id alone.
export async function cancelRescueInvitation(
  deps: StaffMutationDeps,
  principal: Principal,
  req: CancelRescueInvitationRequest
): Promise<CancelRescueInvitationResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!req.invitationId) {
    throw new HandlerError('INVALID_ARGUMENT', 'invitation_id is required');
  }
  if (!hasPermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  await withTransaction(deps, async ({ client, publish }) => {
    const deleted = await client.query<{ invitation_id: string; email: string }>(
      `DELETE FROM rescue.invitations
       WHERE invitation_id = $1 AND rescue_id = $2 AND used = false
       RETURNING invitation_id, email`,
      [req.invitationId, req.rescueId]
    );
    const row = deleted.rows[0];
    if (!row) {
      throw new HandlerError(
        'NOT_FOUND',
        `pending invitation ${req.invitationId} not found for rescue ${req.rescueId}`
      );
    }

    publish({
      type: 'rescue.staffInvitationCancelled',
      id: `rescue.staffInvitationCancelled.${row.invitation_id}`,
      payload: {
        invitationId: row.invitation_id,
        rescueId: req.rescueId,
        email: row.email,
        cancelledBy: principal.userId,
      },
    });
  });

  return { cancelled: true };
}

// --- CreateFosterPlacement -------------------------------------------

export type FosterDeps = WithTransactionDeps;

// createFosterPlacement is a factory closing over the PetsClient so the gRPC
// server boot injects the real client and tests inject a stub. It resolves
// pet → rescue via service.pets and rejects a petId that doesn't belong to
// the placement's rescue (a cross-schema FK we can't enforce in the DB).
export function makeCreateFosterPlacement(
  petsClient: PetsClient
): (
  deps: FosterDeps,
  principal: Principal,
  req: CreateFosterPlacementRequest
) => Promise<CreateFosterPlacementResponse> {
  return async (deps, principal, req) => {
    if (!req.rescueId) {
      throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
    }
    if (!req.petId) {
      throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
    }
    if (!req.fosterUserId) {
      throw new HandlerError('INVALID_ARGUMENT', 'foster_user_id is required');
    }
    if (!req.startDate) {
      throw new HandlerError('INVALID_ARGUMENT', 'start_date is required');
    }
    if (!requirePermission(principal, FOSTER_CREATE, { rescueId: req.rescueId as RescueId })) {
      throw new HandlerError('PERMISSION_DENIED', `'${FOSTER_CREATE}' required for this rescue`);
    }

    // The pet must belong to the placement's rescue — otherwise a staffer
    // could fabricate a placement over another rescue's animal.
    await assertPetBelongsToRescue(petsClient, principal, req.petId, req.rescueId);

    return insertFosterPlacement(deps, req);
  };
}

// Resolve the pet via service.pets (forwarding the caller's identity so pets
// runs its own read gate) and confirm it belongs to `rescueId`. A pet the
// caller can't read (NOT_FOUND / PERMISSION_DENIED) or one owned by a
// different rescue is rejected as a bad pet_id.
async function assertPetBelongsToRescue(
  petsClient: PetsClient,
  principal: Principal,
  petId: string,
  rescueId: string
): Promise<void> {
  let res;
  try {
    res = await petsClient.getPet({ petId }, principalToMetadata(principal));
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === PETS_GRPC_NOT_FOUND || code === PETS_GRPC_PERMISSION_DENIED) {
      throw new HandlerError('INVALID_ARGUMENT', `pet ${petId} is not in rescue ${rescueId}`);
    }
    throw new HandlerError('INTERNAL', 'failed to resolve pet rescue');
  }
  if (res.pet?.rescueId !== rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', `pet ${petId} is not in rescue ${rescueId}`);
  }
}

async function insertFosterPlacement(
  deps: FosterDeps,
  req: CreateFosterPlacementRequest
): Promise<CreateFosterPlacementResponse> {
  const placementId = randomUUID();
  let inserted: FosterPlacementRow | undefined;

  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<FosterPlacementRow>(
      `
      INSERT INTO rescue.foster_placements (
        placement_id, rescue_id, pet_id, foster_user_id,
        start_date, status, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'active', $6, now(), now())
      RETURNING ${FOSTER_SELECT}
      `,
      [placementId, req.rescueId, req.petId, req.fosterUserId, req.startDate, req.notes ?? null]
    );
    inserted = res.rows[0];

    publish({
      type: 'rescue.fosterPlacementCreated',
      id: `rescue.fosterPlacementCreated.${placementId}`,
      payload: {
        placementId,
        rescueId: req.rescueId,
        petId: req.petId,
        fosterUserId: req.fosterUserId,
      },
    });
  });

  if (!inserted) {
    throw new HandlerError('INTERNAL', 'foster placement insert returned no rows');
  }
  return { placement: fosterRowToProto(inserted) };
}

// --- ListFosterPlacements --------------------------------------------

export async function listFosterPlacements(
  deps: HandlerDeps,
  principal: Principal,
  req: ListFosterPlacementsRequest
): Promise<ListFosterPlacementsResponse> {
  // foster.read is rescue-scoped. With an explicit rescue_id we gate on
  // it. Without one, hasPermission ignores rescue scope — so a missing
  // rescue_id must NOT fall through to an unscoped, cross-rescue read for
  // ordinary staff. Pin non-super_admins to their own verified rescue
  // (mirroring listStaffMembers); only super_admin may list across rescues.
  const isSuperAdmin = principal.roles.includes('super_admin');
  let scopedRescueId = req.rescueId;
  if (req.rescueId) {
    if (!requirePermission(principal, FOSTER_READ, { rescueId: req.rescueId as RescueId })) {
      throw new HandlerError('PERMISSION_DENIED', `'${FOSTER_READ}' required for this rescue`);
    }
  } else if (!isSuperAdmin) {
    if (!hasPermission(principal, FOSTER_READ)) {
      throw new HandlerError('PERMISSION_DENIED', `'${FOSTER_READ}' required`);
    }
    const mine = await deps.pool.query<{ rescue_id: string }>(
      `SELECT rescue_id FROM rescue.staff_members
       WHERE user_id = $1 AND is_verified = true AND deleted_at IS NULL
       LIMIT 1`,
      [principal.userId]
    );
    if (!mine.rows[0]) {
      throw new HandlerError('NOT_FOUND', 'you are not associated with any rescue organisation');
    }
    scopedRescueId = mine.rows[0].rescue_id;
  }

  const statusDb = fosterStatusFilterToDb(req.statusFilter);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  if (scopedRescueId) {
    params.push(scopedRescueId);
    conditions.push(`rescue_id = $${params.length}`);
  }
  if (req.fosterUserId) {
    params.push(req.fosterUserId);
    conditions.push(`foster_user_id = $${params.length}`);
  }
  if (statusDb) {
    params.push(statusDb);
    conditions.push(`status = $${params.length}`);
  }

  const res = await deps.pool.query<FosterPlacementRow>(
    `SELECT ${FOSTER_SELECT} FROM rescue.foster_placements
     WHERE ${conditions.join(' AND ')}
     ORDER BY start_date DESC`,
    params
  );
  return { placements: res.rows.map(fosterRowToProto) };
}

// --- GetFosterPlacement ----------------------------------------------

export async function getFosterPlacement(
  deps: HandlerDeps,
  principal: Principal,
  req: GetFosterPlacementRequest
): Promise<GetFosterPlacementResponse> {
  if (!req.placementId) {
    throw new HandlerError('INVALID_ARGUMENT', 'placement_id is required');
  }
  const res = await deps.pool.query<FosterPlacementRow>(
    `SELECT ${FOSTER_SELECT} FROM rescue.foster_placements
     WHERE placement_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.placementId]
  );
  const row = res.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `foster placement ${req.placementId} not found`);
  }
  if (!requirePermission(principal, FOSTER_READ, { rescueId: row.rescue_id as RescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${FOSTER_READ}' required for this rescue`);
  }
  return { placement: fosterRowToProto(row) };
}

// --- EndFosterPlacement ----------------------------------------------

const endOutcomeToStatus = (outcome: RescueV1.FosterEndOutcome): 'completed' | 'cancelled' => {
  switch (outcome) {
    case RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_ADOPTED_BY_FOSTER:
    case RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_RETURN_TO_RESCUE:
      // Both are a successful completion of the foster term.
      return 'completed';
    case RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_CANCELLED:
      return 'cancelled';
    default:
      return 'completed';
  }
};

export async function endFosterPlacement(
  deps: FosterDeps,
  principal: Principal,
  req: EndFosterPlacementRequest
): Promise<EndFosterPlacementResponse> {
  if (!req.placementId) {
    throw new HandlerError('INVALID_ARGUMENT', 'placement_id is required');
  }
  if (req.outcome === RescueV1.FosterEndOutcome.FOSTER_END_OUTCOME_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'outcome is required');
  }

  const existing = await deps.pool.query<FosterPlacementRow>(
    `SELECT ${FOSTER_SELECT} FROM rescue.foster_placements
     WHERE placement_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.placementId]
  );
  const row = existing.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `foster placement ${req.placementId} not found`);
  }
  if (!requirePermission(principal, FOSTER_UPDATE, { rescueId: row.rescue_id as RescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${FOSTER_UPDATE}' required for this rescue`);
  }

  // Idempotent: already-ended placement returns as-is without a second
  // event publish.
  if (row.status !== 'active') {
    return { placement: fosterRowToProto(row) };
  }

  const newStatus = endOutcomeToStatus(req.outcome);
  const endDate = req.endDate ? new Date(req.endDate) : new Date();
  let updated: FosterPlacementRow | undefined;

  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<FosterPlacementRow>(
      `
      UPDATE rescue.foster_placements
      SET status = $2, end_date = $3,
          notes = COALESCE($4, notes),
          updated_at = now()
      WHERE placement_id = $1
      RETURNING ${FOSTER_SELECT}
      `,
      [req.placementId, newStatus, endDate, req.notes ?? null]
    );
    updated = res.rows[0];

    publish({
      type: 'rescue.fosterPlacementEnded',
      id: `rescue.fosterPlacementEnded.${req.placementId}`,
      payload: {
        placementId: req.placementId,
        rescueId: row.rescue_id,
        status: newStatus,
      },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'foster placement update returned no rows');
  }
  return { placement: fosterRowToProto(updated) };
}

// --- GetInvitationByToken --------------------------------------------

export async function getInvitationByToken(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: GetInvitationByTokenRequest
): Promise<GetInvitationByTokenResponse> {
  void _principal;
  if (!req.token) {
    throw new HandlerError('INVALID_ARGUMENT', 'token is required');
  }
  const res = await deps.pool.query<InvitationRow>(
    `SELECT invitation_id, email, rescue_id, user_id, title, invited_by,
            expiration, used, created_at
     FROM rescue.invitations
     WHERE token = $1
     LIMIT 1`,
    [req.token]
  );
  const row = res.rows[0];
  // NOT_FOUND covers unknown, used, and expired — the accept page
  // shouldn't distinguish (no token enumeration / status probing).
  if (!row || row.used || row.expiration.getTime() <= Date.now()) {
    throw new HandlerError('NOT_FOUND', 'invitation not found or no longer valid');
  }
  return { invitation: invitationRowToProto(row) };
}

// --- AcceptInvitation ------------------------------------------------

// Consume a pending invitation: mark it used + attach the given user as
// a verified staff member of the invited rescue. The gateway supplies
// user_id after provisioning the auth account. Public — the token is the
// credential. Idempotent: re-accepting for the SAME user returns the
// existing membership; an already-used token whose membership belongs to
// a different user is treated as no-longer-valid (NOT_FOUND), matching
// GetInvitationByToken's non-enumerating contract.
export async function acceptInvitation(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: AcceptInvitationRequest
): Promise<AcceptInvitationResponse> {
  void _principal;
  if (!req.token) {
    throw new HandlerError('INVALID_ARGUMENT', 'token is required');
  }
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }

  const staffMember = await withTransaction(deps, async ({ client, publish }) => {
    // Lock the invitation row so two concurrent accepts can't both pass
    // the validity check and double-insert a membership.
    const invRes = await client.query<InvitationRow>(
      `SELECT invitation_id, email, rescue_id, user_id, title, invited_by,
              expiration, used, created_at
       FROM rescue.invitations
       WHERE token = $1
       FOR UPDATE`,
      [req.token]
    );
    const inv = invRes.rows[0];
    if (!inv || inv.expiration.getTime() <= Date.now()) {
      throw new HandlerError('NOT_FOUND', 'invitation not found or no longer valid');
    }

    // Idempotency: an existing (non-deleted) membership for this user at
    // the invited rescue means the invitation was already accepted by
    // them — return it unchanged rather than inserting a duplicate.
    const existing = await client.query<StaffMemberRow>(
      `SELECT ${STAFF_SELECT} FROM rescue.staff_members
       WHERE rescue_id = $1 AND user_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [inv.rescue_id, req.userId]
    );
    if (existing.rows[0]) {
      return existing.rows[0];
    }

    // The token was already consumed but this user has no membership —
    // it belongs to someone else. Don't reveal that; treat as invalid.
    if (inv.used) {
      throw new HandlerError('NOT_FOUND', 'invitation not found or no longer valid');
    }

    const staffMemberId = randomUUID();
    // added_by is NOT NULL — fall back to the invitee themselves when the
    // invitation didn't record an inviter.
    const addedBy = inv.invited_by ?? req.userId;
    const insertRes = await client.query<StaffMemberRow>(
      `
      INSERT INTO rescue.staff_members (
        staff_member_id, rescue_id, user_id, title,
        is_verified, verified_by, verified_at,
        added_by, added_at, created_by, version, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, true, $5, now(), $5, now(), $5, 0, now(), now())
      RETURNING ${STAFF_SELECT}
      `,
      [staffMemberId, inv.rescue_id, req.userId, inv.title ?? null, addedBy]
    );

    await client.query(
      `UPDATE rescue.invitations
         SET used = true, user_id = $2, updated_at = now(), version = version + 1
       WHERE invitation_id = $1`,
      [inv.invitation_id, req.userId]
    );

    publish({
      type: 'rescue.invitationAccepted',
      id: `rescue.invitationAccepted.${inv.invitation_id}`,
      payload: {
        invitationId: inv.invitation_id,
        rescueId: inv.rescue_id,
        userId: req.userId,
        staffMemberId,
      },
    });

    return insertRes.rows[0];
  });

  return { staffMember: staffRowToProto(staffMember) };
}
