// gRPC handlers for the admin user-management surface:
// SearchUsers, AdminGetUser, AdminUpdateUser, DeactivateUser,
// ReactivateUser, GetUserStatistics.
//
// These mirror the monolith's /api/v1/users/* admin routes. Each gates
// on the matching admin.users.* permission via @adopt-dont-shop/authz.
// Reuses rowToProtoUser + UserRow + the enum maps from handlers.ts so
// the admin view returns the same User shape GetMe does.

import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';

import {
  AuthV1,
  type AdminCreateUserRequest,
  type AdminCreateUserResponse,
  type AdminGetUserRequest,
  type AdminGetUserResponse,
  type AdminLockAccountRequest,
  type AdminLockAccountResponse,
  type AdminResetPasswordRequest,
  type AdminResetPasswordResponse,
  type AdminUnlockAccountRequest,
  type AdminUnlockAccountResponse,
  type AdminUpdateUserRequest,
  type AdminUpdateUserResponse,
  type BulkUpdateUsersRequest,
  type BulkUpdateUsersResponse,
  type CreateIpRuleRequest,
  type CreateIpRuleResponse,
  type DeactivateUserRequest,
  type DeactivateUserResponse,
  type DeleteIpRuleRequest,
  type DeleteIpRuleResponse,
  type GetUserPermissionsRequest,
  type GetUserPermissionsResponse,
  type GetUserStatisticsRequest,
  type GetUserStatisticsResponse,
  type IpRule,
  type ListIpRulesRequest,
  type ListIpRulesResponse,
  type ReactivateUserRequest,
  type ReactivateUserResponse,
  type ListUserIdsByCohortRequest,
  type ListUserIdsByCohortResponse,
  type SearchUsersRequest,
  type SearchUsersResponse,
} from '@adopt-dont-shop/proto';

import { roleToDb, statusFromDb, statusToDb } from './enum-map.js';
import {
  HandlerError,
  loadPrincipal,
  rowToProtoUser,
  type HandlerDeps,
  type UserRow,
} from './handlers.js';

// --- Permissions -----------------------------------------------------

const ADMIN_USERS_SEARCH: Permission = 'admin.users.search' as Permission;
const ADMIN_USERS_READ: Permission = 'admin.users.read' as Permission;
const ADMIN_USERS_UPDATE: Permission = 'admin.users.update' as Permission;
const ADMIN_USERS_CREATE: Permission = 'admin.users.create' as Permission;
const ADMIN_USERS_DEACTIVATE: Permission = 'admin.users.deactivate' as Permission;
const ADMIN_USERS_REACTIVATE: Permission = 'admin.users.reactivate' as Permission;
const ADMIN_USERS_BULK_UPDATE: Permission = 'admin.users.bulk_update' as Permission;
const ADMIN_SECURITY_MANAGE: Permission = 'admin.security.manage' as Permission;
const ADMIN_SECURITY_READ: Permission = 'admin.security.read' as Permission;

// Columns the admin view selects — same set rowToProtoUser reads.
const USER_SELECT = `
  user_id, email, password, first_name, last_name, email_verified,
  phone_verified, two_factor_enabled, status, user_type,
  profile_image_url, bio, timezone, language, country, city,
  last_login_at, locked_until, login_attempts, created_at, updated_at
`;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Whitelist sort columns — never interpolate caller input into SQL.
const SORT_COLUMNS: Record<string, string> = {
  createdAt: 'created_at',
  created_at: 'created_at',
  lastLoginAt: 'last_login_at',
  last_login_at: 'last_login_at',
  email: 'email',
};

// --- SearchUsers -----------------------------------------------------

