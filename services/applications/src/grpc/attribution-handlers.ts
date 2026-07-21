// gRPC handler — CountAdoptedAdopters (ADS-941).
//
// Cross-service attribution primitive: given a caller-supplied set of
// adopter user ids (e.g. service.rescue resolves an event's registrant
// list from rescue.event_attendees), returns how many of them have at
// least one non-deleted application that reached APPROVED or ADOPTED
// status with created_at inside [created_after, created_before]. The
// response is a single distinct-adopter count — the caller never
// learns which ids matched or which rescue/pet was involved, so this
// is safe to expose to any principal holding applications.read (the
// same base gate List/GetStats use for their coarser reads).
//
// Reads straight off the `applications` read-model row (no event-fold
// needed — status + created_at are both real columns).

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_VIEW } from '@adopt-dont-shop/lib.types';
import type {
  CountAdoptedAdoptersRequest,
  CountAdoptedAdoptersResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';

type CountRow = { count: string };

export async function countAdoptedAdopters(
  deps: HandlerDeps,
  principal: Principal,
  req: CountAdoptedAdoptersRequest
): Promise<CountAdoptedAdoptersResponse> {
  if (!requirePermission(principal, APPLICATIONS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required`);
  }
  if (!req.createdAfter) {
    throw new HandlerError('INVALID_ARGUMENT', 'created_after is required');
  }
  if (!req.createdBefore) {
    throw new HandlerError('INVALID_ARGUMENT', 'created_before is required');
  }

  const adopterIds = [...new Set(req.adopterIds.filter(id => id !== ''))];
  if (adopterIds.length === 0) {
    return { count: 0 };
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
