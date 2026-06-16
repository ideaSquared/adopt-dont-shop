// Account-lifecycle handlers — Register / VerifyEmail / ResendVerification /
// ForgotPassword / ResetPassword / ChangePassword / UpdateAccount.
//
// Same shape as the existing handlers.ts: pure async functions returning
// proto response objects; the adapter wraps them into grpc-js. Errors
// surface as HandlerError; the adapter maps to grpc status codes.
//
// All passwords are bcrypt-hashed via deps.passwordHasher. Verification
// + reset tokens are 32-byte URL-safe random strings (raw, not hashed —
// matches the monolith's existing column shape so backfill works).
//
// Side-effects emitted via withTransaction so they fire after commit:
//   - auth.userRegistered  → notifications service sends the verification email
//   - auth.passwordResetRequested → sends the reset email
//   - auth.emailVerified
//   - auth.passwordChanged

import { randomBytes } from 'node:crypto';

import { withTransaction } from '@adopt-dont-shop/events';

import type { Principal } from '@adopt-dont-shop/authz';
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UpdateAccountRequest,
  UpdateAccountResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from '@adopt-dont-shop/proto';

import { roleToDb } from './enum-map.js';
import { HandlerError, rowToProtoUser, type HandlerDeps, type UserRow } from './handlers.js';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const MIN_PASSWORD_LENGTH = 8;

// Random URL-safe token. Same shape the monolith stores (raw base64url,
// not hashed) so the column stays interoperable during the strangler
// migration.
function mintToken(): string {
  return randomBytes(32).toString('base64url');
}

function assertPassword(pw: string): void {
  if (pw.length < MIN_PASSWORD_LENGTH) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }
}

function assertEmail(email: string): void {
  if (!email || !email.includes('@') || email.length > 255) {
    throw new HandlerError('INVALID_ARGUMENT', 'email is invalid');
  }
}

// --- Register --------------------------------------------------------