export async function searchUsers(
  deps: HandlerDeps,
  principal: Principal,
  req: SearchUsersRequest
): Promise<SearchUsersResponse> {
  if (!hasPermission(principal, ADMIN_USERS_SEARCH)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_SEARCH}' required`);
  }

  const limit = clampLimit(req.limit);
  const page = Math.max(req.page || 1, 1);
  const offset = (page - 1) * limit;

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  if (
    req.statusFilter !== undefined &&
    req.statusFilter !== AuthV1.UserStatus.USER_STATUS_UNSPECIFIED
  ) {
    where.push(`status = $${params.length + 1}`);
    params.push(statusToDb(req.statusFilter));
  }
  if (
    req.userTypeFilter !== undefined &&
    req.userTypeFilter !== AuthV1.UserRole.USER_ROLE_UNSPECIFIED
  ) {
    where.push(`user_type = $${params.length + 1}`);
    params.push(roleToDb(req.userTypeFilter));
  }
  if (req.emailVerified !== undefined) {
    where.push(`email_verified = $${params.length + 1}`);
    params.push(req.emailVerified);
  }
  if (req.createdFrom) {
    where.push(`created_at >= $${params.length + 1}`);
    params.push(req.createdFrom);
  }
  if (req.createdTo) {
    where.push(`created_at <= $${params.length + 1}`);
    params.push(req.createdTo);
  }
  if (req.search) {
    // ILIKE across name + email; escape LIKE wildcards so the search
    // box can't be used for enumeration via % / _.
    const escaped = req.search.replace(/[\\%_]/g, c => `\\${c}`);
    const term = `%${escaped}%`;
    const n = params.length + 1;
    where.push(`(first_name ILIKE $${n} OR last_name ILIKE $${n} OR email ILIKE $${n})`);
    params.push(term);
  }

  const whereClause = where.join(' AND ');

  const countRes = await deps.pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM auth.users WHERE ${whereClause}`,
    params
  );
  const total = Number.parseInt(countRes.rows[0]?.total ?? '0', 10);

  const sortColumn = SORT_COLUMNS[req.sortBy ?? 'createdAt'] ?? 'created_at';
  const sortDir = (req.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const rowsRes = await deps.pool.query<UserRow>(
    `
    SELECT ${USER_SELECT}
    FROM auth.users
    WHERE ${whereClause}
    ORDER BY ${sortColumn} ${sortDir}, user_id ${sortDir}
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    users: rowsRes.rows.map(rowToProtoUser),
    total,
    page,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

function clampLimit(requested: number): number {
  if (!requested) {
    return DEFAULT_LIMIT;
  }
  return Math.min(requested, MAX_LIMIT);
}

// --- AdminGetUser ----------------------------------------------------

