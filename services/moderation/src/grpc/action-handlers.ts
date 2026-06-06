// gRPC handler implementations for ModerationService — batch 2.
//
// Phase 8.3b — ships the moderator-action + evidence surface:
// LogModeratorAction, ListModeratorActions, AddEvidence. The report
// lifecycle handlers (FileReport, GetReport, ListReports,
// AssignReport, ResolveReport) shipped in #924. Sanctions + support
// tickets follow in the next batch.
//
// Same discipline as handlers.ts: withTransaction for writes, gate on
// ADMIN_DASHBOARD (placeholder until lib.types ships MODERATION_*),
// $-indexed SQL params, mappers from #913 for row → proto.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { ADMIN_DASHBOARD } from '@adopt-dont-shop/lib.types';
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
  if (!requirePermission(principal, ADMIN_DASHBOARD)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_DASHBOARD}' required`);
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
  req: LogModeratorActionRequest
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

  // duration is in days; expires_at is derived only when a duration
  // is supplied (permanent actions leave it NULL).
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

    return { action: actionRowToProto(inserted.rows[0]) };
  });
}

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

  if (req.cursor !== undefined && req.cursor !== '') {
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
