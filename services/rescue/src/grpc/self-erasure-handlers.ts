// Self-service erasure pre-check. The gateway calls this before it publishes
// the GDPR erasure saga for the caller's own account: erasing the only staff
// member of a rescue would orphan it (every staff member shares the
// rescue_staff role, so "last staff member" is the rule — there is no owner).
// Read-only and self-scoped (principal.userId only), so no permission gate.

import type { Principal } from '@adopt-dont-shop/authz';
import type {
  RescueCheckSelfErasureRequest,
  RescueCheckSelfErasureResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

export async function checkSelfErasure(
  deps: HandlerDeps,
  principal: Principal | null,
  _req: RescueCheckSelfErasureRequest
): Promise<RescueCheckSelfErasureResponse> {
  void _req;
  if (!principal) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }

  // Any live rescue where the caller holds a live membership and no OTHER
  // user holds one.
  const { rows } = await deps.pool.query<{ rescue_id: string }>(
    `SELECT sm.rescue_id
       FROM rescue.staff_members sm
       JOIN rescue.rescues r ON r.rescue_id = sm.rescue_id AND r.deleted_at IS NULL
      WHERE sm.user_id = $1
        AND sm.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM rescue.staff_members other
           WHERE other.rescue_id = sm.rescue_id
             AND other.user_id <> $1
             AND other.deleted_at IS NULL
        )
      LIMIT 1`,
    [principal.userId]
  );
  if (rows.length > 0) {
    return { allowed: false, blockedReason: 'last_rescue_staff' };
  }
  return { allowed: true, blockedReason: '' };
}