export async function adminGetUser(
  deps: HandlerDeps,
  principal: Principal,
  req: AdminGetUserRequest
): Promise<AdminGetUserResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_USERS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_READ}' required`);
  }

  const res = await deps.pool.query<UserRow>(
    `SELECT ${USER_SELECT} FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [req.userId]
  );
  if (res.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `user ${req.userId} not found`);
  }
  return { user: rowToProtoUser(res.rows[0]) };
}

// --- AdminCreateUser -------------------------------------------------

// user_type values an ordinary admin may NOT mint — only a super_admin
// can create another elevated account (privilege-escalation guard).
const ELEVATED_ROLES: ReadonlySet<string> = new Set(['admin', 'moderator', 'super_admin']);

// Invitation tokens are short-lived; the invitee must redeem within a week.
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function adminCreateUser(
  deps: HandlerDeps,
  principal: Principal,
  req: AdminCreateUserRequest
): Promise<AdminCreateUserResponse> {
  if (!req.email || !req.email.includes('@') || req.email.length > 255) {
    throw new HandlerError('INVALID_ARGUMENT', 'email is invalid');
  }
  if (!req.firstName || !req.lastName) {
    throw new HandlerError('INVALID_ARGUMENT', 'first_name and last_name are required');
  }
  if (req.userType === AuthV1.UserRole.USER_ROLE_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_type is required');
  }
  if (!hasPermission(principal, ADMIN_USERS_CREATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_CREATE}' required`);
  }

  const userType = roleToDb(req.userType);
  // hasPermission already short-circuits true for super_admin, so this
  // guard only ever bites a lower-privileged admin trying to mint an
  // elevated account.
  if (ELEVATED_ROLES.has(userType) && !principal.roles.includes('super_admin')) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      'only a super_admin may create admin, moderator, or super_admin accounts'
    );
  }

  // Reject a duplicate up front for a clean error; the unique constraint on
  // email is still the source of truth against a race.
  const existing = await deps.pool.query(
    `SELECT 1 FROM auth.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.email]
  );
  if (existing.rows.length > 0) {
    throw new HandlerError('ALREADY_EXISTS', `a user with email ${req.email} already exists`);
  }

  // Pending users carry no usable credential until they redeem the invite;
  // seed the NOT NULL password column with a random, unguessable hash.
  const placeholderPassword = await deps.passwordHasher.hash(randomBytes(32).toString('base64url'));
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  let createdUser: UserRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const userRes = await client.query<UserRow>(
      `
      INSERT INTO auth.users (
        user_id, email, password, first_name, last_name,
        status, user_type, email_verified, phone_verified,
        two_factor_enabled, login_attempts, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        'pending_verification', $5, false, false,
        false, 0, now(), now()
      )
      RETURNING ${USER_SELECT}
      `,
      [req.email, placeholderPassword, req.firstName, req.lastName, userType]
    );
    createdUser = userRes.rows[0];

    await client.query(
      `
      INSERT INTO auth.user_invitations (
        invitation_id, user_id, token_hash, status, invited_by,
        expires_at, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, 'pending', $3, $4, now(), now())
      `,
      [createdUser.user_id, tokenHash, principal.userId, expiresAt]
    );

    publish({
      type: 'auth.userInvited',
      id: `auth.userInvited.${createdUser.user_id}`,
      payload: {
        userId: createdUser.user_id,
        email: createdUser.email,
        firstName: createdUser.first_name,
        role: userType,
        invitedBy: principal.userId,
        // The raw token travels ONLY on this internal event so the
        // notifications service can build the set-password link. Omitted
        // when the admin opted out of the invitation email.
        token: req.sendInvitation ? token : undefined,
        sendInvitation: req.sendInvitation,
      },
    });
  });

  if (!createdUser) {
    throw new HandlerError('INTERNAL', 'insert returned no rows');
  }
  return { user: rowToProtoUser(createdUser) };
}

// --- AdminUpdateUser -------------------------------------------------

export async function adminUpdateUser(
  deps: HandlerDeps,
  principal: Principal,
  req: AdminUpdateUserRequest
): Promise<AdminUpdateUserResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_USERS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_UPDATE}' required`);
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (req.status !== undefined && req.status !== AuthV1.UserStatus.USER_STATUS_UNSPECIFIED) {
    sets.push(`status = $${params.length + 1}`);
    params.push(statusToDb(req.status));
  }
  if (req.userType !== undefined && req.userType !== AuthV1.UserRole.USER_ROLE_UNSPECIFIED) {
    sets.push(`user_type = $${params.length + 1}`);
    params.push(roleToDb(req.userType));
  }
  if (req.emailVerified !== undefined) {
    sets.push(`email_verified = $${params.length + 1}`);
    params.push(req.emailVerified);
  }
  if (req.firstName !== undefined) {
    sets.push(`first_name = $${params.length + 1}`);
    params.push(req.firstName);
  }
  if (req.lastName !== undefined) {
    sets.push(`last_name = $${params.length + 1}`);
    params.push(req.lastName);
  }

  if (sets.length === 0) {
    // No-op — return the current row.
    return adminGetUser(deps, principal, { userId: req.userId });
  }

  sets.push('updated_at = now()');
  sets.push('version = version + 1');

  let updated: UserRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<UserRow>(
      `
      UPDATE auth.users
      SET ${sets.join(', ')}
      WHERE user_id = $${params.length + 1} AND deleted_at IS NULL
      RETURNING ${USER_SELECT}
      `,
      [...params, req.userId]
    );
    if (res.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `user ${req.userId} not found`);
    }
    updated = res.rows[0];

    publish({
      type: 'auth.userUpdatedByAdmin',
      id: `auth.userUpdatedByAdmin.${req.userId}.${Date.now()}`,
      payload: { userId: req.userId, updatedBy: principal.userId },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'update returned no rows');
  }
  return { user: rowToProtoUser(updated) };
}

// --- DeactivateUser --------------------------------------------------

export async function deactivateUser(
  deps: HandlerDeps,
  principal: Principal,
  req: DeactivateUserRequest
): Promise<DeactivateUserResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_USERS_DEACTIVATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_DEACTIVATE}' required`);
  }
  if (req.userId === principal.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'cannot deactivate your own account');
  }

  return setStatus(deps, principal, req.userId, 'deactivated', req.reason ?? null);
}

// --- ReactivateUser --------------------------------------------------

