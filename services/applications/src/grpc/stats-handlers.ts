// gRPC handler — GetStats (read side).
//
// Application counts grouped by status for the rescue dashboard's
// stats cards. Reads straight off the `applications` read-model row
// (deps.pool, no transaction) — a single GROUP BY, no event-stream
// fold needed because counts only depend on the projected `status`
// column.
//
// Authz + scoping mirror listApplications exactly:
//   - super_admin sees everything, may narrow by rescue/adopter filter,
//   - rescue staff are pinned to their own rescue (may narrow to one
//     adopter),
//   - adopters see only their own applications.
//
// The response exposes RAW per-service-status counts (zero-filled for
// statuses with no rows); the gateway collapses them to the SPA's
// 4-state shape.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_VIEW } from '@adopt-dont-shop/lib.types';
import type { GetStatsRequest, GetStatsResponse } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { ALL_APPLICATION_STATUSES, type ApplicationStatusDb } from './enum-map.js';

// A grouped-count row from the GROUP BY. Postgres COUNT(*) comes back
// as a string (bigint), so parse it.
type StatusCountRow = {
  status: string;
  count: string;
};

export async function getStats(
  deps: HandlerDeps,
  principal: Principal,
  req: GetStatsRequest
): Promise<GetStatsResponse> {
  if (!requirePermission(principal, APPLICATIONS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required`);
  }

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let p = 1;

  // Scope the counted set to what the principal is allowed to see —
  // identical to listApplications.
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
    where.push(`rescue_id = $${p++}`);
    params.push(principal.rescueId);
    if (req.adopterIdFilter !== undefined && req.adopterIdFilter !== '') {
      where.push(`user_id = $${p++}`);
      params.push(req.adopterIdFilter);
    }
  } else {
    where.push(`user_id = $${p++}`);
    params.push(principal.userId);
  }

  const sql = `
    SELECT status, COUNT(*) AS count
    FROM applications
    WHERE ${where.join(' AND ')}
    GROUP BY status
  `;

  const { rows } = await deps.pool.query<StatusCountRow>(sql, params);

  const counts = new Map<string, number>(rows.map(row => [row.status, Number(row.count)]));
  const countFor = (status: ApplicationStatusDb): number => counts.get(status) ?? 0;

  const total = ALL_APPLICATION_STATUSES.reduce((sum, status) => sum + countFor(status), 0);

  return {
    total,
    draft: countFor('draft'),
    submitted: countFor('submitted'),
    underReview: countFor('under_review'),
    homeVisitScheduled: countFor('home_visit_scheduled'),
    homeVisitCompleted: countFor('home_visit_completed'),
    approved: countFor('approved'),
    rejected: countFor('rejected'),
    withdrawn: countFor('withdrawn'),
    adopted: countFor('adopted'),
  };
}
