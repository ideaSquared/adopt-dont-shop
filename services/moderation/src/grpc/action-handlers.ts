// gRPC handler implementations for ModerationService — batch 2.
//
// Phase 8.3b — ships the moderator-action + evidence surface:
// LogModeratorAction, ListModeratorActions, AddEvidence. The report
// lifecycle handlers (FileReport, GetReport, ListReports,
// AssignReport, ResolveReport) shipped in #924. Sanctions + support
// tickets follow in the next batch.
//
// Same discipline as handlers.ts: withTransaction for writes, gate on
// MODERATION_ACTIONS_MANAGE, $-indexed SQL params, mappers from #913
// for row → proto.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { principalToMetadata } from '@adopt-dont-shop/service-bootstrap';
import { MODERATION_ACTIONS_MANAGE } from '@adopt-dont-shop/lib.types';
import type {
  AddEvidenceRequest,
  AddEvidenceResponse,
  ListModeratorActionsRequest,
  ListModeratorActionsResponse,
  LogModeratorActionRequest,
  LogModeratorActionResponse,
} from '@adopt-dont-shop/proto';

import {
  actionRowToProto,
  evidenceRowToProto,
  type EvidenceRow,
  type ModeratorActionRow,
} from './action-evidence-mapper.js';
import { HandlerError, type HandlerDeps } from './adapter.js';
import { grpcStatusToHandlerCode, type AuthClient } from './auth-client.js';
import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor.js';
import {
  actionTypeToDb,
  entityTypeToDb,
  evidenceParentTypeToDb,
  evidenceTypeToDb,
  severityToDb,
} from './enum-map.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.trunc(raw), MAX_LIMIT);
}

function ensureModerationPermission(principal: Principal): void {
  if (!requirePermission(principal, MODERATION_ACTIONS_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MODERATION_ACTIONS_MANAGE}' required`);
  }
}

function parseMetadataJson(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return '{}';
  }
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new Error('metadata_json must encode a JSON object');
    }
    return JSON.stringify(obj);
  } catch (err) {
    throw new HandlerError('INVALID_ARGUMENT', `metadata_json invalid: ${(err as Error).message}`);
  }
}

// --- LogModeratorAction ----------------------------------------------

