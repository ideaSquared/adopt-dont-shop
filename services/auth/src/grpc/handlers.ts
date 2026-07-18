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

import { createHash, randomUUID } from 'node:crypto';

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
import { findMatchingBackupCodeHash } from './backup-codes.js';
import { createAuthMetrics } from './auth-metrics.js';
import { verifyAndConsumeTotp } from './totp-verification.js';

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
  // AES-256-GCM key (hex) for encrypting/decrypting TOTP secrets at rest
  // (ADS-914a). See ./totp-crypto.ts and ./totp-verification.ts.
  encryptionKey: string;
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
  two_factor_secret: string | null;
  // Last accepted TOTP RFC 6238 time step (ADS-914c replay guard). Null
  // until the first successful 2FA verification.
  two_factor_last_step: number | null;
  // Bcrypt hashes of the unused backup/recovery codes (ADS-914b). Null (or
  // empty) when 2FA is off or every code has been consumed.
  backup_codes: string[] | null;
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
  token_hash: string;
  user_id: string;
  family_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  is_revoked: boolean;
};

// Refresh tokens are long-lived bearer credentials — only their SHA-256
// hash is persisted (ADS-884). The raw value is still sent to the client
// over TLS as before; only at-rest storage changed.
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
): Promise<{ roles: UserRole[]; permissions: Permission[] }> {
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

  // Permissions are granted to ROLES. A user holds their primary role
  // (`user_type`) plus any extra roles in `user_roles`; union the grants of
  // all of them. Resolving the primary role here (rather than relying on a
  // per-user `user_roles` row) means every user automatically carries their
  // base role's permissions — see migration 016 / ADS-863.
  const permsRes = await deps.pool.query<{ name: string }>(
    `
    SELECT DISTINCT p.permission_name AS name FROM auth.permissions p
    INNER JOIN auth.role_permissions rp ON rp.permission_id = p.permission_id
    WHERE rp.role_id IN (
      SELECT r.role_id FROM auth.roles r
      INNER JOIN auth.users u ON u.user_type::text = r.role_name
      WHERE u.user_id = $1 AND u.deleted_at IS NULL
      UNION
      SELECT ur.role_id FROM auth.user_roles ur WHERE ur.user_id = $1
    )
    `,
    [userId]
  );
  const permissions = permsRes.rows.map(r => r.name as Permission);

  return { roles, permissions };
}

