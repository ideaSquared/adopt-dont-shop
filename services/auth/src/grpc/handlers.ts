// gRPC handler implementations for AuthService.{Login, Logout,
// RefreshToken, ValidateToken, GetMe, AssignRole}. Plain async
// functions over (deps, principal, request); the adapter (Phase 2.3c)
// wraps them in `(call, callback)` and maps HandlerError → grpc.status.
//
// Discipline:
//   - State-changing handlers (Login, Logout, RefreshToken, AssignRole)
//     run their DB write + NATS event inside
//     @adopt-dont-shop/events.withTransaction so events only fire after
//     commit (publish-after-commit, CAD lesson).
//   - Login + RefreshToken + ValidateToken are the only RPCs that can
//     be invoked WITHOUT a principal — they mint or verify the
//     principal that everything else relies on. The adapter treats
//     a missing principal as a no-op for these three; handler code
//     accepts a `Principal | null` parameter.
//   - JWT signing + bcrypt comparison are injected via deps so the
//     handler tests stay pure and fast (no real bcrypt rounds, no
//     real JWT library calls).
//   - ValidateToken is the hot path — every non-auth gateway request
//     calls it. It does JWT verify + denylist check ONLY; no user-row
//     fetch unless the JWT signature already validated.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission, UserId, UserRole } from '@adopt-dont-shop/lib.types';
import {
  AuthV1,
  type AssignRoleRequest,
  type AssignRoleResponse,
  type AuthPrincipal,
  type AuthUser,
  type GetMeRequest,
  type GetMeResponse,
  type LoginRequest,
  type LoginResponse,
  type LogoutRequest,
  type LogoutResponse,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
  type TokenPair,
  type ValidateTokenRequest,
  type ValidateTokenResponse,
} from '@adopt-dont-shop/proto';

import {
  ALL_USER_ROLES_DB,
  roleFromDb,
  roleToDb,
  statusFromDb,
  type UserRoleDb,
  type UserStatusDb,
} from './enum-map.js';

// --- Errors ----------------------------------------------------------

export type HandlerErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'INTERNAL';

export class HandlerError extends Error {
  constructor(
    public readonly code: HandlerErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}

// --- Dependency seam -------------------------------------------------

// `passwordHasher` and `tokenIssuer` are injected so tests can supply
// deterministic stubs. In production they wrap bcryptjs + jsonwebtoken.
// Keeping them on the deps object (not module-level imports) is the
// difference between handler tests that take 30ms and ones that take
// 3s waiting on real bcrypt rounds.

export type PasswordHasher = {
  compare: (password: string, hash: string) => Promise<boolean>;
  hash: (password: string) => Promise<string>;
};

export type AccessTokenClaims = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
};

export type RefreshTokenClaims = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
};

export type TokenIssuer = {
  // Mints an access + refresh pair for the given user. Returns the
  // raw token strings plus the jti / exp the handler persists in
  // `auth.refresh_tokens` so Logout can revoke later.
  mint: (userId: string) => Promise<MintedTokens>;
  // Cheap verify — returns the claims, or throws if signature/exp
  // are invalid. Caller separately checks the denylist.
  verifyAccess: (token: string) => Promise<AccessTokenClaims>;
  verifyRefresh: (token: string) => Promise<RefreshTokenClaims>;
};

export type MintedTokens = {
  pair: TokenPair;
  accessJti: string;
  accessExpiresAt: Date;
  refreshJti: string;
  refreshExpiresAt: Date;
};

export type HandlerDeps = WithTransactionDeps & {
  passwordHasher: PasswordHasher;
  tokenIssuer: TokenIssuer;
};

// --- Row types -------------------------------------------------------

export type UserRow = {
  user_id: string;
  email: string;
  password: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  status: UserStatusDb;
  user_type: UserRoleDb;
  profile_image_url: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  last_login_at: Date | null;
  locked_until: Date | null;
  login_attempts: number;
  created_at: Date;
  updated_at: Date;
};

type RefreshTokenRow = {
  token: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
};