export async function logModeratorAction(
  deps: HandlerDeps,
  principal: Principal,
  req: LogModeratorActionRequest,
  authClient?: AuthClient
): Promise<LogModeratorActionResponse> {
  ensureModerationPermission(principal);

  if (req.targetEntityId === undefined || req.targetEntityId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'target_entity_id is required');
  }
  if (req.targetEntityType === undefined || req.targetEntityType === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'target_entity_type is required');
  }
  if (req.actionType === undefined || req.actionType === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'action_type is required');
  }
  if (req.severity === undefined || req.severity === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'severity is required');
  }
  if (req.reason === undefined || req.reason === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'reason is required');
  }

  const targetEntityTypeDb = entityTypeToDb(req.targetEntityType);
  const actionTypeDb = actionTypeToDb(req.actionType);
  const severityDb = severityToDb(req.severity);
  const metadataJson = parseMetadataJson(req.metadataJson);

  // A user_suspended / user_banned action must really restrict the account
  // (B11), which is an auth-service concern. Validate up front so a malformed
  // request never opens a transaction.
  const suspendsUser = actionTypeDb === 'user_suspended';
  const bansUser = actionTypeDb === 'user_banned';
  if ((suspendsUser || bansUser) && (req.targetUserId === undefined || req.targetUserId === '')) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `target_user_id is required to ${suspendsUser ? 'suspend' : 'ban'} a user`
    );
  }
  if ((suspendsUser || bansUser) && authClient === undefined) {
    throw new HandlerError('INTERNAL', 'auth client not configured; cannot restrict a user');
  }

  // duration is a number of DAYS (the admin UI offers 1, 7, 30 or
  // indefinite); it is stored as-is and converted here to an absolute
  // expires_at timestamp. No duration means permanent: expires_at stays NULL.
  const expiresAt =
    req.duration !== undefined && req.duration > 0
      ? new Date(Date.now() + req.duration * 24 * 60 * 60 * 1000).toISOString()
      : null;

  return withTransaction(deps, async ({ client, publish }) => {
    const actionId = randomUUID();
    const inserted = await client.query<ModeratorActionRow>(
      `INSERT INTO moderator_actions (
         action_id, moderator_id, report_id, target_entity_type,
         target_entity_id, target_user_id, action_type, severity, reason,
         description, metadata, duration, expires_at, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, true)
       RETURNING action_id, moderator_id, report_id, target_entity_type,
                 target_entity_id, target_user_id, action_type, severity, reason,
                 description, metadata, duration, expires_at, is_active,
                 acknowledged_at, created_at, updated_at`,
      [
        actionId,
        principal.userId,
        req.reportId ?? null,
        targetEntityTypeDb,
        req.targetEntityId,
        req.targetUserId ?? null,
        actionTypeDb,
        severityDb,
        req.reason,
        req.description ?? null,
        metadataJson,
        req.duration ?? null,
        expiresAt,
      ]
    );

    if (inserted.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }

    // The suspension runs inside the transaction: if auth rejects it the
    // throw rolls back the action row and the queued event, so a failed
    // sanction leaves nothing half-written.
    if (suspendsUser && authClient !== undefined && req.targetUserId) {
      try {
        await authClient.suspendUser(req.targetUserId, principalToMetadata(principal));
      } catch (err) {
        throw new HandlerError(
          grpcStatusToHandlerCode(err),
          `could not suspend user ${req.targetUserId}: ${(err as Error).message}`
        );
      }
    }

    // A ban deactivates the account and ends every session, so the user is
    // locked out now rather than when their tokens expire. Deactivate first:
    // if ending sessions then fails, the throw rolls the action row back and
    // a retry is idempotent (deactivating twice is a no-op in auth).
    if (bansUser && authClient !== undefined && req.targetUserId) {
      try {
        const metadata = principalToMetadata(principal);
        await authClient.deactivateUser(req.targetUserId, metadata);
        await authClient.revokeAllSessions(req.targetUserId, metadata);
      } catch (err) {
        throw new HandlerError(
          grpcStatusToHandlerCode(err),
          `could not ban user ${req.targetUserId}: ${(err as Error).message}`
        );
      }
    }

    publish({
      type: 'moderation.actionLogged',
      id: actionId,
      payload: {
        actionId,
        moderatorId: principal.userId,
        reportId: req.reportId ?? null,
        targetEntityType: targetEntityTypeDb,
        targetEntityId: req.targetEntityId,
        targetUserId: req.targetUserId ?? null,
        actionType: actionTypeDb,
        severity: severityDb,
      },
    });

    // Forensic record: service.audit persists every `<domain>.actionTaken`.
    publish({
      type: 'moderation.actionTaken',
      id: `moderation.actionTaken.${actionId}`,
      payload: {
        eventId: randomUUID(),
        service: 'service.moderation',
        subject: 'moderation.actionTaken',
        aggregateType: 'moderator_action',
        aggregateId: actionId,
        actorUserId: principal.userId,
        action: actionTypeDb,
        outcome: 'success',
        occurredAt: new Date().toISOString(),
        payload: {
          targetUserId: req.targetUserId ?? null,
          targetEntityType: targetEntityTypeDb,
          targetEntityId: req.targetEntityId,
          reportId: req.reportId ?? null,
          duration: req.duration ?? null,
          expiresAt,
        },
      },
    });

    return { action: actionRowToProto(inserted.rows[0]) };
  });
}

// logModeratorAction needs the auth client to apply user_suspended; the gRPC
// server closes over it here (same factory shape as rescue's pets client).
export const makeLogModeratorAction =
  (authClient: AuthClient) =>
  (
    deps: HandlerDeps,
    principal: Principal,
    req: LogModeratorActionRequest
  ): Promise<LogModeratorActionResponse> =>
    logModeratorAction(deps, principal, req, authClient);

// --- ListModeratorActions --------------------------------------------