export async function register(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: RegisterRequest
): Promise<RegisterResponse> {
  assertEmail(req.email);
  assertPassword(req.password);
  if (!req.firstName || !req.lastName) {
    throw new HandlerError('INVALID_ARGUMENT', 'first_name and last_name are required');
  }
  if (!req.termsAccepted || !req.privacyPolicyAccepted) {
    throw new HandlerError('INVALID_ARGUMENT', 'terms and privacy policy must be accepted');
  }

  // Hash up front so the response takes the same time whether or not the email
  // is already taken — no fast path that would leak account existence via
  // response timing.
  const password = await deps.passwordHasher.hash(req.password);

  // Enumeration-safe: never reveal whether the email is already registered.
  // An existing email returns the SAME uniform response as a fresh signup —
  // no error, no tokens. (A duplicate INSERT racing this check is caught
  // below and handled identically.)
  const existing = await deps.pool.query(
    `SELECT 1 FROM auth.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.email]
  );
  if (existing.rows.length > 0) {
    return REGISTERED_RESPONSE;
  }

  const verificationToken = mintToken();
  const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  // Adopters self-register; everything else is invitation-based.
  const userType = 'adopter' as const;
  void roleToDb; // satisfy import — the proto user_type is ignored on Register

  try {
    await withTransaction(deps, async ({ client, publish }) => {
      const insertRes = await client.query<UserRow>(
        `
        INSERT INTO auth.users (
          user_id, email, password, first_name, last_name, phone_number,
          verification_token, verification_token_expires_at,
          status, user_type, email_verified, phone_verified,
          two_factor_enabled, terms_accepted_at, privacy_policy_accepted_at,
          login_attempts, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7,
          'pending_verification', $8, false, false,
          false, now(), now(),
          0, now(), now()
        )
        RETURNING *
        `,
        [
          req.email,
          password,
          req.firstName,
          req.lastName,
          req.phoneNumber ?? null,
          verificationToken,
          verificationExpires,
          userType,
        ]
      );
      const user = insertRes.rows[0];

      publish({
        type: 'auth.userRegistered',
        id: `auth.userRegistered.${user.user_id}`,
        payload: {
          userId: user.user_id,
          email: user.email,
          firstName: user.first_name,
          verificationToken,
          verificationExpiresAt: verificationExpires.toISOString(),
        },
      });
    });
  } catch (err) {
    // Unique-violation race: a concurrent register created the row between
    // the pre-check and the INSERT. Treat it exactly like the existing-email
    // case — same uniform response, no leak.
    if ((err as { code?: string }).code === '23505') {
      return REGISTERED_RESPONSE;
    }
    throw err;
  }

  // Verification-first: NO tokens are issued here. The user verifies their
  // email (which flips status → active), then signs in via Login.
  return REGISTERED_RESPONSE;
}

// Uniform Register response — identical for a fresh signup and an
// already-registered email, so the response can't probe account existence.
// `permissions` is the only required proto field; user/tokens are omitted.
const REGISTERED_RESPONSE: RegisterResponse = { permissions: [] };

// --- VerifyEmail -----------------------------------------------------

export async function verifyEmail(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: VerifyEmailRequest
): Promise<VerifyEmailResponse> {
  if (!req.verificationToken) {
    throw new HandlerError('INVALID_ARGUMENT', 'verification_token is required');
  }
  const updated = await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<UserRow>(
      `
      UPDATE auth.users
      SET email_verified = true,
          status = 'active',
          verification_token = NULL,
          verification_token_expires_at = NULL,
          updated_at = now()
      WHERE verification_token = $1
        AND (verification_token_expires_at IS NULL OR verification_token_expires_at > now())
        AND deleted_at IS NULL
      RETURNING *
      `,
      [req.verificationToken]
    );
    if (res.rows.length === 0) {
      throw new HandlerError('INVALID_ARGUMENT', 'invalid or expired verification token');
    }
    const user = res.rows[0];
    publish({
      type: 'auth.emailVerified',
      id: `auth.emailVerified.${user.user_id}`,
      payload: { userId: user.user_id, email: user.email },
    });
    return user;
  });
  return { user: rowToProtoUser(updated) };
}

// --- ResendVerification ---------------------------------------------

export async function resendVerification(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: ResendVerificationRequest
): Promise<ResendVerificationResponse> {
  assertEmail(req.email);
  await withTransaction(deps, async ({ client, publish }) => {
    const verificationToken = mintToken();
    const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    const res = await client.query<UserRow>(
      `
      UPDATE auth.users
      SET verification_token = $1,
          verification_token_expires_at = $2,
          updated_at = now()
      WHERE email = $3 AND email_verified = false AND deleted_at IS NULL
      RETURNING *
      `,
      [verificationToken, expires, req.email]
    );
    // Only emit when we actually updated a row — but the RESPONSE is the
    // same either way (don't leak account existence).
    if (res.rows.length === 1) {
      const user = res.rows[0];
      publish({
        type: 'auth.userRegistered',
        id: `auth.userRegistered.resend.${user.user_id}.${verificationToken.slice(0, 8)}`,
        payload: {
          userId: user.user_id,
          email: user.email,
          firstName: user.first_name,
          verificationToken,
          verificationExpiresAt: expires.toISOString(),
        },
      });
    }
  });
  return { ok: true };
}

// --- ForgotPassword --------------------------------------------------

export async function forgotPassword(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> {
  assertEmail(req.email);
  await withTransaction(deps, async ({ client, publish }) => {
    const token = mintToken();
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    const res = await client.query<UserRow>(
      `
      UPDATE auth.users
      SET reset_token = $1,
          reset_token_expiration = $2,
          updated_at = now()
      WHERE email = $3 AND deleted_at IS NULL
      RETURNING *
      `,
      [token, expires, req.email]
    );
    if (res.rows.length === 1) {
      const user = res.rows[0];
      publish({
        type: 'auth.passwordResetRequested',
        id: `auth.passwordResetRequested.${user.user_id}.${token.slice(0, 8)}`,
        payload: {
          userId: user.user_id,
          email: user.email,
          firstName: user.first_name,
          resetToken: token,
          resetExpiresAt: expires.toISOString(),
        },
      });
    }
  });
  return { ok: true };
}

// --- ResetPassword ---------------------------------------------------

export async function resetPassword(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: ResetPasswordRequest
): Promise<ResetPasswordResponse> {
  if (!req.resetToken) {
    throw new HandlerError('INVALID_ARGUMENT', 'reset_token is required');
  }
  assertPassword(req.newPassword);
  const password = await deps.passwordHasher.hash(req.newPassword);

  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<UserRow>(
      `
      UPDATE auth.users
      SET password = $1,
          reset_token = NULL,
          reset_token_expiration = NULL,
          reset_token_force_flag = false,
          locked_until = NULL,
          login_attempts = 0,
          tokens_valid_from = now(),
          updated_at = now()
      WHERE reset_token = $2
        AND (reset_token_expiration IS NULL OR reset_token_expiration > now())
        AND deleted_at IS NULL
      RETURNING *
      `,
      [password, req.resetToken]
    );
    if (res.rows.length === 0) {
      throw new HandlerError('INVALID_ARGUMENT', 'invalid or expired reset token');
    }
    const user = res.rows[0];
    // Revoke every existing session: a password reset is a security event
    // (often a compromised-account recovery), so all refresh tokens must
    // stop working. Sets both revocation columns so refresh AND ListSessions
    // agree. Already-issued access tokens are invalidated immediately by the
    // tokens_valid_from watermark stamped above (ValidateToken rejects any
    // access token issued before it).
    await client.query(
      `UPDATE auth.refresh_tokens
          SET revoked_at = now(), is_revoked = true, updated_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL AND is_revoked = false`,
      [user.user_id]
    );
    publish({
      type: 'auth.passwordChanged',
      id: `auth.passwordChanged.${user.user_id}.reset.${Date.now()}`,
      payload: { userId: user.user_id, via: 'reset' },
    });
  });
  return { ok: true };
}

// --- ChangePassword --------------------------------------------------

export async function changePassword(
  deps: HandlerDeps,
  principal: Principal | null,
  req: ChangePasswordRequest
): Promise<ChangePasswordResponse> {
  if (!principal) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }
  if (!req.currentPassword) {
    throw new HandlerError('INVALID_ARGUMENT', 'current_password is required');
  }
  assertPassword(req.newPassword);

  const userRes = await deps.pool.query<{ password: string }>(
    `SELECT password FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [principal.userId]
  );
  if (userRes.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', 'user not found');
  }
  const ok = await deps.passwordHasher.compare(req.currentPassword, userRes.rows[0].password);
  if (!ok) {
    throw new HandlerError('PERMISSION_DENIED', 'current password is incorrect');
  }
  const newHash = await deps.passwordHasher.hash(req.newPassword);

  await withTransaction(deps, async ({ client, publish }) => {
    await client.query(
      `UPDATE auth.users
          SET password = $1, tokens_valid_from = now(), updated_at = now()
        WHERE user_id = $2`,
      [newHash, principal.userId]
    );
    // Changing the password ends all other sessions: revoke every refresh
    // token for the user (both columns, so refresh + ListSessions agree).
    await client.query(
      `UPDATE auth.refresh_tokens
          SET revoked_at = now(), is_revoked = true, updated_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL AND is_revoked = false`,
      [principal.userId]
    );
    publish({
      type: 'auth.passwordChanged',
      id: `auth.passwordChanged.${principal.userId}.change.${Date.now()}`,
      payload: { userId: principal.userId, via: 'change' },
    });
  });
  return { ok: true };
}