// Reject tokens for users who are no longer permitted to authenticate.
// A token (access or refresh) stays cryptographically valid until it
// expires, so a user suspended/deactivated/deleted mid-session would
// otherwise keep access — and could refresh indefinitely — until the
// token's own expiry. ValidateToken (every gateway request) and
// RefreshToken both gate on this. A single indexed point-read on the PK.
async function assertActiveUser(
  deps: HandlerDeps,
  userId: string,
  // When provided (the access-token path), also enforce the per-user
  // revocation watermark: an access token issued before `tokens_valid_from`
  // is rejected. Omitted on the refresh path, which is gated by row-level
  // refresh-token revocation instead.
  accessIssuedAtSeconds?: number
): Promise<void> {
  const res = await deps.pool.query<{ status: UserStatusDb; tokens_valid_from: Date | null }>(
    `SELECT status, tokens_valid_from FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const row = res.rows[0];
  // Mirror Login's policy exactly: reject suspended/deactivated (and a
  // missing row = deleted). `inactive` / `pending_verification` are NOT
  // blocked here because Login lets them authenticate. We do NOT
  // distinguish cases in the error — the caller only needs "not allowed".
  if (row === undefined || row.status === 'suspended' || row.status === 'deactivated') {
    throw new HandlerError('UNAUTHENTICATED', 'account is not active');
  }
  // Access-token revocation watermark. Compare at second granularity (the
  // JWT `iat` is whole seconds) so a token minted in the same second as a
  // revoke isn't spuriously rejected.
  const validFrom = row.tokens_valid_from;
  if (
    accessIssuedAtSeconds !== undefined &&
    validFrom instanceof Date &&
    accessIssuedAtSeconds < Math.floor(validFrom.getTime() / 1000)
  ) {
    throw new HandlerError('UNAUTHENTICATED', 'access token revoked');
  }
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

// Progressive login throttle. Rather than a hard lockout (which lets an
// attacker deny a victim access by deliberately failing logins), failed
// attempts apply a SHORT, exponentially-growing soft-lock that clears on
// its own. The first LOGIN_LOCK_THRESHOLD attempts only count; from there
// each further failure locks the account for base * 2^(n - threshold)
// seconds, capped at LOGIN_LOCK_MAX_SECONDS. A successful login resets the
// counter and clears the lock. (Edge/IP rate-limiting is layered on top at
// the gateway.)
const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_BASE_SECONDS = 60;
const LOGIN_LOCK_MAX_SECONDS = 900;

// Forensic record of a login attempt, published as `auth.actionTaken` so
// service.audit's wildcard `*.actionTaken` subscriber persists it to
// audit_events — the durable trail the Security Center's login-history
// and suspicious-activity views read. Routed through withTransaction
// (even on branches with no DB write) so every publish in this module
// follows the same publish-after-commit discipline documented at the
// top of this file. `outcome` is 'denied' rather than 'failure' for
// every rejected attempt — none of these are server-side exceptions,
// they're all the system declining the login.
async function publishLoginActionTaken(
  deps: HandlerDeps,
  params: {
    outcome: 'success' | 'denied';
    aggregateId: string;
    actorUserId?: string;
    actorEmailSnapshot?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await withTransaction(deps, async ({ publish }) => {
    publish({
      type: 'auth.actionTaken',
      id: `auth.actionTaken.${randomUUID()}`,
      payload: {
        eventId: randomUUID(),
        service: 'service.auth',
        subject: 'auth.actionTaken',
        aggregateType: 'user',
        aggregateId: params.aggregateId,
        actorUserId: params.actorUserId,
        actorEmailSnapshot: params.actorEmailSnapshot,
        action: 'login',
        outcome: params.outcome,
        occurredAt: new Date().toISOString(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  });
}

// Verifies the second factor supplied on a Login call — either a TOTP code
// or a single-use backup code (ADS-914b). A backup code, when present,
// takes priority (mutually exclusive in practice — see LoginRequest.
// backup_code). Consuming a backup code persists its removal from
// auth.users.backup_codes immediately, same "no I/O in the pure verifier"
// split as totp-verification.ts / backup-codes.ts.
type SecondFactorOutcome = { ok: boolean; backupCodesExhausted: boolean };

async function verifySecondFactor(
  deps: HandlerDeps,
  user: UserRow,
  req: LoginRequest
): Promise<SecondFactorOutcome> {
  if (req.backupCode) {
    const matchedHash = await findMatchingBackupCodeHash(
      deps.passwordHasher,
      user.backup_codes,
      req.backupCode
    );
    if (!matchedHash) {
      return { ok: false, backupCodesExhausted: false };
    }
    // Atomic conditional removal: only removes the hash if it is still present.
    // If a concurrent login consumed the same hash first, rowCount is 0 and we
    // treat it as a failed attempt — the code was already spent (ADS-975).
    const res = await deps.pool.query<{ remaining: string[] }>(
      `UPDATE auth.users
          SET backup_codes = array_remove(backup_codes, $2), updated_at = now()
        WHERE user_id = $1 AND $2 = ANY(backup_codes)
        RETURNING backup_codes AS remaining`,
      [user.user_id, matchedHash]
    );
    if (res.rowCount === 0) {
      return { ok: false, backupCodesExhausted: false };
    }
    return { ok: true, backupCodesExhausted: res.rows[0].remaining.length === 0 };
  }

  const ok = await verifyAndConsumeTotp(
    deps,
    {
      userId: user.user_id,
      encryptedSecret: user.two_factor_secret,
      lastStep: user.two_factor_last_step,
    },
    req.twoFactorToken ?? ''
  );
  return { ok, backupCodesExhausted: false };
}

export async function login(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: LoginRequest
): Promise<LoginResponse> {
  const { loginCounter } = createAuthMetrics();

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
    loginCounter.inc({ outcome: 'invalid_credentials' });
    await publishLoginActionTaken(deps, {
      outcome: 'denied',
      // No real user aggregate exists for an unknown email — mint a
      // fresh id to satisfy audit_events.aggregate_id's NOT NULL
      // constraint. actorEmailSnapshot still records what was tried.
      aggregateId: randomUUID(),
      actorEmailSnapshot: req.email,
      ipAddress: req.ipAddress,
      userAgent: req.userAgent,
    });
    throw new HandlerError('UNAUTHENTICATED', 'invalid credentials');
  }
  const user = userRes.rows[0];

  // Compare the password BEFORE revealing anything about account state
  // (ADS-966) — checking locked/suspended/deactivated first turned those
  // branches into an email-enumeration oracle, since any password (even a
  // wrong one) reached them. A wrong password now falls straight through
  // to the generic invalid-credentials branch below regardless of the
  // account's state.
  const ok = await deps.passwordHasher.compare(req.password, user.password);
  if (!ok) {
    // Count the failure and, once past the threshold, apply a short
    // exponential soft-lock. The lock is computed atomically from the
    // incremented count so a burst of concurrent failures can't race the
    // lock open, and from `login_attempts` (not wall clock) so it grows
    // deterministically.
    await withTransaction(deps, async ({ client, publish }) => {
      await client.query(
        `UPDATE auth.users
            SET login_attempts = login_attempts + 1,
                locked_until = CASE
                  WHEN login_attempts + 1 >= $2
                  THEN now() + make_interval(
                    secs => LEAST(
                      $3::double precision * power(2, login_attempts + 1 - $2),
                      $4::double precision
                    )
                  )
                  ELSE locked_until
                END,
                updated_at = now()
          WHERE user_id = $1`,
        [user.user_id, LOGIN_LOCK_THRESHOLD, LOGIN_LOCK_BASE_SECONDS, LOGIN_LOCK_MAX_SECONDS]
      );
      publish({
        type: 'auth.actionTaken',
        id: `auth.actionTaken.${randomUUID()}`,
        payload: {
          eventId: randomUUID(),
          service: 'service.auth',
          subject: 'auth.actionTaken',
          aggregateType: 'user',
          aggregateId: user.user_id,
          actorUserId: user.user_id,
          actorEmailSnapshot: user.email,
          action: 'login',
          outcome: 'denied',
          occurredAt: new Date().toISOString(),
          ipAddress: req.ipAddress,
          userAgent: req.userAgent,
        },
      });
    });
    loginCounter.inc({ outcome: 'invalid_credentials' });
    throw new HandlerError('UNAUTHENTICATED', 'invalid credentials');
  }

  // The password is correct — only now is it safe to reveal account state
  // (ADS-966). A locked/suspended/deactivated account still can't log in,
  // but the distinct message is reserved for someone who has already
  // proven they know the password.
  if (user.locked_until && user.locked_until > new Date()) {
    loginCounter.inc({ outcome: 'account_locked' });
    await publishLoginActionTaken(deps, {
      outcome: 'denied',
      aggregateId: user.user_id,
      actorUserId: user.user_id,
      actorEmailSnapshot: user.email,
      ipAddress: req.ipAddress,
      userAgent: req.userAgent,
    });
    throw new HandlerError('PERMISSION_DENIED', 'account is temporarily locked');
  }
  if (user.status === 'suspended' || user.status === 'deactivated') {
    loginCounter.inc({ outcome: 'account_suspended' });
    await publishLoginActionTaken(deps, {
      outcome: 'denied',
      aggregateId: user.user_id,
      actorUserId: user.user_id,
      actorEmailSnapshot: user.email,
      ipAddress: req.ipAddress,
      userAgent: req.userAgent,
    });
    throw new HandlerError('PERMISSION_DENIED', `account is ${user.status}`);
  }

  // Email verification gate. A correct password on an unverified account must
  // NOT reveal that the password was right — doing so turns the response into
  // a password-check oracle (ADS-964). We increment login_attempts exactly as
  // the wrong-password path does and throw the same UNAUTHENTICATED shape so
  // the two cases are indistinguishable to the caller. The user must trigger a
  // "resend verification email" flow separately; the client should surface that
  // option alongside any invalid-credentials error.
  if (!user.email_verified) {
    await withTransaction(deps, async ({ client, publish }) => {
      await client.query(
        `UPDATE auth.users
            SET login_attempts = login_attempts + 1,
                locked_until = CASE
                  WHEN login_attempts + 1 >= $2
                  THEN now() + make_interval(
                    secs => LEAST(
                      $3::double precision * power(2, login_attempts + 1 - $2),
                      $4::double precision
                    )
                  )
                  ELSE locked_until
                END,
                updated_at = now()
          WHERE user_id = $1`,
        [user.user_id, LOGIN_LOCK_THRESHOLD, LOGIN_LOCK_BASE_SECONDS, LOGIN_LOCK_MAX_SECONDS]
      );
      publish({
        type: 'auth.actionTaken',
        id: `auth.actionTaken.${randomUUID()}`,
        payload: {
          eventId: randomUUID(),
          service: 'service.auth',
          subject: 'auth.actionTaken',
          aggregateType: 'user',
          aggregateId: user.user_id,
          actorUserId: user.user_id,
          actorEmailSnapshot: user.email,
          action: 'login',
          outcome: 'denied',
          occurredAt: new Date().toISOString(),
          ipAddress: req.ipAddress,
          userAgent: req.userAgent,
        },
      });
    });
    loginCounter.inc({ outcome: 'email_unverified' });
    throw new HandlerError('UNAUTHENTICATED', 'invalid credentials');
  }

  // Second factor. The password is correct; if the account has 2FA on we
  // require a valid TOTP code (or a single-use backup code, ADS-914b)
  // before minting any tokens. A first login call (no code) is answered
  // with two_factor_required so the client can prompt and re-submit; a
  // wrong code is an auth failure.
  let backupCodesExhausted = false;
  if (user.two_factor_enabled) {
    if (!req.twoFactorToken && !req.backupCode) {
      return {
        permissions: [],
        twoFactorRequired: true,
        emailVerificationRequired: false,
        backupCodesExhausted: false,
      };
    }
    const secondFactor = await verifySecondFactor(deps, user, req);
    if (!secondFactor.ok) {
      loginCounter.inc({ outcome: 'invalid_credentials' });
      await publishLoginActionTaken(deps, {
        outcome: 'denied',
        aggregateId: user.user_id,
        actorUserId: user.user_id,
        actorEmailSnapshot: user.email,
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
      });
      throw new HandlerError('UNAUTHENTICATED', 'invalid two-factor code');
    }
    backupCodesExhausted = secondFactor.backupCodesExhausted;
  }

  const minted = await deps.tokenIssuer.mint(user.user_id);

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(
      `
      INSERT INTO auth.refresh_tokens (token_hash, user_id, expires_at, revoked_at, created_at, updated_at)
      VALUES ($1, $2, $3, NULL, now(), now())
      `,
      [hashRefreshToken(minted.pair.refreshToken), user.user_id, minted.refreshExpiresAt]
    );
    await client.query(
      `UPDATE auth.users SET last_login_at = now(), login_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = $1`,
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
    publish({
      type: 'auth.actionTaken',
      id: `auth.actionTaken.${minted.accessJti}`,
      payload: {
        eventId: randomUUID(),
        service: 'service.auth',
        subject: 'auth.actionTaken',
        aggregateType: 'user',
        aggregateId: user.user_id,
        actorUserId: user.user_id,
        actorEmailSnapshot: user.email,
        action: 'login',
        outcome: 'success',
        occurredAt: new Date().toISOString(),
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
      },
    });
  });

  // Aggregate the principal AFTER the commit — the row read is cheap
  // and avoids muddying the transaction with read concerns.
  const principal = await loadPrincipal(deps, user.user_id);

  loginCounter.inc({ outcome: 'success' });
  return {
    user: rowToProtoUser(user),
    tokens: minted.pair,
    permissions: principal.permissions,
    twoFactorRequired: false,
    emailVerificationRequired: false,
    backupCodesExhausted,
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
      `UPDATE auth.refresh_tokens SET revoked_at = now(), is_revoked = true, updated_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
      [hashRefreshToken(req.refreshToken)]
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
  const { tokenRefreshCounter } = createAuthMetrics();

  if (!req.refreshToken) {
    throw new HandlerError('INVALID_ARGUMENT', 'refresh_token is required');
  }

  let claims: RefreshTokenClaims;
  try {
    claims = await deps.tokenIssuer.verifyRefresh(req.refreshToken);
  } catch {
    tokenRefreshCounter.inc({ outcome: 'invalid_token' });
    throw new HandlerError('UNAUTHENTICATED', 'invalid or expired refresh token');
  }

  // Denylist check.
  const denied = await deps.pool.query<{ jti: string }>(
    `SELECT jti FROM auth.revoked_tokens WHERE jti = $1`,
    [claims.jti]
  );
  if (denied.rows.length > 0) {
    tokenRefreshCounter.inc({ outcome: 'token_revoked' });
    throw new HandlerError('UNAUTHENTICATED', 'refresh token revoked');
  }

  // Confirm the persisted refresh row is still active. A row is active
  // only when BOTH revocation columns agree: `revoked_at` (set by the
  // refresh/logout path) AND `is_revoked` (set by RevokeSession). The two
  // columns historically diverged — checking only `revoked_at` let a
  // session revoked via RevokeSession keep refreshing (it sets is_revoked
  // but never revoked_at). Honour both.
  const incomingTokenHash = hashRefreshToken(req.refreshToken);
  const stored = await deps.pool.query<RefreshTokenRow>(
    `SELECT * FROM auth.refresh_tokens WHERE token_hash = $1`,
    [incomingTokenHash]
  );
  if (stored.rows.length === 0 || stored.rows[0].revoked_at !== null || stored.rows[0].is_revoked) {
    tokenRefreshCounter.inc({ outcome: 'token_revoked' });
    // When a revoked token row exists, it was either already rotated (reuse
    // attack) or explicitly revoked. Either way, revoking the entire family
    // is safe: it kicks the attacker's live tokens and is a no-op if the
    // family was already fully revoked at logout. (ADS-913)
    if (stored.rows.length > 0) {
      const reuseFamily = stored.rows[0].family_id;
      await withTransaction(deps, async ({ client, publish }) => {
        await client.query(
          `UPDATE auth.refresh_tokens
           SET is_revoked = true, revoked_at = now(), updated_at = now()
           WHERE family_id = $1 AND is_revoked = false`,
          [reuseFamily]
        );
        await client.query(
          `UPDATE auth.users SET tokens_valid_from = now(), updated_at = now() WHERE user_id = $1`,
          [claims.sub]
        );
        publish({
          type: 'auth.tokenReuseDetected',
          id: `auth.tokenReuseDetected.${claims.jti}`,
          payload: { userId: claims.sub, familyId: reuseFamily, jti: claims.jti },
        });
      });
      tokenRefreshCounter.inc({ outcome: 'family_revoked_on_reuse' });
    }
    throw new HandlerError('UNAUTHENTICATED', 'refresh token revoked');
  }
  const familyId = stored.rows[0].family_id;

  // A suspended/deactivated/deleted user must not be able to rotate their
  // refresh token into a fresh pair — otherwise admin deactivation only
  // takes effect when the current refresh token finally expires (30d).
  await assertActiveUser(deps, claims.sub);

  const minted = await deps.tokenIssuer.mint(claims.sub);

  const rotated = await withTransaction(deps, async ({ client, publish }) => {
    // Atomic rotation gate: revoke the old row ONLY if it is still active,
    // and serialise concurrent refreshes on the same token through this
    // conditional UPDATE. The `revoked_at IS NULL AND is_revoked = false`
    // predicate makes the row its own lock — the second of two racing
    // refreshes finds rowCount 0 (the first already flipped the row) and
    // bails out below WITHOUT minting a second valid family. It also loses
    // to a concurrent RevokeSession (which flips is_revoked). The
    // pre-transaction SELECT above is a cheap fast-fail only; THIS is the
    // authoritative check. We set BOTH columns so the sessions list and
    // the refresh path stay consistent.
    const revoke = await client.query(
      `UPDATE auth.refresh_tokens
       SET revoked_at = now(), is_revoked = true, updated_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL AND is_revoked = false`,
      [incomingTokenHash]
    );
    if (revoke.rowCount === 0) {
      // The token was already rotated between our read and this write —
      // concurrent reuse. Revoke the entire family so the attacker's branch
      // cannot retain access with its fresh pair. (ADS-913)
      await client.query(
        `UPDATE auth.refresh_tokens
         SET is_revoked = true, revoked_at = now(), updated_at = now()
         WHERE family_id = $1 AND is_revoked = false`,
        [familyId]
      );
      await client.query(
        `UPDATE auth.users SET tokens_valid_from = now(), updated_at = now() WHERE user_id = $1`,
        [claims.sub]
      );
      publish({
        type: 'auth.tokenReuseDetected',
        id: `auth.tokenReuseDetected.${claims.jti}`,
        payload: { userId: claims.sub, familyId, jti: claims.jti },
      });
      tokenRefreshCounter.inc({ outcome: 'concurrent_reuse' });
      tokenRefreshCounter.inc({ outcome: 'family_revoked_on_reuse' });
      return false;
    }

    // Add the old jti to the denylist so a stolen old access/refresh token
    // can't replay even if the new one is also out in the wild.
    await client.query(
      `
      INSERT INTO auth.revoked_tokens (jti, user_id, expires_at, revoked_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (jti) DO NOTHING
      `,
      [claims.jti, claims.sub, new Date(claims.exp * 1000)]
    );
    // Inherit the rotation family so RevokeSession can revoke the whole
    // chain in one shot. The new row is the active head of the family.
    await client.query(
      `
      INSERT INTO auth.refresh_tokens (token_hash, user_id, family_id, expires_at, revoked_at, is_revoked, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NULL, false, now(), now())
      `,
      [hashRefreshToken(minted.pair.refreshToken), claims.sub, familyId, minted.refreshExpiresAt]
    );

    publish({
      type: 'auth.tokenRefreshed',
      id: `auth.tokenRefreshed.${minted.accessJti}`,
      payload: { userId: claims.sub, oldJti: claims.jti, newJti: minted.accessJti },
    });
    return true;
  });

  if (!rotated) {
    throw new HandlerError('UNAUTHENTICATED', 'refresh token revoked');
  }

  tokenRefreshCounter.inc({ outcome: 'success' });
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

  // Reject the token if the user is no longer allowed to authenticate
  // (suspended/deactivated/deleted) OR if it predates the user's revocation
  // watermark (session revoke / password reset / change) — a still-valid
  // access token must not outlive those actions. Checked BEFORE hydrating
  // the principal so a blocked user never gets roles/permissions surfaced.
  await assertActiveUser(deps, claims.sub, claims.iat);

  // Now (and only now) hydrate the principal. Single user_id read +
  // role/permission joins — same query loadPrincipal uses.
  const principal = await loadPrincipal(deps, claims.sub);
  // rescueId is NOT populated here: rescue-staff membership lives in the
  // rescue service, not auth. The gateway resolves it via RescueService
  // after ValidateToken succeeds (ADS-863) and stamps it on the request.
  const proto: AuthPrincipal = {
    userId: claims.sub,
    roles: rolesToProto(principal.roles),
    permissions: principal.permissions,
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
