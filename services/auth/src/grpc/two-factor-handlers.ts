// Two-factor (TOTP) enrolment handlers — SetupTwoFactor / EnableTwoFactor
// / DisableTwoFactor. Self-scoped: every handler acts on the calling
// principal's own account (no admin cross-user 2FA management here).
//
// Flow:
//   1. Setup mints a fresh base32 secret + otpauth URI. The secret is
//      NOT persisted yet — the client holds it and proves possession on
//      Enable, so a never-confirmed secret never lands in the DB.
//   2. Enable verifies a current TOTP code against that secret, then
//      stores it and flips two_factor_enabled on.
//   3. Disable verifies a current code against the STORED secret, then
//      clears it.
//
// Once enabled, the Login handler (handlers.ts) requires a valid code —
// see LoginResponse.two_factor_required.

import { generateSecret, generateURI, verifySync } from 'otplib';

import type { Principal } from '@adopt-dont-shop/authz';
import type {
  DisableTwoFactorRequest,
  DisableTwoFactorResponse,
  EnableTwoFactorRequest,
  EnableTwoFactorResponse,
  SetupTwoFactorRequest,
  SetupTwoFactorResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';
import { encryptTotpSecret } from './totp-crypto.js';
import { verifyAndConsumeTotp } from './totp-verification.js';

const TOTP_ISSUER = 'Adopt Dont Shop';

type TwoFactorRow = {
  email: string;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_last_step: number | null;
};

const requirePrincipal = (principal: Principal | null): Principal => {
  if (!principal) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }
  return principal;
};

export async function setupTwoFactor(
  deps: HandlerDeps,
  principal: Principal | null,
  _req: SetupTwoFactorRequest
): Promise<SetupTwoFactorResponse> {
  const me = requirePrincipal(principal);
  const res = await deps.pool.query<TwoFactorRow>(
    `SELECT email, two_factor_enabled, two_factor_secret
       FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [me.userId]
  );
  const row = res.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', 'user not found');
  }
  if (row.two_factor_enabled) {
    throw new HandlerError('INVALID_ARGUMENT', 'two-factor authentication is already enabled');
  }

  const secret = generateSecret();
  const otpauthUrl = generateURI({ secret, label: row.email, issuer: TOTP_ISSUER });
  return { secret, otpauthUrl };
}

export async function enableTwoFactor(
  deps: HandlerDeps,
  principal: Principal | null,
  req: EnableTwoFactorRequest
): Promise<EnableTwoFactorResponse> {
  const me = requirePrincipal(principal);
  if (!req.secret) {
    throw new HandlerError('INVALID_ARGUMENT', 'secret is required');
  }
  if (!req.token) {
    throw new HandlerError('INVALID_ARGUMENT', 'token is required');
  }
  // The code proves the user actually scanned the secret we minted.
  if (!verifySync({ token: req.token, secret: req.secret }).valid) {
    throw new HandlerError('INVALID_ARGUMENT', 'invalid two-factor code');
  }

  // Guard on two_factor_enabled = false so a concurrent enable can't be
  // overwritten and a re-enable surfaces as the "already enabled" 400.
  // The secret is encrypted at rest (ADS-914a) — only the ciphertext is
  // ever written to the DB.
  const res = await deps.pool.query(
    `UPDATE auth.users
        SET two_factor_secret = $1, two_factor_enabled = true, two_factor_last_step = NULL,
            updated_at = now()
      WHERE user_id = $2 AND deleted_at IS NULL AND two_factor_enabled = false`,
    [encryptTotpSecret(deps.encryptionKey, req.secret), me.userId]
  );
  if (res.rowCount === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'two-factor authentication is already enabled');
  }
  return { enabled: true };
}

export async function disableTwoFactor(
  deps: HandlerDeps,
  principal: Principal | null,
  req: DisableTwoFactorRequest
): Promise<DisableTwoFactorResponse> {
  const me = requirePrincipal(principal);
  if (!req.token) {
    throw new HandlerError('INVALID_ARGUMENT', 'token is required');
  }

  const res = await deps.pool.query<
    Pick<TwoFactorRow, 'two_factor_enabled' | 'two_factor_secret' | 'two_factor_last_step'>
  >(
    `SELECT two_factor_enabled, two_factor_secret, two_factor_last_step
       FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [me.userId]
  );
  const row = res.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', 'user not found');
  }
  if (!row.two_factor_enabled || !row.two_factor_secret) {
    throw new HandlerError('INVALID_ARGUMENT', 'two-factor authentication is not enabled');
  }
  const ok = await verifyAndConsumeTotp(
    deps,
    {
      userId: me.userId,
      encryptedSecret: row.two_factor_secret,
      lastStep: row.two_factor_last_step,
    },
    req.token
  );
  if (!ok) {
    throw new HandlerError('INVALID_ARGUMENT', 'invalid two-factor code');
  }

  await deps.pool.query(
    `UPDATE auth.users
        SET two_factor_secret = NULL, two_factor_enabled = false, two_factor_last_step = NULL,
            updated_at = now()
      WHERE user_id = $1`,
    [me.userId]
  );
  return { disabled: true };
}
