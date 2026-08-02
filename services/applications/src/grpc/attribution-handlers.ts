// gRPC handler — CountAdoptedAdopters (ADS-941, hardened in ADS-1006).
//
// Cross-service attribution primitive: given a caller-supplied set of
// adopter user ids (e.g. service.rescue resolves an event's registrant
// list from rescue.event_attendees), returns how many of them have at
// least one non-deleted application that reached APPROVED or ADOPTED
// status with created_at inside [created_after, created_before].
//
// The response is a single distinct-adopter count. That "the caller never
// learns which ids matched" is only privacy-preserving when the id set is
// large enough that the count cannot be attributed to one person — with a
// single id the count ∈ {0,1} is a direct yes/no about that user, and a
// caller-controlled created window turns that boolean into a timeline
// (ADS-1006). Two preconditions therefore hold the safety property:
//
//   1. Gated on ANALYTICS_VIEW (admin.reports), an admin-only reporting
//      permission — NOT applications.read, which every adopter is seeded.
//   2. A k-anonymity cohort floor (MIN_COHORT_SIZE): the request is
//      rejected below it, so the response can never be a per-user answer.
//
// Reads straight off the `applications` read-model row (no event-fold
// needed — status + created_at are both real columns).

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

export async function countAdoptedAdopters(
  deps: HandlerDeps,
  principal: Principal,
  req: CountAdoptedAdoptersRequest
): Promise<CountAdoptedAdoptersResponse> {
  if (!requirePermission(principal, ANALYTICS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ANALYTICS_VIEW}' required`);
  }
  if (!req.createdAfter) {
    throw new HandlerError('INVALID_ARGUMENT', 'created_after is required');
  }
  if (!req.createdBefore) {
    throw new HandlerError('INVALID_ARGUMENT', 'created_before is required');
  }

  const adopterIds = [...new Set(req.adopterIds.filter(id => id !== ''))];
  if (adopterIds.length < MIN_COHORT_SIZE) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `at least ${MIN_COHORT_SIZE} distinct adopter ids required`
    );
  }

  const { rows } = await deps.pool.query<CountRow>(
    `SELECT COUNT(DISTINCT user_id) AS count
       FROM applications
      WHERE deleted_at IS NULL
        AND status IN ('approved', 'adopted')
        AND user_id = ANY($1)
        AND created_at >= $2
        AND created_at <= $3`,
    [adopterIds, req.createdAfter, req.createdBefore]
  );

  return { count: Number(rows[0]?.count ?? '0') };
}
