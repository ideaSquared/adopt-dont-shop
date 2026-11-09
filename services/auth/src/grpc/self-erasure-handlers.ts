// Self-service erasure pre-check. The gateway calls this before it publishes
// the GDPR erasure saga for the caller's own account: erasing the last active
// super admin would leave the platform with nobody able to administer it.
// Read-only and self-scoped (principal.userId only), so no permission gate.

import type { Principal } from '@adopt-dont-shop/authz';
import type {
  AuthCheckSelfErasureRequest,
  AuthCheckSelfErasureResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

type SuperAdminProbeRow = {
  caller_is_active_super_admin: boolean;
  other_active_super_admin_exists: boolean;
};

export async function checkSelfErasure(
  deps: HandlerDeps,
  principal: Principal | null,
  _req: AuthCheckSelfErasureRequest
): Promise<AuthCheckSelfErasureResponse> {
  void _req;
  if (!principal) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }

  const { rows } = await deps.pool.query<SuperAdminProbeRow>(
    `SELECT
       EXISTS (
         SELECT 1 FROM auth.users
          WHERE user_id = $1
            AND user_type = 'super_admin' AND status = 'active' AND deleted_at IS NULL
       ) AS caller_is_active_super_admin,
       EXISTS (
         SELECT 1 FROM auth.users
          WHERE user_id <> $1
            AND user_type = 'super_admin' AND status = 'active' AND deleted_at IS NULL
       ) AS other_active_super_admin_exists`,
    [principal.userId]
  );
  const probe = rows[0];
  if (probe?.caller_is_active_super_admin && !probe.other_active_super_admin_exists) {
    return { allowed: false, blockedReason: 'last_super_admin' };
  }
  return { allowed: true, blockedReason: '' };
}
