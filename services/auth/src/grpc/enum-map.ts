// Mappers between the Postgres ENUM string values (`auth.user_type`,
// `auth.user_status`) and the proto enum integers generated under
// `AuthV1`. Same shape as `services/notifications/src/grpc/enum-map.ts`.
//
// The DB-side values are the canonical source of truth — they also
// match `@adopt-dont-shop/lib.types.UserRole` and the frontend's
// PermissionsService — so the maps are one-line switch tables and
// the test file asserts every variant exhaustively.

import { AuthV1 } from '@adopt-dont-shop/proto';

import type { UserRole } from '@adopt-dont-shop/lib.types';

export type UserRoleDb = UserRole;
export type UserStatusDb =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending_verification'
  | 'deactivated';

const ROLE_TO_DB: Record<AuthV1.UserRole, UserRoleDb | null> = {
  [AuthV1.UserRole.USER_ROLE_UNSPECIFIED]: null,
  [AuthV1.UserRole.USER_ROLE_ADOPTER]: 'adopter',
  [AuthV1.UserRole.USER_ROLE_RESCUE_STAFF]: 'rescue_staff',
  [AuthV1.UserRole.USER_ROLE_ADMIN]: 'admin',
  [AuthV1.UserRole.USER_ROLE_MODERATOR]: 'moderator',
  [AuthV1.UserRole.USER_ROLE_SUPER_ADMIN]: 'super_admin',
  [AuthV1.UserRole.USER_ROLE_SUPPORT_AGENT]: 'support_agent',
  [AuthV1.UserRole.UNRECOGNIZED]: null,
};

const DB_TO_ROLE: Record<UserRoleDb, AuthV1.UserRole> = {
  adopter: AuthV1.UserRole.USER_ROLE_ADOPTER,
  rescue_staff: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
  admin: AuthV1.UserRole.USER_ROLE_ADMIN,
  moderator: AuthV1.UserRole.USER_ROLE_MODERATOR,
  super_admin: AuthV1.UserRole.USER_ROLE_SUPER_ADMIN,
  support_agent: AuthV1.UserRole.USER_ROLE_SUPPORT_AGENT,
};

export function roleToDb(proto: AuthV1.UserRole): UserRoleDb {
  const db = ROLE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid UserRole proto value: ${proto}`);
  }
  return db;
}

export function roleFromDb(db: string): AuthV1.UserRole {
  const proto = DB_TO_ROLE[db as UserRoleDb];
  if (!proto) {
    throw new Error(`unknown auth.user_type value: ${db}`);
  }
  return proto;
}

const STATUS_TO_DB: Record<AuthV1.UserStatus, UserStatusDb | null> = {
  [AuthV1.UserStatus.USER_STATUS_UNSPECIFIED]: null,
  [AuthV1.UserStatus.USER_STATUS_ACTIVE]: 'active',
  [AuthV1.UserStatus.USER_STATUS_INACTIVE]: 'inactive',
  [AuthV1.UserStatus.USER_STATUS_SUSPENDED]: 'suspended',
  [AuthV1.UserStatus.USER_STATUS_PENDING_VERIFICATION]: 'pending_verification',
  [AuthV1.UserStatus.USER_STATUS_DEACTIVATED]: 'deactivated',
  [AuthV1.UserStatus.UNRECOGNIZED]: null,
};

const DB_TO_STATUS: Record<UserStatusDb, AuthV1.UserStatus> = {
  active: AuthV1.UserStatus.USER_STATUS_ACTIVE,
  inactive: AuthV1.UserStatus.USER_STATUS_INACTIVE,
  suspended: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
  pending_verification: AuthV1.UserStatus.USER_STATUS_PENDING_VERIFICATION,
  deactivated: AuthV1.UserStatus.USER_STATUS_DEACTIVATED,
};

export function statusToDb(proto: AuthV1.UserStatus): UserStatusDb {
  const db = STATUS_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid UserStatus proto value: ${proto}`);
  }
  return db;
}

export function statusFromDb(db: string): AuthV1.UserStatus {
  const proto = DB_TO_STATUS[db as UserStatusDb];
  if (!proto) {
    throw new Error(`unknown auth.user_status value: ${db}`);
  }
  return proto;
}

// Exported only so the enum-map.test.ts can assert exhaustiveness.
export const ALL_USER_STATUSES: ReadonlyArray<UserStatusDb> = [
  'active',
  'inactive',
  'suspended',
  'pending_verification',
  'deactivated',
];

export const ALL_USER_ROLES_DB: ReadonlyArray<UserRoleDb> = [
  'adopter',
  'rescue_staff',
  'admin',
  'moderator',
  'super_admin',
  'support_agent',
];
