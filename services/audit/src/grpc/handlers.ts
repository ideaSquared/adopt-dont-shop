// gRPC handler implementations for AuditQueryService.{Query, GetByTarget}.
//
// Both are read-only — the audit service is the sole producer of
// audit_events via its Phase 10.4 NATS subscriber. These RPCs serve
// the gateway's `view Audit`-gated GET /api/audit/* surface.
//
// Authz: both gate on the `admin.audit_logs` permission (ADMIN_AUDIT_LOGS
// from lib.types). The gateway gates first; this re-check is
// defence-in-depth (CAD pattern — handler doesn't trust the metadata
// stamped on a request to imply the metadata stamper checked the
// permission).
//
// Pure handlers — `(deps, principal, request) → Promise<response>`. The
// adapter (shipped in #900) wraps these in the grpc-js (call, callback)
// signature.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { ADMIN_AUDIT_LOGS } from '@adopt-dont-shop/lib.types';
import type {
  AuditEvent,
  AuditGetByTargetRequest,
  AuditGetByTargetResponse,
  AuditQueryRequest,
  AuditQueryResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor.js';
import { outcomeToDb } from './enum-map.js';
import { rowToProto, type AuditEventRow } from './mapper.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.trunc(raw), MAX_LIMIT);
}

function ensureViewAudit(principal: Principal): void {
  if (!requirePermission(principal, ADMIN_AUDIT_LOGS)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_AUDIT_LOGS}' required`);
  }
}

// --- Query -----------------------------------------------------------

export async function query(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditQueryRequest
): Promise<AuditQueryResponse> {
  ensureViewAudit(principal);

  const limit = clampLimit(req.limit);

  // Build the WHERE clause from the optional filters. We track the
  // parameter index so the placeholders match what we push into
  // `params`. Descending sort on (occurred_at, event_id) — the
  // cursor encodes the same tuple so keyset pagination is stable.
  const where: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (req.service !== undefined && req.service !== '') {
    where.push(`service = $${p++}`);
    params.push(req.service);
  }
  if (req.subject !== undefined && req.subject !== '') {
    where.push(`subject = $${p++}`);
    params.push(req.subject);
  }
  if (req.actorUserId !== undefined && req.actorUserId !== '') {
    where.push(`actor_user_id = $${p++}`);
    params.push(req.actorUserId);
  }
  if (req.outcome !== undefined && req.outcome !== 0) {
    where.push(`outcome = $${p++}`);
    params.push(outcomeToDb(req.outcome));
  }
  if (req.occurredAtFrom !== undefined && req.occurredAtFrom !== '') {
    where.push(`occurred_at >= $${p++}`);
    params.push(req.occurredAtFrom);
  }
  if (req.occurredAtTo !== undefined && req.occurredAtTo !== '') {
    where.push(`occurred_at < $${p++}`);
    params.push(req.occurredAtTo);
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
    // (occurred_at, event_id) < (cursor.occurredAt, cursor.eventId)
    // in DESC order — i.e. older rows OR same-time-different-id-later.
    where.push(`(occurred_at < $${p++} OR (occurred_at = $${p - 1} AND event_id < $${p++}))`);
    params.push(cursor.occurredAt);
    params.push(cursor.eventId);
  }

  const whereSql = where.length === 0 ? '' : `WHERE ${where.join(' AND ')}`;
  // Fetch limit+1 so we know whether there's a next page without a
  // separate COUNT(*) query.
  params.push(limit + 1);
  const sql = `
    SELECT event_id, service, subject, aggregate_type, aggregate_id,
           actor_user_id, actor_email_snapshot, action, outcome,
           occurred_at, recorded_at, payload, ip_address, user_agent
    FROM audit_events
    ${whereSql}
    ORDER BY occurred_at DESC, event_id DESC
    LIMIT $${p}
  `;

  const { rows } = await deps.pool.query<AuditEventRow>(sql, params);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const events = pageRows.map(rowToProto);

  const response: AuditQueryResponse = { events };
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    response.nextCursor = encodeCursor({
      occurredAt: last.occurred_at.toISOString(),
      eventId: last.event_id,
    });
  }

  return response;
}

// --- GetByTarget -----------------------------------------------------

export async function getByTarget(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditGetByTargetRequest
): Promise<AuditGetByTargetResponse> {
  ensureViewAudit(principal);

  if (req.aggregateType === undefined || req.aggregateType === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'aggregate_type is required');
  }
  if (req.aggregateId === undefined || req.aggregateId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'aggregate_id is required');
  }

  const limit = clampLimit(req.limit);

  const where: string[] = ['aggregate_type = $1', 'aggregate_id = $2'];
  const params: unknown[] = [req.aggregateType, req.aggregateId];
  let p = 3;

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
    where.push(`(occurred_at < $${p++} OR (occurred_at = $${p - 1} AND event_id < $${p++}))`);
    params.push(cursor.occurredAt);
    params.push(cursor.eventId);
  }

  params.push(limit + 1);
  const sql = `
    SELECT event_id, service, subject, aggregate_type, aggregate_id,
           actor_user_id, actor_email_snapshot, action, outcome,
           occurred_at, recorded_at, payload, ip_address, user_agent
    FROM audit_events
    WHERE ${where.join(' AND ')}
    ORDER BY occurred_at DESC, event_id DESC
    LIMIT $${p}
  `;

  const { rows } = await deps.pool.query<AuditEventRow>(sql, params);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const events: AuditEvent[] = pageRows.map(rowToProto);

  const response: AuditGetByTargetResponse = { events };
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    response.nextCursor = encodeCursor({
      occurredAt: last.occurred_at.toISOString(),
      eventId: last.event_id,
    });
  }

  return response;
}
