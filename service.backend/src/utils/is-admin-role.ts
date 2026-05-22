import { UserType } from '../models/User';

/**
 * Returns true if the given user role is considered an admin-level role.
 *
 * Both ADMIN and SUPER_ADMIN should pass every check that gates admin-only
 * behaviour. Using `=== UserType.ADMIN` directly excludes SUPER_ADMIN by
 * accident — a correctness bug (denying access, not granting it).
 */
export const isAdminRole = (userType: UserType | string | undefined | null): boolean =>
  userType === UserType.ADMIN || userType === UserType.SUPER_ADMIN;
