// GetModerationMetrics — the aggregate snapshot behind the admin
// moderation dashboard's stat cards (lib.moderation useModerationMetrics →
// GET /api/v1/admin/moderation/metrics). Pure read: three SQL aggregates
// over reports + moderator_actions, no writes, no events.
//
// Gated on MODERATION_REPORTS_VIEW — the same permission ListReports uses
// for the internal (non-self-scoped) view.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { MODERATION_REPORTS_VIEW } from '@adopt-dont-shop/lib.types';
import type {
  GetModerationMetricsRequest,
  GetModerationMetricsResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';

import { categoryFromDb } from './enum-map.js';

// Cap the two breakdown lists so a pathological data set can't return an
// unbounded payload — the dashboard only renders the leaders anyway.
const TOP_CATEGORIES_LIMIT = 8;
const MODERATOR_ACTIVITY_LIMIT = 25;

type ReportAggRow = {
  total: string;
  pending: string;
  under_review: string;
  resolved: string;
  dismissed: string;
  escalated: string;
  critical: string;
  today: string;
  this_week: string;
  this_month: string;
  avg_resolution_hours: string | null;
};

type CategoryRow = { category: string; count: string };
type ActivityRow = { moderator_id: string; actions_count: string; resolved_count: string };

// pg returns count()/bigint as strings; coerce defensively to a
// non-negative integer.
const toInt = (v: string | number | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

// Average resolution time is a fractional hour count — keep two decimals.
const toHours = (v: string | number | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export async function getModerationMetrics(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetModerationMetricsRequest
): Promise<GetModerationMetricsResponse> {
  if (!requirePermission(principal, MODERATION_REPORTS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MODERATION_REPORTS_VIEW}' required`);
  }

  // One pass over reports for every scalar bucket — status/severity counts,
  // rolling-window counts, and mean resolution age (hours).
  const aggRes = await deps.pool.query<ReportAggRow>(
    `SELECT
       count(*) AS total,
       count(*) FILTER (WHERE status = 'pending') AS pending,
       count(*) FILTER (WHERE status = 'under_review') AS under_review,
       count(*) FILTER (WHERE status = 'resolved') AS resolved,
       count(*) FILTER (WHERE status = 'dismissed') AS dismissed,
       count(*) FILTER (WHERE status = 'escalated') AS escalated,
       count(*) FILTER (WHERE severity = 'critical') AS critical,
       count(*) FILTER (WHERE created_at >= now() - interval '1 day') AS today,
       count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS this_week,
       count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS this_month,
       avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0)
         FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_hours
     FROM reports`
  );
  const agg = aggRes.rows[0];

  const categoriesRes = await deps.pool.query<CategoryRow>(
    `SELECT category::text AS category, count(*) AS count
       FROM reports
      GROUP BY category
      ORDER BY count(*) DESC, category ASC
      LIMIT $1`,
    [TOP_CATEGORIES_LIMIT]
  );

  // Per-moderator activity: actions logged (moderator_actions) FULL OUTER
  // JOINed with reports they resolved (reports.resolved_by), so a moderator
  // who only did one side still appears with a zero on the other.
  const activityRes = await deps.pool.query<ActivityRow>(
    `SELECT
       coalesce(acts.moderator_id, res.moderator_id) AS moderator_id,
       coalesce(acts.actions_count, 0) AS actions_count,
       coalesce(res.resolved_count, 0) AS resolved_count
     FROM (
       SELECT moderator_id, count(*) AS actions_count
         FROM moderator_actions
        GROUP BY moderator_id
     ) acts
     FULL OUTER JOIN (
       SELECT resolved_by AS moderator_id, count(*) AS resolved_count
         FROM reports
        WHERE resolved_by IS NOT NULL AND status = 'resolved'
        GROUP BY resolved_by
     ) res ON acts.moderator_id = res.moderator_id
     ORDER BY coalesce(acts.actions_count, 0) DESC,
              coalesce(res.resolved_count, 0) DESC,
              coalesce(acts.moderator_id, res.moderator_id) ASC
     LIMIT $1`,
    [MODERATOR_ACTIVITY_LIMIT]
  );

  return {
    totalReports: toInt(agg?.total),
    pendingReports: toInt(agg?.pending),
    underReviewReports: toInt(agg?.under_review),
    resolvedReports: toInt(agg?.resolved),
    dismissedReports: toInt(agg?.dismissed),
    escalatedReports: toInt(agg?.escalated),
    criticalReports: toInt(agg?.critical),
    averageResolutionTime: toHours(agg?.avg_resolution_hours),
    reportsToday: toInt(agg?.today),
    reportsThisWeek: toInt(agg?.this_week),
    reportsThisMonth: toInt(agg?.this_month),
    topCategories: categoriesRes.rows.map(r => ({
      category: categoryFromDb(r.category),
      count: toInt(r.count),
    })),
    moderatorActivity: activityRes.rows.map(r => ({
      moderatorId: r.moderator_id,
      actionsCount: toInt(r.actions_count),
      resolvedCount: toInt(r.resolved_count),
    })),
  };
}
