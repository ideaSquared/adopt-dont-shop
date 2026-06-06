// gRPC handler implementations for ModerationService — batch 3.
//
// Phase 8.3b — ships the user-sanction surface: IssueSanction,
// ListUserSanctions, AppealSanction. Report lifecycle shipped in
// #924; moderator actions + evidence in #925; support tickets follow
// in the final batch.
//
// Same discipline: withTransaction for writes, gate on ADMIN_DASHBOARD
// (placeholder until lib.types ships MODERATION_*), $-indexed SQL
// params, sanction mapper from #914 for row → proto.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { ADMIN_DASHBOARD } from '@adopt-dont-shop/lib.types';
import type {
  AppealSanctionRequest,
  AppealSanctionResponse,
  IssueSanctionRequest,
  IssueSanctionResponse,
  ListUserSanctionsRequest,
  ListUserSanctionsResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { sanctionReasonToDb, sanctionTypeToDb } from './enum-map.js';
import { sanctionRowToProto, type UserSanctionRow } from './sanction-ticket-mapper.js';

const SANCTION_SELECT = `
  sanction_id, user_id, sanction_type, reason, description, is_active,
  start_date, end_date, duration, issued_by, report_id,
  moderator_action_id, appealed_at, appeal_reason, appeal_status,
  created_at, updated_at
`;

function ensureModerationPermission(principal: Principal): void {
  if (!requirePermission(principal, ADMIN_DASHBOARD)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_DASHBOARD}' required`);
  }
}

// issued_by_role is a NOT NULL enum on the row. Derive it from the
// principal's roles — the highest-privilege role they hold. The
// monolith stamped this so a sanction's provenance survives even if
// the issuer's role changes later.
function deriveIssuedByRole(principal: Principal): 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' {
  if (principal.roles.includes('super_admin')) {
    return 'SUPER_ADMIN';
  }
  if (principal.roles.includes('admin')) {
    return 'ADMIN';
  }
  return 'MODERATOR';
}

// --- IssueSanction ---------------------------------------------------

export async function issueSanction(
  deps: HandlerDeps,
  principal: Principal,
  req: IssueSanctionRequest
): Promise<IssueSanctionResponse> {
  ensureModerationPermission(principal);

  if (req.userId === undefined || req.userId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (req.sanctionType === undefined || req.sanctionType === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'sanction_type is required');
  }
  if (req.reason === undefined || req.reason === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'reason is required');
  }
  if (req.description === undefined || req.description === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'description is required');
  }

  const sanctionTypeDb = sanctionTypeToDb(req.sanctionType);
  const reasonDb = sanctionReasonToDb(req.reason);
  const issuedByRole = deriveIssuedByRole(principal);

  // duration (days) derives end_date; permanent_ban leaves it NULL.
  const endDate =
    req.duration !== undefined && req.duration > 0
      ? new Date(Date.now() + req.duration * 24 * 60 * 60 * 1000).toISOString()
      : null;

  return withTransaction(deps, async ({ client, publish }) => {
    const sanctionId = randomUUID();
    const inserted = await client.query<UserSanctionRow>(
      `INSERT INTO user_sanctions (
         sanction_id, user_id, sanction_type, reason, description,
         is_active, end_date, duration, issued_by, issued_by_role,
         report_id, moderator_action_id
       )
       VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11)
       RETURNING ${SANCTION_SELECT}`,
      [
        sanctionId,
        req.userId,
        sanctionTypeDb,
        reasonDb,
        req.description,
        endDate,
        req.duration ?? null,
        principal.userId,
        issuedByRole,
        req.reportId ?? null,
        req.moderatorActionId ?? null,
      ]
    );

    if (inserted.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }

    publish({
      type: 'moderation.sanctionIssued',
      id: sanctionId,
      payload: {
        sanctionId,
        userId: req.userId,
        sanctionType: sanctionTypeDb,
        reason: reasonDb,
        issuedBy: principal.userId,
      },
    });

    return { sanction: sanctionRowToProto(inserted.rows[0]) };
  });
}

// --- ListUserSanctions -----------------------------------------------

export async function listUserSanctions(
  deps: HandlerDeps,
  principal: Principal,
  req: ListUserSanctionsRequest
): Promise<ListUserSanctionsResponse> {
  // A user can list their OWN sanctions (the banner query); moderators
  // can list anyone's. The gate: either the principal is the target
  // user, OR they hold the moderation permission.
  if (req.userId === undefined || req.userId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (req.userId !== principal.userId && !requirePermission(principal, ADMIN_DASHBOARD)) {
    throw new HandlerError('PERMISSION_DENIED', 'can only list your own sanctions');
  }

  // Default: active sanctions only (the banner). include_inactive
  // returns the full history.
  const activeFilter = req.includeInactive ? '' : 'AND is_active = true';

  const { rows } = await deps.pool.query<UserSanctionRow>(
    `SELECT ${SANCTION_SELECT}
     FROM user_sanctions
     WHERE user_id = $1 ${activeFilter}
     ORDER BY start_date DESC`,
    [req.userId]
  );

  return { sanctions: rows.map(sanctionRowToProto) };
}

// --- AppealSanction --------------------------------------------------

export async function appealSanction(
  deps: HandlerDeps,
  principal: Principal,
  req: AppealSanctionRequest
): Promise<AppealSanctionResponse> {
  // The SANCTIONED user files the appeal — not a moderator. So the
  // gate is ownership: the principal must be the sanction's target.
  if (req.sanctionId === undefined || req.sanctionId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'sanction_id is required');
  }
  if (req.appealReason === undefined || req.appealReason === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'appeal_reason is required');
  }

  return withTransaction(deps, async ({ client, publish }) => {
    const existing = await client.query<UserSanctionRow>(
      `SELECT ${SANCTION_SELECT}
       FROM user_sanctions
       WHERE sanction_id = $1
       FOR UPDATE`,
      [req.sanctionId]
    );

    if (existing.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `sanction ${req.sanctionId} not found`);
    }

    const row = existing.rows[0];

    // Only the sanctioned user can appeal their own sanction.
    // super_admin can appeal on a user's behalf (support workflow).
    if (row.user_id !== principal.userId && !principal.roles.includes('super_admin')) {
      throw new HandlerError('PERMISSION_DENIED', 'can only appeal your own sanction');
    }

    // Already-appealed sanctions can't be re-appealed (appeal_status
    // is set once the appeal lands).
    if (row.appeal_status !== null) {
      throw new HandlerError('INVALID_ARGUMENT', 'sanction already has an appeal');
    }

    const updated = await client.query<UserSanctionRow>(
      `UPDATE user_sanctions
       SET appealed_at = NOW(),
           appeal_reason = $1,
           appeal_status = 'pending',
           updated_at = NOW()
       WHERE sanction_id = $2
       RETURNING ${SANCTION_SELECT}`,
      [req.appealReason, req.sanctionId]
    );

    if (updated.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'update returned no rows');
    }

    publish({
      type: 'moderation.sanctionAppealed',
      id: req.sanctionId,
      payload: {
        sanctionId: req.sanctionId,
        userId: row.user_id,
        appealedBy: principal.userId,
      },
    });

    return { sanction: sanctionRowToProto(updated.rows[0]) };
  });
}
