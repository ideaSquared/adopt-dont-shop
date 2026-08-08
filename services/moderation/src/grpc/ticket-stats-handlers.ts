// GetSupportTicketStats — the aggregate snapshot behind the admin
// support dashboard's stat cards (lib.support-tickets useTicketStats →
// GET /api/v1/admin/support/stats). Pure read: three SQL aggregates
// over support_tickets, no writes, no events.
//
// Gated on MODERATION_TICKETS_MANAGE — the same permission the admin
// (non-self-scoped) ticket surface uses. Mirrors metrics-handlers.ts.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { MODERATION_TICKETS_MANAGE } from '@adopt-dont-shop/lib.types';
import type {
  GetSupportTicketStatsRequest,
  GetSupportTicketStatsResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { ticketCategoryFromDb } from './enum-map.js';

// Cap the staff-activity list so a pathological data set can't return an
// unbounded payload — the dashboard only renders the leaders anyway.
const STAFF_ACTIVITY_LIMIT = 25;

type AggRow = {
  total: string;
  open: string;
  in_progress: string;
  waiting_for_user: string;
  resolved: string;
  closed: string;
  escalated: string;
  overdue: string;
  unassigned: string;
  today: string;
  this_week: string;
  this_month: string;
  avg_response_hours: string | null;
  avg_resolution_hours: string | null;
  prio_low: string;
  prio_normal: string;
  prio_high: string;
  prio_urgent: string;
  prio_critical: string;
};

type CategoryRow = { category: string; count: string };
type StaffRow = { staff_id: string; assigned_count: string; resolved_count: string };

// pg returns count()/bigint as strings; coerce defensively to a
// non-negative integer.
const toInt = (v: string | number | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

// Response/resolution times are fractional hour counts — keep two decimals.
const toHours = (v: string | number | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export async function getSupportTicketStats(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetSupportTicketStatsRequest
): Promise<GetSupportTicketStatsResponse> {
  if (!requirePermission(principal, MODERATION_TICKETS_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MODERATION_TICKETS_MANAGE}' required`);
  }

  // One pass over support_tickets for every scalar bucket — status counts,
  // the overdue/unassigned SLA buckets, rolling-window counts, mean
  // response/resolution ages (hours), and the priority breakdown.
  //
  // 'overdue' = still-actionable tickets (open or in_progress) whose age
  // exceeds the 48h first-response SLA.
  // 'unassigned' = still-actionable (not resolved/closed) tickets with no
  // owner — the queue an admin needs to triage.
  const aggRes = await deps.pool.query<AggRow>(
    `SELECT
       count(*) AS total,
       count(*) FILTER (WHERE status = 'open') AS open,
       count(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       count(*) FILTER (WHERE status = 'waiting_for_user') AS waiting_for_user,
       count(*) FILTER (WHERE status = 'resolved') AS resolved,
       count(*) FILTER (WHERE status = 'closed') AS closed,
       count(*) FILTER (WHERE status = 'escalated') AS escalated,
       count(*) FILTER (
         WHERE status IN ('open', 'in_progress')
           AND created_at < now() - interval '48 hours'
       ) AS overdue,
       count(*) FILTER (
         WHERE assigned_to IS NULL AND status NOT IN ('resolved', 'closed')
       ) AS unassigned,
       count(*) FILTER (WHERE created_at >= now() - interval '1 day') AS today,
       count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS this_week,
       count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS this_month,
       avg(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600.0)
         FILTER (WHERE first_response_at IS NOT NULL) AS avg_response_hours,
       avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0)
         FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_hours,
       count(*) FILTER (WHERE priority = 'low') AS prio_low,
       count(*) FILTER (WHERE priority = 'normal') AS prio_normal,
       count(*) FILTER (WHERE priority = 'high') AS prio_high,
       count(*) FILTER (WHERE priority = 'urgent') AS prio_urgent,
       count(*) FILTER (WHERE priority = 'critical') AS prio_critical
     FROM support_tickets`
  );
  const agg = aggRes.rows[0];

  const categoriesRes = await deps.pool.query<CategoryRow>(
    `SELECT category::text AS category, count(*) AS count
       FROM support_tickets
      GROUP BY category
      ORDER BY count(*) DESC, category ASC`
  );

  // Per-staff activity: how many tickets each assignee owns and how many of
  // those they have taken to resolution (resolved_at set).
  const staffRes = await deps.pool.query<StaffRow>(
    `SELECT assigned_to AS staff_id,
            count(*) AS assigned_count,
            count(*) FILTER (WHERE resolved_at IS NOT NULL) AS resolved_count
       FROM support_tickets
      WHERE assigned_to IS NOT NULL
      GROUP BY assigned_to
      ORDER BY count(*) DESC, assigned_to ASC
      LIMIT $1`,
    [STAFF_ACTIVITY_LIMIT]
  );

  return {
    total: toInt(agg?.total),
    open: toInt(agg?.open),
    inProgress: toInt(agg?.in_progress),
    waitingForUser: toInt(agg?.waiting_for_user),
    resolved: toInt(agg?.resolved),
    closed: toInt(agg?.closed),
    escalated: toInt(agg?.escalated),
    overdue: toInt(agg?.overdue),
    unassigned: toInt(agg?.unassigned),
    averageResponseTime: toHours(agg?.avg_response_hours),
    averageResolutionTime: toHours(agg?.avg_resolution_hours),
    // satisfactionAverage is intentionally left unset — no satisfaction
    // survey data is collected yet (surfaced as null to the frontend).
    ticketsToday: toInt(agg?.today),
    ticketsThisWeek: toInt(agg?.this_week),
    ticketsThisMonth: toInt(agg?.this_month),
    byPriority: {
      low: toInt(agg?.prio_low),
      normal: toInt(agg?.prio_normal),
      high: toInt(agg?.prio_high),
      urgent: toInt(agg?.prio_urgent),
      critical: toInt(agg?.prio_critical),
    },
    byCategory: categoriesRes.rows.map(r => ({
      category: ticketCategoryFromDb(r.category),
      count: toInt(r.count),
    })),
    staffActivity: staffRes.rows.map(r => ({
      staffId: r.staff_id,
      assignedCount: toInt(r.assigned_count),
      resolvedCount: toInt(r.resolved_count),
    })),
  };
}
