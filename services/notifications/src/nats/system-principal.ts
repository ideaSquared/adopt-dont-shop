// System principal — the identity service.notifications uses when it
// originates a Create call internally (e.g. translating a domain event
// from another service into a user-facing notification). Carries the
// `super_admin` role so it bypasses the permission gate via
// hasPermission's short-circuit.
//
// CAD parallel: every service that consumes events maintains an
// equivalent "x.system" principal for the same reason — events are
// trusted because the bus delivers them, not because a caller
// authenticated.

import type { Principal } from '@adopt-dont-shop/authz';
import type { UserId } from '@adopt-dont-shop/lib.types';

export const SYSTEM_PRINCIPAL: Principal = {
  userId: 'svc.notifications' as UserId,
  roles: ['super_admin'],
  permissions: [],
};
