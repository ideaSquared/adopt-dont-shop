// System principal — the identity service.moderation uses when it
// originates an auto-report from a domain event. Carries the
// `super_admin` role so it bypasses every permission gate via
// hasPermission's short-circuit (matches notifications' SYSTEM_PRINCIPAL).
//
// Domain events are trusted because the bus delivered them, not because
// a caller authenticated — and the FileReport handler is open to any
// authenticated principal anyway. This identity also makes the
// auto-filed reports easy to distinguish from user-filed ones (reporter
// = SYSTEM_USER_ID).

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId, UserRole } from '@adopt-dont-shop/lib.types';

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000' as UserId;

export const SYSTEM_PRINCIPAL: Principal = {
  userId: SYSTEM_USER_ID,
  roles: ['super_admin'] as UserRole[],
  permissions: [] as Permission[],
};