export async function reactivateUser(
  deps: HandlerDeps,
  principal: Principal,
  req: ReactivateUserRequest
): Promise<ReactivateUserResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_USERS_REACTIVATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_REACTIVATE}' required`);
  }
  return setStatus(deps, principal, req.userId, 'active', null);
}

async function setStatus(
  deps: HandlerDeps,
  principal: Principal,
  userId: string,
  status: 'active' | 'deactivated',
  reason: string | null
): Promise<{ user: ReturnType<typeof rowToProtoUser> }> {
  // Read current to support idempotency + NOT_FOUND.
  const current = await deps.pool.query<UserRow>(
    `SELECT ${USER_SELECT} FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (current.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `user ${userId} not found`);
  }
  // Idempotent — already in the target state.
  if (current.rows[0].status === status) {
    return { user: rowToProtoUser(current.rows[0]) };
  }

  let updated: UserRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<UserRow>(
      `
      UPDATE auth.users
      SET status = $1, updated_at = now(), version = version + 1
      WHERE user_id = $2 AND deleted_at IS NULL
      RETURNING ${USER_SELECT}
      `,
      [status, userId]
    );
    updated = res.rows[0];

    publish({
      type: status === 'deactivated' ? 'auth.userDeactivated' : 'auth.userReactivated',
      id: `auth.user${status === 'deactivated' ? 'Deactivated' : 'Reactivated'}.${userId}.${Date.now()}`,
      payload: { userId, actedBy: principal.userId, reason },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'status update returned no rows');
  }
  return { user: rowToProtoUser(updated) };
}

// --- AdminResetPassword ----------------------------------------------

// A URL-safe random string with enough entropy to be a one-time password.
// 18 bytes → 24 base64url chars; communicated out-of-band and changed by
// the user on next sign-in.
function generateTemporaryPassword(): string {
  return randomBytes(18).toString('base64url');
}

export async function adminResetPassword(
  deps: HandlerDeps,
  principal: Principal,
  req: AdminResetPasswordRequest
): Promise<AdminResetPasswordResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_USERS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_UPDATE}' required`);
  }
  if (req.userId === principal.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'cannot reset your own password via the admin path');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await deps.passwordHasher.hash(temporaryPassword);

  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<{ user_id: string }>(
      `
      UPDATE auth.users
      SET password = $1, login_attempts = 0, locked_until = NULL,
          updated_at = now(), version = version + 1
      WHERE user_id = $2 AND deleted_at IS NULL
      RETURNING user_id
      `,
      [passwordHash, req.userId]
    );
    if (res.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `user ${req.userId} not found`);
    }

    // Revoke active refresh tokens so existing sessions can't continue
    // under the old credentials.
    await client.query(
      `
      UPDATE auth.refresh_tokens
      SET revoked_at = now(), is_revoked = true, updated_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [req.userId]
    );

    publish({
      type: 'auth.passwordResetByAdmin',
      id: `auth.passwordResetByAdmin.${req.userId}.${Date.now()}`,
      payload: { userId: req.userId, resetBy: principal.userId },
    });
  });

  return { temporaryPassword };
}

// --- AdminLockAccount / AdminUnlockAccount ----------------------------
// Manual lockout control for the Security Center. Reuses the same
// locked_until column the login soft-lock backoff writes — a far-future
// timestamp blocks Login regardless of password correctness (see
// handlers.ts login()), and clearing it (+ resetting login_attempts)
// undoes either a manual or soft-lock.

const FORCE_LOCK_DURATION = '100 years';

export async function adminLockAccount(
  deps: HandlerDeps,
  principal: Principal,
  req: AdminLockAccountRequest
): Promise<AdminLockAccountResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }
  if (req.userId === principal.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'cannot lock your own account');
  }

  let updated: UserRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<UserRow>(
      `
      UPDATE auth.users
      SET locked_until = now() + interval '${FORCE_LOCK_DURATION}', updated_at = now()
      WHERE user_id = $1 AND deleted_at IS NULL
      RETURNING ${USER_SELECT}
      `,
      [req.userId]
    );
    if (res.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `user ${req.userId} not found`);
    }
    updated = res.rows[0];

    publish({
      type: 'auth.accountLockedByAdmin',
      id: `auth.accountLockedByAdmin.${req.userId}.${Date.now()}`,
      payload: { userId: req.userId, lockedBy: principal.userId, reason: req.reason ?? null },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'lock update returned no rows');
  }
  return { user: rowToProtoUser(updated) };
}

export async function adminUnlockAccount(
  deps: HandlerDeps,
  principal: Principal,
  req: AdminUnlockAccountRequest
): Promise<AdminUnlockAccountResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  const current = await deps.pool.query<{ locked_until: Date | null }>(
    `SELECT locked_until FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [req.userId]
  );
  if (current.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `user ${req.userId} not found`);
  }
  const wasLocked = Boolean(
    current.rows[0].locked_until && current.rows[0].locked_until > new Date()
  );
  if (!wasLocked) {
    return { wasLocked: false };
  }

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(
      `UPDATE auth.users
       SET locked_until = NULL, login_attempts = 0, updated_at = now()
       WHERE user_id = $1`,
      [req.userId]
    );

    publish({
      type: 'auth.accountUnlockedByAdmin',
      id: `auth.accountUnlockedByAdmin.${req.userId}.${Date.now()}`,
      payload: { userId: req.userId, unlockedBy: principal.userId },
    });
  });

  return { wasLocked: true };
}

