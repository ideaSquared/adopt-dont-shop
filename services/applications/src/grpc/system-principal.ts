// System principal — the identity service.applications uses for calls it
// originates itself (background jobs), not on behalf of a caller. Carries
// `super_admin` so it passes the callee's permission gate via
// hasPermission's short-circuit, the same as service.notifications'.

import type { Principal } from '@adopt-dont-shop/authz';
import type { UserId } from '@adopt-dont-shop/lib.types';

export const SYSTEM_PRINCIPAL: Principal = {
  userId: 'svc.applications' as UserId,
  roles: ['super_admin'],
  permissions: [],
};