export async function listModeratorActions(
  deps: HandlerDeps,
  principal: Principal,
  req: ListModeratorActionsRequest
): Promise<ListModeratorActionsResponse> {
  ensureModerationPermission(principal);

  const limit = clampLimit(req.limit);

  const where: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (req.targetUserId !== undefined && req.targetUserId !== '') {
    where.push(`target_user_id = $${p++}`);
    params.push(req.targetUserId);
  }
  if (req.reportId !== undefined && req.reportId !== '') {
    where.push(`report_id = $${p++}`);
    params.push(req.reportId);
  }
  if (req.actionType !== undefined && req.actionType !== 0) {
    where.push(`action_type = $${p++}`);
    params.push(actionTypeToDb(req.actionType));
  }

  // active_only narrows to sanctions/actions still in force: flagged active
  // AND either permanent (no expiry) or not yet expired. Powers the
  // "active actions against this user" view (lib.moderation getActiveActions).
  if (req.activeOnly === true) {
    where.push(`is_active = true AND (expires_at IS NULL OR expires_at > now())`);
  }

  // Offset mode: admin datatables pass `page` and need a real total so the
  // shared DataTable can render "Page X of Y" and gate Next. Keyset cursors
  // can't cheaply produce a count, so this path issues a COUNT(*) over the
  // same filter. Offset callers never send a cursor, so the cursor predicate
  // is skipped.
  const offsetMode = req.page !== undefined && req.page > 0;

  if (!offsetMode && req.cursor !== undefined && req.cursor !== '') {
    let cursor;
    try {
      cursor = decodeCursor(req.cursor);
    } catch (err) {
      if (err instanceof InvalidCursorError) {
        throw new HandlerError('INVALID_ARGUMENT', err.message);
      }
      throw err;
    }
    where.push(`(created_at < $${p++} OR (created_at = $${p - 1} AND action_id < $${p++}))`);
    params.push(cursor.createdAt);
    params.push(cursor.id);
  }

  const whereSql = where.length === 0 ? '' : `WHERE ${where.join(' AND ')}`;

  if (offsetMode) {
    const offset = ((req.page ?? 1) - 1) * limit;
    const pageResult = await deps.pool.query<ModeratorActionRow>(
      `
      SELECT action_id, moderator_id, report_id, target_entity_type,
             target_entity_id, target_user_id, action_type, severity, reason,
             description, metadata, duration, expires_at, is_active,
             acknowledged_at, created_at, updated_at
      FROM moderator_actions
      ${whereSql}
      ORDER BY created_at DESC, action_id DESC
      LIMIT $${p} OFFSET $${p + 1}
      `,
      [...params, limit, offset]
    );
    const countResult = await deps.pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM moderator_actions ${whereSql}`,
      params
    );
    return {
      actions: pageResult.rows.map(actionRowToProto),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  params.push(limit + 1);
  const sql = `
    SELECT action_id, moderator_id, report_id, target_entity_type,
           target_entity_id, target_user_id, action_type, severity, reason,
           description, metadata, duration, expires_at, is_active,
           acknowledged_at, created_at, updated_at
    FROM moderator_actions
    ${whereSql}
    ORDER BY created_at DESC, action_id DESC
    LIMIT $${p}
  `;

  const { rows } = await deps.pool.query<ModeratorActionRow>(sql, params);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const actions = pageRows.map(actionRowToProto);

  const response: ListModeratorActionsResponse = { actions };
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    response.nextCursor = encodeCursor({
      createdAt: last.created_at.toISOString(),
      id: last.action_id,
    });
  }

  return response;
}

// --- AddEvidence -----------------------------------------------------

export async function addEvidence(
  deps: HandlerDeps,
  principal: Principal,
  req: AddEvidenceRequest
): Promise<AddEvidenceResponse> {
  ensureModerationPermission(principal);

  if (req.parentId === undefined || req.parentId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'parent_id is required');
  }
  if (req.parentType === undefined || req.parentType === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'parent_type is required');
  }
  if (req.type === undefined || req.type === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'type is required');
  }
  if (req.content === undefined || req.content === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content is required');
  }

  const parentTypeDb = evidenceParentTypeToDb(req.parentType);
  const typeDb = evidenceTypeToDb(req.type);

  return withTransaction(deps, async ({ client, publish }) => {
    const evidenceId = randomUUID();
    const inserted = await client.query<EvidenceRow>(
      `INSERT INTO moderation_evidence (
         evidence_id, parent_type, parent_id, type, content, description,
         created_by, updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING evidence_id, parent_type, parent_id, type, content,
                 description, uploaded_at`,
      [
        evidenceId,
        parentTypeDb,
        req.parentId,
        typeDb,
        req.content,
        req.description ?? null,
        principal.userId,
      ]
    );

    if (inserted.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }

    publish({
      type: 'moderation.evidenceAdded',
      id: evidenceId,
      payload: {
        evidenceId,
        parentType: parentTypeDb,
        parentId: req.parentId,
        type: typeDb,
      },
    });

    return { evidence: evidenceRowToProto(inserted.rows[0]) };
  });
}