// --- IP allow/block rules ---------------------------------------------
// Admin CRUD over auth.ip_rules. Evaluation (the gateway actually
// enforcing these against the connecting IP) is not wired yet — this is
// storage + the Security Center's management surface only.

type IpRuleRow = {
  ip_rule_id: string;
  type: 'allow' | 'block';
  cidr: string;
  label: string | null;
  is_active: boolean;
  expires_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

function ipRuleTypeToDb(type: AuthV1.IpRuleType): 'allow' | 'block' {
  if (type === AuthV1.IpRuleType.IP_RULE_TYPE_ALLOW) {
    return 'allow';
  }
  if (type === AuthV1.IpRuleType.IP_RULE_TYPE_BLOCK) {
    return 'block';
  }
  throw new HandlerError('INVALID_ARGUMENT', 'type is required');
}

function ipRuleTypeFromDb(type: 'allow' | 'block'): AuthV1.IpRuleType {
  return type === 'allow'
    ? AuthV1.IpRuleType.IP_RULE_TYPE_ALLOW
    : AuthV1.IpRuleType.IP_RULE_TYPE_BLOCK;
}

function rowToProtoIpRule(row: IpRuleRow): IpRule {
  return {
    ipRuleId: row.ip_rule_id,
    type: ipRuleTypeFromDb(row.type),
    cidr: row.cidr,
    label: row.label ?? undefined,
    isActive: row.is_active,
    expiresAt: row.expires_at?.toISOString(),
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// Loose IPv4/IPv6 CIDR shape check — just enough to reject obvious
// garbage before it lands in the table; not a full RFC validator.
const CIDR_PATTERN = /^([0-9a-fA-F:.]+)\/(\d{1,3})$/;

export async function listIpRules(
  deps: HandlerDeps,
  principal: Principal,
  _req: ListIpRulesRequest
): Promise<ListIpRulesResponse> {
  if (!hasPermission(principal, ADMIN_SECURITY_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_READ}' required`);
  }

  const res = await deps.pool.query<IpRuleRow>(
    `SELECT * FROM auth.ip_rules ORDER BY created_at DESC`
  );
  return { rules: res.rows.map(rowToProtoIpRule) };
}

export async function createIpRule(
  deps: HandlerDeps,
  principal: Principal,
  req: CreateIpRuleRequest
): Promise<CreateIpRuleResponse> {
  if (!hasPermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }
  if (!req.cidr || !CIDR_PATTERN.test(req.cidr)) {
    throw new HandlerError('INVALID_ARGUMENT', 'cidr must be a valid CIDR block');
  }
  const type = ipRuleTypeToDb(req.type);

  let created: IpRuleRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<IpRuleRow>(
      `
      INSERT INTO auth.ip_rules (type, cidr, label, expires_at, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, now(), now())
      RETURNING *
      `,
      [type, req.cidr, req.label ?? null, req.expiresAt ?? null, principal.userId]
    );
    created = res.rows[0];

    publish({
      type: 'auth.ipRuleCreated',
      id: `auth.ipRuleCreated.${created.ip_rule_id}`,
      payload: { ipRuleId: created.ip_rule_id, type, cidr: req.cidr, createdBy: principal.userId },
    });
  });

  if (!created) {
    throw new HandlerError('INTERNAL', 'insert returned no rows');
  }
  return { rule: rowToProtoIpRule(created) };
}

export async function deleteIpRule(
  deps: HandlerDeps,
  principal: Principal,
  req: DeleteIpRuleRequest
): Promise<DeleteIpRuleResponse> {
  if (!req.ipRuleId) {
    throw new HandlerError('INVALID_ARGUMENT', 'ip_rule_id is required');
  }
  if (!hasPermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_SECURITY_MANAGE}' required`);
  }

  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query(`DELETE FROM auth.ip_rules WHERE ip_rule_id = $1`, [
      req.ipRuleId,
    ]);
    if (res.rowCount === 0) {
      throw new HandlerError('NOT_FOUND', `ip rule ${req.ipRuleId} not found`);
    }

    publish({
      type: 'auth.ipRuleDeleted',
      id: `auth.ipRuleDeleted.${req.ipRuleId}.${randomUUID()}`,
      payload: { ipRuleId: req.ipRuleId, deletedBy: principal.userId },
    });
  });

  return {};
}