// --- UpdateAccount ---------------------------------------------------

export async function updateAccount(
  deps: HandlerDeps,
  principal: Principal | null,
  req: UpdateAccountRequest
): Promise<UpdateAccountResponse> {
  if (!principal) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }
  const sets: string[] = [];
  const params: unknown[] = [];
  let n = 1;
  const setField = (col: string, value: string | undefined): void => {
    if (value === undefined) {
      return;
    }
    sets.push(`${col} = $${n++}`);
    params.push(value);
  };
  setField('first_name', req.firstName);
  setField('last_name', req.lastName);
  setField('phone_number', req.phoneNumber);
  setField('bio', req.bio);
  setField('timezone', req.timezone);
  setField('language', req.language);
  setField('country', req.country);
  setField('city', req.city);
  setField('address_line_1', req.addressLine1);
  setField('address_line_2', req.addressLine2);
  setField('postal_code', req.postalCode);

  if (sets.length === 0) {
    // Nothing to update — return the current row.
    const cur = await deps.pool.query<UserRow>(
      `SELECT * FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
      [principal.userId]
    );
    if (cur.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', 'user not found');
    }
    return { user: rowToProtoUser(cur.rows[0]) };
  }

  sets.push('updated_at = now()');
  params.push(principal.userId);
  const res = await deps.pool.query<UserRow>(
    `
    UPDATE auth.users
    SET ${sets.join(', ')}
    WHERE user_id = $${n} AND deleted_at IS NULL
    RETURNING *
    `,
    params
  );
  if (res.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', 'user not found');
  }
  return { user: rowToProtoUser(res.rows[0]) };
}
