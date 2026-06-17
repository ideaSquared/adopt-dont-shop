// Bridge proto enums → the canonical API strings the SPA expects.
//
// The auth gRPC service returns proto enums (USER_ROLE_*, USER_STATUS_*) for
// a user's userType/status. ts-proto's `toJSON` serialises those as the
// SCREAMING_SNAKE proto constant names ("USER_ROLE_ADOPTER"), but the SPA
// (lib.auth / lib.types) speaks the canonical Postgres ENUM strings
// ("adopter", "active", …) — the same strings this gateway already stamps
// onto its downstream `x-user-roles` header (see middleware/authenticate.ts).
//
// Leaving the SCREAMING names in the body breaks login: app.* checks
// `allowedUserTypes.includes(user.userType)` against the lowercase values, so
// every successful login is mistaken for a wrong-app access and logged out.
// This module is the single chokepoint that keeps the HTTP body consistent
// with the documented SPA contract.

import { AuthV1 } from '@adopt-dont-shop/proto';

const ROLE_TO_API: Record<AuthV1.UserRole, string | undefined> = {
  [AuthV1.UserRole.USER_ROLE_UNSPECIFIED]: undefined,
  [AuthV1.UserRole.USER_ROLE_ADOPTER]: 'adopter',
  [AuthV1.UserRole.USER_ROLE_RESCUE_STAFF]: 'rescue_staff',
  [AuthV1.UserRole.USER_ROLE_ADMIN]: 'admin',
  [AuthV1.UserRole.USER_ROLE_MODERATOR]: 'moderator',
  [AuthV1.UserRole.USER_ROLE_SUPER_ADMIN]: 'super_admin',
  [AuthV1.UserRole.USER_ROLE_SUPPORT_AGENT]: 'support_agent',
  [AuthV1.UserRole.UNRECOGNIZED]: undefined,
};

const STATUS_TO_API: Record<AuthV1.UserStatus, string | undefined> = {
  [AuthV1.UserStatus.USER_STATUS_UNSPECIFIED]: undefined,
  [AuthV1.UserStatus.USER_STATUS_ACTIVE]: 'active',
  [AuthV1.UserStatus.USER_STATUS_INACTIVE]: 'inactive',
  [AuthV1.UserStatus.USER_STATUS_SUSPENDED]: 'suspended',
  [AuthV1.UserStatus.USER_STATUS_PENDING_VERIFICATION]: 'pending_verification',
  [AuthV1.UserStatus.USER_STATUS_DEACTIVATED]: 'deactivated',
  [AuthV1.UserStatus.UNRECOGNIZED]: undefined,
};

/** Map a proto UserRole to the canonical API string, or undefined if unknown. */
export const roleToApi = (role: AuthV1.UserRole): string | undefined => ROLE_TO_API[role];

/**
 * Serialise a proto User to the JSON the SPA expects: identical to
 * `AuthV1.User.toJSON`, but with userType/status mapped from the proto enum
 * names to the canonical DB strings. Falls back to the raw toJSON value if a
 * value is somehow outside the known enum set.
 */
export const userToApiJson = (user: AuthV1.User): Record<string, unknown> => {
  const json = AuthV1.User.toJSON(user) as Record<string, unknown>;
  return {
    ...json,
    userType: ROLE_TO_API[user.userType] ?? json.userType,
    status: STATUS_TO_API[user.status] ?? json.status,
  };
};

/**
 * Replace the `user` field of an already-serialised auth response with the
 * normalised user JSON. No-op when the response carries no user.
 */
export const withApiUser = (
  json: Record<string, unknown>,
  user: AuthV1.User | undefined
): Record<string, unknown> => (user ? { ...json, user: userToApiJson(user) } : json);

/** Map a list of proto roles to canonical API strings, dropping unknowns. */
export const rolesToApi = (roles: readonly AuthV1.UserRole[]): string[] =>
  roles.map(roleToApi).filter((role): role is string => role !== undefined);