// --- GetUserStatistics -----------------------------------------------

export async function getUserStatistics(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetUserStatisticsRequest
): Promise<GetUserStatisticsResponse> {
  if (!hasPermission(principal, ADMIN_USERS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_READ}' required`);
  }

  const [totals, byStatus, byType] = await Promise.all([
    deps.pool.query<{ total: string; verified: string; new_this_month: string }>(
      `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE email_verified)::text AS verified,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')::text AS new_this_month
      FROM auth.users
      WHERE deleted_at IS NULL
      `
    ),
    deps.pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM auth.users
       WHERE deleted_at IS NULL GROUP BY status`
    ),
    deps.pool.query<{ user_type: string; count: string }>(
      `SELECT user_type, COUNT(*)::text AS count FROM auth.users
       WHERE deleted_at IS NULL GROUP BY user_type`
    ),
  ]);

  const t = totals.rows[0];
  return {
    total: Number.parseInt(t?.total ?? '0', 10),
    verified: Number.parseInt(t?.verified ?? '0', 10),
    newThisMonth: Number.parseInt(t?.new_this_month ?? '0', 10),
    byStatus: byStatus.rows.map(r => ({
      status: statusFromDb(r.status),
      count: Number.parseInt(r.count, 10),
    })),
    byType: byType.rows.map(r => ({
      userType: AuthV1.userRoleFromJSON(`USER_ROLE_${r.user_type.toUpperCase()}`),
      count: Number.parseInt(r.count, 10),
    })),
  };
}

// --- GetUserPermissions ----------------------------------------------

export async function getUserPermissions(
  deps: HandlerDeps,
  principal: Principal,
  req: GetUserPermissionsRequest
): Promise<GetUserPermissionsResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_USERS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_READ}' required`);
  }
  // loadPrincipal throws NOT_FOUND for a missing user; reuse its
  // role + permission aggregation so this RPC stays consistent with
  // what ValidateToken / GetMe surface.
  const { permissions } = await loadPrincipal(deps, req.userId);
  return { permissions: permissions as string[] };
}

// --- BulkUpdateUsers -------------------------------------------------

