// gRPC handler implementations for ApplicationService — batch 3 (reads).
//
// Phase 5.3b — the query side: Get + List. The command handlers
// (#930 draft, #931 review/decision) own the write path; these two are
// read-only and run OUTSIDE a transaction (straight off deps.pool).
//
// Read strategy — event-stream fold, not the read-model row:
//   The applications read-model row (migration 002) only carries the
//   live status/answers/version; the lifecycle timestamps the proto
//   needs (submitted_at, review_started_at, decided_at, …) aren't
//   projected onto it. So a complete Application proto can only be
//   built by folding the event stream. Get folds the one aggregate;
//   List uses the read-model row purely as a filter + keyset-pagination
//   INDEX (status, user_id, rescue_id, created_at, application_id are
//   real columns) then folds each aggregate in the page.
//
// Authz:
//   - Get: adopter-owns OR rescue-staff-of-the-app's-rescue OR admin.
//     The owner/rescue is only known after the fold, so the scope check
//     runs post-load (an unknown id still 404s before leaking scope).
//   - List: the principal's scope decides the forced filter — admins
//     see everything (and may filter by rescue/adopter), rescue staff
//     are pinned to their own rescue, adopters to their own user id.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_VIEW, type RescueId, type UserId } from '@adopt-dont-shop/lib.types';
import {
  ApplicationsV1,
  type GetApplicationRequest,
  type GetApplicationResponse,
  type ListApplicationsRequest,
  type ListApplicationsResponse,
} from '@adopt-dont-shop/proto';

import { fold } from '../domain/index.js';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor.js';
import { statusToDb } from './enum-map.js';
import { loadAggregate, loadEventRows } from './event-store.js';
import { stateToProto } from './state-mapper.js';
import { buildTimeline } from './timeline.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampLimit(raw: number): number {
  if (raw <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.trunc(raw), MAX_LIMIT);
}

// An index row from the applications read model — just enough to filter,
// order and keyset-paginate. The full proto comes from folding each
// aggregate's event stream.
type IndexRow = {
  application_id: string;
  created_at: Date;
};

// --- Get -------------------------------------------------------------

export async function getApplication(
  deps: HandlerDeps,
  principal: Principal,
  req: GetApplicationRequest
): Promise<GetApplicationResponse> {
  if (req.applicationId === undefined || req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }

  const rows = await loadEventRows(deps.pool, req.applicationId);
  if (rows.length === 0) {
    throw new HandlerError('NOT_FOUND', 'application not found');
  }

  const state = fold(rows.map(r => r.event_data));

  // Adopter-owns OR rescue-staff-of-this-rescue OR admin. super_admin
  // short-circuits both checks inside requirePermission.
  const canRead =
    requirePermission(principal, APPLICATIONS_VIEW, { userId: state.adopterId as UserId }) ||
    requirePermission(principal, APPLICATIONS_VIEW, { rescueId: state.rescueId as RescueId });
  if (!canRead) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required`);
  }

  const response: GetApplicationResponse = {
    application: stateToProto(state),
    timeline: [],
  };
  if (req.includeTimeline === true) {
    response.timeline = buildTimeline(rows);
  }

  return response;
}

// --- List ------------------------------------------------------------

export async function listApplications(
  deps: HandlerDeps,
  principal: Principal,
  req: ListApplicationsRequest
): Promise<ListApplicationsResponse> {
  if (!requirePermission(principal, APPLICATIONS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required`);
  }

  const limit = clampLimit(req.limit);

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let p = 1;

  // Scope the result set to what the principal is allowed to see.
  const isSuperAdmin = principal.roles.includes('super_admin');
  if (isSuperAdmin) {
    if (req.rescueIdFilter !== undefined && req.rescueIdFilter !== '') {
      where.push(`rescue_id = $${p++}`);
      params.push(req.rescueIdFilter);
    }
    if (req.adopterIdFilter !== undefined && req.adopterIdFilter !== '') {
      where.push(`user_id = $${p++}`);
      params.push(req.adopterIdFilter);
    }
  } else if (principal.rescueId !== undefined) {
    // Rescue staff — pinned to their own rescue, may narrow to one adopter.
    where.push(`rescue_id = $${p++}`);
    params.push(principal.rescueId);
    if (req.adopterIdFilter !== undefined && req.adopterIdFilter !== '') {
      where.push(`user_id = $${p++}`);
      params.push(req.adopterIdFilter);
    }
  } else {
    // Adopter — their own applications only.
    where.push(`user_id = $${p++}`);
    params.push(principal.userId);
  }

  if (req.statusFilter !== ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED) {
    where.push(`status = $${p++}`);
    params.push(statusToDb(req.statusFilter));
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
    // (created_at, application_id) < (cursor) in DESC order.
    where.push(`(created_at < $${p++} OR (created_at = $${p - 1} AND application_id < $${p++}))`);
    params.push(cursor.createdAt);
    params.push(cursor.applicationId);
  }

  // Fetch limit+1 to detect a next page without a separate COUNT(*).
  params.push(limit + 1);
  const sql = `
    SELECT application_id, created_at
    FROM applications
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC, application_id DESC
    LIMIT $${p}
  `;

  const { rows } = await deps.pool.query<IndexRow>(sql, params);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  // Fold each aggregate's event stream into the full proto. The index
  // row guarantees the aggregate exists, so loadAggregate never returns
  // the empty INITIAL_STATE here.
  const applications = await Promise.all(
    pageRows.map(async row => stateToProto(await loadAggregate(deps.pool, row.application_id)))
  );

  const response: ListApplicationsResponse = { applications };
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    response.nextCursor = encodeCursor({
      createdAt: last.created_at.toISOString(),
      applicationId: last.application_id,
    });
  }

  return response;
}
