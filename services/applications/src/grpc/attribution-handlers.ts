// gRPC handler — CountAdoptedAdopters (ADS-941, hardened in ADS-1006,
// rescue-scoped + input-bounded in ADS-1023/ADS-1024, actioned_at in
// ADS-1025).
//
// Cross-service attribution primitive: given a caller-supplied set of
// adopter user ids (e.g. service.rescue resolves an event's registrant
// list from rescue.event_attendees), returns how many of them have at
// least one non-deleted application that reached APPROVED or ADOPTED
// status with actioned_at — when it REACHED that status, stamped by
// event-store.ts's projectReadModel off the triggering event's
// occurred_at, not when the application was first created — inside
// [actioned_after, actioned_before]. Optionally narrowed to a single
// rescue via rescue_id.
//
// The response is a single distinct-adopter count. That "the caller never
// learns which ids matched" is only privacy-preserving when the id set is
// large enough that the count cannot be attributed to one person — with a
// single id the count ∈ {0,1} is a direct yes/no about that user, and a
// caller-controlled actioned window turns that boolean into a timeline
// (ADS-1006). These preconditions hold the safety property:
//
//   1. Gated on ANALYTICS_VIEW (admin.reports), an admin-only reporting
//      permission — NOT applications.read, which every adopter is seeded.
//   2. A k-anonymity cohort floor (MIN_COHORT_SIZE): the request is
//      rejected below it, so the response can never be a per-user answer.
//   3. adopter_ids is capped at MAX_ADOPTER_IDS (ADS-1024) so one request
//      can't smuggle an unbounded query past the two guards above.
//
// Reads straight off the `applications` read-model row (no event-fold
// needed — status / actioned_at / rescue_id are all real columns). Query
// shape is user_id = ANY(ids) + status IN (...) + actioned_at range,
// optionally + rescue_id — the existing
// applications_rescue_status_created_idx compound index is on
// (rescue_id, status, created_at), not actioned_at, so the rescue-scoped
// path here doesn't get full index coverage; a matching
// (rescue_id, status, actioned_at) index is a worthwhile follow-up but is
// deliberately left out of this change (see PR description).
import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { ANALYTICS_VIEW } from '@adopt-dont-shop/lib.types';
import type {
  CountAdoptedAdoptersRequest,
  CountAdoptedAdoptersResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';

type CountRow = { count: string };

// k-anonymity floor: below this many distinct candidate ids the distinct
// count degrades to a per-user oracle, so reject rather than answer. The
// legitimate caller (service.rescue event attribution) skips the call when
// the registrant cohort is smaller than this, so small events degrade to a
// 0 count rather than an error.
export const MIN_COHORT_SIZE = 20;

// Upper bound on adopter_ids per request (ADS-1024) — documented on the
// proto field. Rejected with INVALID_ARGUMENT before any query runs.
export const MAX_ADOPTER_IDS = 10_000;

export async function countAdoptedAdopters(
  deps: HandlerDeps,
  principal: Principal,
  req: CountAdoptedAdoptersRequest
): Promise<CountAdoptedAdoptersResponse> {
  if (!requirePermission(principal, ANALYTICS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ANALYTICS_VIEW}' required`);
  }

  if (req.adopterIds.length > MAX_ADOPTER_IDS) {
    throw new HandlerError('INVALID_ARGUMENT', `adopter_ids exceeds the ${MAX_ADOPTER_IDS} cap`);
  }
  if (!req.actionedAfter) {
    throw new HandlerError('INVALID_ARGUMENT', 'actioned_after is required');
  }
  if (!req.actionedBefore) {
    throw new HandlerError('INVALID_ARGUMENT', 'actioned_before is required');
  }

  const actionedAfterMs = Date.parse(req.actionedAfter);
  if (Number.isNaN(actionedAfterMs)) {
    throw new HandlerError('INVALID_ARGUMENT', 'actioned_after is not a valid date');
  }
  const actionedBeforeMs = Date.parse(req.actionedBefore);
  if (Number.isNaN(actionedBeforeMs)) {
    throw new HandlerError('INVALID_ARGUMENT', 'actioned_before is not a valid date');
  }
  if (actionedAfterMs > actionedBeforeMs) {
    throw new HandlerError('INVALID_ARGUMENT', 'actioned_after must not be after actioned_before');
  }

  const adopterIds = [...new Set(req.adopterIds.filter(id => id !== ''))];
  if (adopterIds.length < MIN_COHORT_SIZE) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `at least ${MIN_COHORT_SIZE} distinct adopter ids required`
    );
  }

  const params: unknown[] = [adopterIds, req.actionedAfter, req.actionedBefore];
  let p = params.length;
  // Optional rescue scope (ADS-1023) — e.g. an event's attribution count
  // should only reflect adoptions at the rescue that ran the event.
  let rescueFilter = '';
  if (req.rescueId !== undefined && req.rescueId !== '') {
    params.push(req.rescueId);
    rescueFilter = ` AND rescue_id = $${++p}`;
  }

  const { rows } = await deps.pool.query<CountRow>(
    `SELECT COUNT(DISTINCT user_id) AS count
       FROM applications
      WHERE deleted_at IS NULL
        AND status IN ('approved', 'adopted')
        AND user_id = ANY($1)
        AND actioned_at >= $2
        AND actioned_at <= $3${rescueFilter}`,
    params
  );

  return { count: Number(rows[0]?.count ?? '0') };
}