export async function bulkUpdateUsers(
  deps: HandlerDeps,
  principal: Principal,
  req: BulkUpdateUsersRequest
): Promise<BulkUpdateUsersResponse> {
  if (!hasPermission(principal, ADMIN_USERS_BULK_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_BULK_UPDATE}' required`);
  }
  if (!req.userIds || req.userIds.length === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_ids must be non-empty');
  }

  const setStatus =
    req.status !== undefined && req.status !== AuthV1.UserStatus.USER_STATUS_UNSPECIFIED;
  const setType =
    req.userType !== undefined && req.userType !== AuthV1.UserRole.USER_ROLE_UNSPECIFIED;
  if (!setStatus && !setType) {
    throw new HandlerError('INVALID_ARGUMENT', 'status or user_type is required');
  }

  // Belt-and-braces protections mirroring the monolith bulkUpdateUsers:
  //  - cannot change your own user_type via the bulk path
  //  - only super_admin can grant super_admin
  if (setType) {
    if (req.userIds.includes(principal.userId as string)) {
      throw new HandlerError('PERMISSION_DENIED', 'cannot change your own role via bulk update');
    }
    if (
      req.userType === AuthV1.UserRole.USER_ROLE_SUPER_ADMIN &&
      !principal.roles.includes('super_admin')
    ) {
      throw new HandlerError('PERMISSION_DENIED', 'only super_admin can assign super_admin');
    }
  }

  const sets: string[] = [];
  const baseParams: unknown[] = [];
  if (setStatus) {
    sets.push(`status = $${baseParams.length + 1}`);
    baseParams.push(statusToDb(req.status));
  }
  if (setType) {
    sets.push(`user_type = $${baseParams.length + 1}`);
    baseParams.push(roleToDb(req.userType));
  }
  sets.push('updated_at = now()');
  sets.push('version = version + 1');

  // Per-id so one failure (missing row) doesn't abort the batch — the
  // admin UI gets per-id results to retry. Each runs in its own
  // transaction with the publish riding along after commit.
  const results: BulkUpdateUsersResponse['results'] = [];
  for (const userId of req.userIds) {
    try {
      await withTransaction(deps, async ({ client, publish }) => {
        const res = await client.query<{ user_id: string }>(
          `
          UPDATE auth.users
          SET ${sets.join(', ')}
          WHERE user_id = $${baseParams.length + 1} AND deleted_at IS NULL
          RETURNING user_id
          `,
          [...baseParams, userId]
        );
        if (res.rows.length === 0) {
          throw new HandlerError('NOT_FOUND', 'user not found');
        }
        publish({
          type: 'auth.userUpdatedByAdmin',
          id: `auth.userUpdatedByAdmin.${userId}.${Date.now()}`,
          payload: { userId, updatedBy: principal.userId, bulk: true, reason: req.reason ?? null },
        });
      });
      results.push({ userId, success: true });
    } catch (err) {
      results.push({
        userId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const failedCount = results.filter(r => !r.success).length;
  return {
    successCount: results.length - failedCount,
    failedCount,
    results,
  };
}

// --- ListUserIdsByCohort ---------------------------------------------

const ADMIN_USERS_BROADCAST: Permission = 'admin.users.broadcast' as Permission;

export async function listUserIdsByCohort(
  deps: HandlerDeps,
  principal: Principal,
  req: ListUserIdsByCohortRequest
): Promise<ListUserIdsByCohortResponse> {
  if (!hasPermission(principal, ADMIN_USERS_BROADCAST)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_USERS_BROADCAST}' required`);
  }

  const limit = clampLimit(req.limit);
  const page = Math.max(req.page || 1, 1);
  const offset = (page - 1) * limit;

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  // user_types filter — empty list means any.
  const types = (req.userTypes ?? []).filter(t => t !== AuthV1.UserRole.USER_ROLE_UNSPECIFIED);
  if (types.length > 0) {
    const placeholders = types.map((_, i) => `$${params.length + 1 + i}`).join(', ');
    where.push(`user_type IN (${placeholders})`);
    for (const t of types) {
      params.push(roleToDb(t));
    }
  }

  // statuses filter — empty list means active-only (safe default).
  const statuses = (req.statuses ?? []).filter(
    s => s !== AuthV1.UserStatus.USER_STATUS_UNSPECIFIED
  );
  if (statuses.length > 0) {
    const placeholders = statuses.map((_, i) => `$${params.length + 1 + i}`).join(', ');
    where.push(`status IN (${placeholders})`);
    for (const s of statuses) {
      params.push(statusToDb(s));
    }
  } else {
    where.push(`status = 'active'`);
  }

  if (req.emailVerified !== undefined) {
    where.push(`email_verified = $${params.length + 1}`);
    params.push(req.emailVerified);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countRes = await deps.pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM auth.users ${whereSql}`,
    params
  );
  const total = Number.parseInt(countRes.rows[0]?.total ?? '0', 10);

  const result = await deps.pool.query<{ user_id: string }>(
    `SELECT user_id FROM auth.users ${whereSql}
       ORDER BY created_at ASC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    userIds: result.rows.map(r => r.user_id),
    total,
    page,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}