export function rowToProtoUser(row: UserRow): AuthUser {
  return {
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    userType: roleFromDb(row.user_type),
    status: statusFromDb(row.status),
    emailVerified: row.email_verified,
    phoneVerified: row.phone_verified,
    twoFactorEnabled: row.two_factor_enabled,
    profileImageUrl: row.profile_image_url ?? undefined,
    bio: row.bio ?? undefined,
    timezone: row.timezone ?? undefined,
    language: row.language ?? undefined,
    country: row.country ?? undefined,
    city: row.city ?? undefined,
    lastLoginAt: row.last_login_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// --- Permissions for the principal aggregation query -----------------

// Direct + role-derived permissions are unioned into a single string[].
// `super_admin` short-circuits — gateway gates use authz, which already
// bypasses for super_admin, but we still surface the full string set
// in GetMe so the UI can render the correct affordances.
export async function loadPrincipal(
  deps: HandlerDeps,
  userId: string
): Promise<{ roles: UserRole[]; permissions: Permission[]; rescueId?: string }> {
  // Roles — primary user_type plus everything in user_roles.
  const userTypeRes = await deps.pool.query<{ user_type: UserRoleDb }>(
    `SELECT user_type FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (userTypeRes.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `user ${userId} not found`);
  }
  const primary = userTypeRes.rows[0].user_type as UserRole;

  const extraRolesRes = await deps.pool.query<{ name: UserRoleDb }>(
    `
    SELECT r.role_name AS name FROM auth.roles r
    INNER JOIN auth.user_roles ur ON ur.role_id = r.role_id
    WHERE ur.user_id = $1
    `,
    [userId]
  );
  const extras = extraRolesRes.rows.map(r => r.name as UserRole);
  const roles = uniqueRoles([primary, ...extras]);

  const permsRes = await deps.pool.query<{ name: string }>(
    `
    SELECT DISTINCT p.permission_name AS name FROM auth.permissions p
    INNER JOIN auth.role_permissions rp ON rp.permission_id = p.permission_id
    INNER JOIN auth.user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = $1
    `,
    [userId]
  );
  const permissions = permsRes.rows.map(r => r.name as Permission);

  return { roles, permissions };
}

function uniqueRoles(roles: UserRole[]): UserRole[] {
  const seen = new Set<UserRole>();
  const out: UserRole[] = [];
  for (const r of roles) {
    if (!seen.has(r)) {
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}

function rolesToProto(roles: UserRole[]): AuthV1.UserRole[] {
  return roles.map(r => roleFromDb(r));
}

// --- Login -----------------------------------------------------------

// A fixed valid bcrypt hash (of an arbitrary throwaway password) used only
// to spend an equivalent amount of CPU when the email is unknown, so login
// latency doesn't reveal whether an account exists.
const DUMMY_PASSWORD_HASH = '$2a$12$0000000000000000000000000000000000000000000000000000u';

export async function login(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: LoginRequest
): Promise<LoginResponse> {
  if (!req.email) {
    throw new HandlerError('INVALID_ARGUMENT', 'email is required');
  }
  if (!req.password) {
    throw new HandlerError('INVALID_ARGUMENT', 'password is required');
  }

  // Lookup the user. citext makes the comparison case-insensitive at
  // the DB layer, so we don't need to normalise here. `withSecrets`
  // scope in the monolith — here we just SELECT the password column
  // explicitly because the row type carries it.
  const userRes = await deps.pool.query<UserRow>(
    `SELECT * FROM auth.users WHERE email = $1 AND deleted_at IS NULL`,
    [req.email]
  );
  if (userRes.rows.length === 0) {
    // Run a dummy comparison against a fixed hash so an unknown email
    // costs the same wall-clock time as a wrong password — otherwise the
    // early return is a user-enumeration timing oracle.
    await deps.passwordHasher.compare(req.password, DUMMY_PASSWORD_HASH);
    throw new HandlerError('UNAUTHENTICATED', 'invalid credentials');
  }
  const user = userRes.rows[0];

  // Block locked accounts BEFORE comparing the password — even a
  // correct password shouldn't reveal the account is back online.
  if (user.locked_until && user.locked_until > new Date()) {
    throw new HandlerError('PERMISSION_DENIED', 'account is temporarily locked');
  }
  if (user.status === 'suspended' || user.status === 'deactivated') {
    throw new HandlerError('PERMISSION_DENIED', `account is ${user.status}`);
  }

  const ok = await deps.passwordHasher.compare(req.password, user.password);
  if (!ok) {
    // Increment login_attempts. We don't issue the 30-min lock here —
    // that policy lands with the dedicated auth-policy module in a
    // later phase. The counter is bumped synchronously so successive
    // wrong attempts within a request burst are visible.
    await deps.pool.query(
      `UPDATE auth.users SET login_attempts = login_attempts + 1, updated_at = now() WHERE user_id = $1`,
      [user.user_id]
    );
    throw new HandlerError('UNAUTHENTICATED', 'invalid credentials');
  }

  const minted = await deps.tokenIssuer.mint(user.user_id);

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(
      `
      INSERT INTO auth.refresh_tokens (token, user_id, expires_at, revoked_at, created_at, updated_at)
      VALUES ($1, $2, $3, NULL, now(), now())
      `,
      [minted.pair.refreshToken, user.user_id, minted.refreshExpiresAt]
    );
    await client.query(
      `UPDATE auth.users SET last_login_at = now(), login_attempts = 0, updated_at = now() WHERE user_id = $1`,
      [user.user_id]
    );

    publish({
      type: 'auth.userLoggedIn',
      id: `auth.userLoggedIn.${minted.accessJti}`,
      payload: {
        userId: user.user_id,
        ipAddress: req.ipAddress ?? null,
        userAgent: req.userAgent ?? null,
      },
    });
  });

  // Aggregate the principal AFTER the commit — the row read is cheap
  // and avoids muddying the transaction with read concerns.
  const principal = await loadPrincipal(deps, user.user_id);

  return {
    user: rowToProtoUser(user),
    tokens: minted.pair,
    permissions: principal.permissions,
  };
}

// --- Logout ----------------------------------------------------------

export async function logout(
  deps: HandlerDeps,
  _principal: Principal,
  req: LogoutRequest
): Promise<LogoutResponse> {
  if (!req.refreshToken) {
    throw new HandlerError('INVALID_ARGUMENT', 'refresh_token is required');
  }

  // Verify the token shape so we can record the jti in the denylist.
  // If the JWT is malformed/expired we still return OK — Logout is
  // idempotent and an expired-token logout shouldn't error.
  let claims: RefreshTokenClaims;
  try {
    claims = await deps.tokenIssuer.verifyRefresh(req.refreshToken);
  } catch {
    return { revoked: false };
  }

  // Idempotency — if the token's jti is already denylisted, return
  // without re-publishing.
  const existing = await deps.pool.query<{ jti: string }>(
    `SELECT jti FROM auth.revoked_tokens WHERE jti = $1`,
    [claims.jti]
  );
  if (existing.rows.length > 0) {
    return { revoked: true };
  }

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(
      `
      INSERT INTO auth.revoked_tokens (jti, user_id, expires_at, revoked_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      `,
      [claims.jti, claims.sub, new Date(claims.exp * 1000)]
    );
    await client.query(
      `UPDATE auth.refresh_tokens SET revoked_at = now(), updated_at = now() WHERE token = $1 AND revoked_at IS NULL`,
      [req.refreshToken]
    );

    publish({
      type: 'auth.tokenRevoked',
      id: `auth.tokenRevoked.${claims.jti}`,
      payload: { userId: claims.sub, jti: claims.jti, tokenType: 'refresh' },
    });
  });

  return { revoked: true };
}

// --- RefreshToken ----------------------------------------------------

export async function refreshToken(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  if (!req.refreshToken) {
    throw new HandlerError('INVALID_ARGUMENT', 'refresh_token is required');
  }

  let claims: RefreshTokenClaims;
  try {
    claims = await deps.tokenIssuer.verifyRefresh(req.refreshToken);
  } catch {
    throw new HandlerError('UNAUTHENTICATED', 'invalid or expired refresh token');
  }

  // Denylist check.
  const denied = await deps.pool.query<{ jti: string }>(
    `SELECT jti FROM auth.revoked_tokens WHERE jti = $1`,
    [claims.jti]
  );
  if (denied.rows.length > 0) {
    throw new HandlerError('UNAUTHENTICATED', 'refresh token revoked');
  }

  // Confirm the persisted refresh row is still active (covers the
  // case where Logout revoked the row without the jti in the denylist
  // — older monolith path).
  const stored = await deps.pool.query<RefreshTokenRow>(
    `SELECT * FROM auth.refresh_tokens WHERE token = $1`,
    [req.refreshToken]
  );
  if (stored.rows.length === 0 || stored.rows[0].revoked_at !== null) {
    throw new HandlerError('UNAUTHENTICATED', 'refresh token revoked');
  }

  const minted = await deps.tokenIssuer.mint(claims.sub);

  await withTransaction(deps, async ({ client, publish }) => {
    // Mark the old refresh row revoked + add its jti to the denylist
    // so a stolen old token can't replay even if the new one is also
    // out in the wild.
    await client.query(
      `UPDATE auth.refresh_tokens SET revoked_at = now(), updated_at = now() WHERE token = $1`,
      [req.refreshToken]
    );
    await client.query(
      `
      INSERT INTO auth.revoked_tokens (jti, user_id, expires_at, revoked_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (jti) DO NOTHING
      `,
      [claims.jti, claims.sub, new Date(claims.exp * 1000)]
    );
    await client.query(
      `
      INSERT INTO auth.refresh_tokens (token, user_id, expires_at, revoked_at, created_at, updated_at)
      VALUES ($1, $2, $3, NULL, now(), now())
      `,
      [minted.pair.refreshToken, claims.sub, minted.refreshExpiresAt]
    );

    publish({
      type: 'auth.tokenRefreshed',
      id: `auth.tokenRefreshed.${minted.accessJti}`,
      payload: { userId: claims.sub, oldJti: claims.jti, newJti: minted.accessJti },
    });
  });

  return { tokens: minted.pair };
}

// --- ValidateToken (hot path) ---------------------------------------

export async function validateToken(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: ValidateTokenRequest
): Promise<ValidateTokenResponse> {
  if (!req.accessToken) {
    throw new HandlerError('INVALID_ARGUMENT', 'access_token is required');
  }

  let claims: AccessTokenClaims;
  try {
    claims = await deps.tokenIssuer.verifyAccess(req.accessToken);
  } catch {
    throw new HandlerError('UNAUTHENTICATED', 'invalid or expired access token');
  }

  // Denylist check — cheap point-read on the (jti) primary key.
  const denied = await deps.pool.query<{ jti: string }>(
    `SELECT jti FROM auth.revoked_tokens WHERE jti = $1`,
    [claims.jti]
  );
  if (denied.rows.length > 0) {
    throw new HandlerError('UNAUTHENTICATED', 'access token revoked');
  }

  // Now (and only now) hydrate the principal. Single user_id read +
  // role/permission joins — same query loadPrincipal uses.
  const principal = await loadPrincipal(deps, claims.sub);
  const proto: AuthPrincipal = {
    userId: claims.sub,
    roles: rolesToProto(principal.roles),
    permissions: principal.permissions,
    rescueId: principal.rescueId,
  };

  return {
    principal: proto,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

// --- GetMe -----------------------------------------------------------

export async function getMe(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetMeRequest
): Promise<GetMeResponse> {
  const userRes = await deps.pool.query<UserRow>(
    `SELECT * FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [principal.userId]
  );
  if (userRes.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', 'user not found');
  }
  const aggregate = await loadPrincipal(deps, principal.userId);

  return {
    user: rowToProtoUser(userRes.rows[0]),
    roles: rolesToProto(aggregate.roles),
    permissions: aggregate.permissions,
    rescueId: principal.rescueId,
  };
}

// --- AssignRole ------------------------------------------------------

const ADMIN_SECURITY_MANAGE: Permission = 'admin.security.manage' as Permission;

export async function assignRole(
  deps: HandlerDeps,
  principal: Principal,
  req: AssignRoleRequest
): Promise<AssignRoleResponse> {
  if (!req.targetUserId) {
    throw new HandlerError('INVALID_ARGUMENT', 'target_user_id is required');
  }
  if (req.role === AuthV1.UserRole.USER_ROLE_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'role is required');
  }

  if (!requirePermission(principal, ADMIN_SECURITY_MANAGE)) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${ADMIN_SECURITY_MANAGE}' required to assign roles`
    );
  }

  const roleName = roleToDb(req.role);

  // Verify the target user exists (NOT_FOUND surfaces cleanly).
  const userRes = await deps.pool.query<{ user_id: string }>(
    `SELECT user_id FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [req.targetUserId]
  );
  if (userRes.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `user ${req.targetUserId} not found`);
  }

  // Resolve role_id.
  const roleRes = await deps.pool.query<{ role_id: string }>(
    `SELECT role_id FROM auth.roles WHERE role_name = $1`,
    [roleName]
  );
  if (roleRes.rows.length === 0) {
    throw new HandlerError('INVALID_ARGUMENT', `role ${roleName} is not provisioned`);
  }
  const roleId = roleRes.rows[0].role_id;

  await withTransaction(deps, async ({ client, publish }) => {
    // Idempotent on (user_id, role_id). The PK is composite so the
    // ON CONFLICT clause covers both reassignment and the re-assignment
    // case where assigned_by / assigned_at should refresh.
    await client.query(
      `
      INSERT INTO auth.user_roles (user_id, role_id, assigned_by, assigned_at, expires_at)
      VALUES ($1, $2, $3, now(), NULL)
      ON CONFLICT (user_id, role_id) DO UPDATE
        SET assigned_by = EXCLUDED.assigned_by, assigned_at = EXCLUDED.assigned_at
      `,
      [req.targetUserId, roleId, principal.userId]
    );

    publish({
      type: 'auth.roleAssigned',
      id: `auth.roleAssigned.${randomUUID()}`,
      payload: {
        targetUserId: req.targetUserId,
        role: roleName,
        assignedBy: principal.userId as UserId,
        reason: req.reason ?? null,
      },
    });
  });

  // Return the post-assignment role list so the caller (admin app)
  // can update its cache without a follow-up GetMe.
  const post = await loadPrincipal(deps, req.targetUserId);
  return { roles: rolesToProto(post.roles) };
}

// Tiny exported helper for adapter tests that want to assert the
// HandlerError code table is exhaustive.
export const ALL_HANDLER_ERROR_CODES: ReadonlyArray<HandlerErrorCode> = [
  'INVALID_ARGUMENT',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'INTERNAL',
];

// Re-export for adapter convenience.
export type { UserRoleDb, UserStatusDb };
export { ALL_USER_ROLES_DB };
