// Two-factor (TOTP) enrolment handlers — SetupTwoFactor / EnableTwoFactor
// / DisableTwoFactor / RegenerateBackupCodes. Self-scoped: every handler
// acts on the calling principal's own account (no admin cross-user 2FA
// management here).
//
// Flow:
//   1. Setup mints a fresh base32 secret, stores it encrypted in
//      two_factor_secret_pending (10-minute TTL), and returns it to the
//      client so they can show it as a QR code / manual entry. The pending
//      secret is server-side only from this point (ADS-963).
//   2. Enable reads the pending secret from the DB (NOT req.secret), verifies
//      the TOTP code against it, promotes the pending secret to two_factor_secret,
//      mints 10 backup/recovery codes, and flips two_factor_enabled on. The
//      plaintext codes are returned exactly once — only their hashes are persisted.
//   3. Disable verifies a current code against the STORED secret, then
//      clears it (and the backup codes, via GDPR erase / re-enable).
//   4. RegenerateBackupCodes verifies a current code and mints a fresh
//      set of 10, invalidating any still-unused ones.
//
// Once enabled, the Login handler (handlers.ts) requires a valid code —
// see LoginResponse.two_factor_required — and now also accepts a backup
// code in its place (LoginRequest.backup_code).

import { generateSecret, generateURI, verifySync } from 'otplib';

import type { Principal } from '@adopt-dont-shop/authz';
import type {
  DisableTwoFactorRequest,
  DisableTwoFactorResponse,
  EnableTwoFactorRequest,
  EnableTwoFactorResponse,
  RegenerateBackupCodesRequest,
  RegenerateBackupCodesResponse,
  SetupTwoFactorRequest,
  SetupTwoFactorResponse,
} from '@adopt-dont-shop/proto';

import { generateBackupCodes, hashBackupCodes } from './backup-codes.js';
import { HandlerError, type HandlerDeps } from './handlers.js';
import { decryptTotpSecret, encryptTotpSecret } from './totp-crypto.js';
import { TOTP_PERIOD_SECONDS, verifyAndConsumeTotp } from './totp-verification.js';

const TOTP_ISSUER = 'Adopt Dont Shop';
const PENDING_SECRET_TTL_MINUTES = 10;

type TwoFactorRow = {
  email: string;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_last_step: number | null;
  two_factor_secret_pending: string | null;
  two_factor_pending_expires_at: Date | null;
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
  const res = await deps.pool.query<Pick<TwoFactorRow, 'email' | 'two_factor_enabled'>>(
    `SELECT email, two_factor_enabled
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

  // Persist the pending secret (AES-256-GCM encrypted) with a short TTL so
  // enableTwoFactor can verify against it without trusting the client.
  await deps.pool.query(
    `UPDATE auth.users
        SET two_factor_secret_pending = $1,
            two_factor_pending_expires_at = now() + $2::interval,
            updated_at = now()
      WHERE user_id = $3 AND deleted_at IS NULL`,
    [
      encryptTotpSecret(deps.encryptionKey, secret),
      `${PENDING_SECRET_TTL_MINUTES} minutes`,
      me.userId,
    ]
  );

  return { secret, otpauthUrl };
}

export async function enableTwoFactor(
  deps: HandlerDeps,
  principal: Principal | null,
  req: EnableTwoFactorRequest
): Promise<EnableTwoFactorResponse> {
  const me = requirePrincipal(principal);
  if (!req.token) {
    throw new HandlerError('INVALID_ARGUMENT', 'token is required');
  }

  // Read the server-stored pending secret — never trust req.secret (ADS-963).
  const res = await deps.pool.query<
    Pick<
      TwoFactorRow,
      'two_factor_enabled' | 'two_factor_secret_pending' | 'two_factor_pending_expires_at'
    >
  >(
    `SELECT two_factor_enabled, two_factor_secret_pending, two_factor_pending_expires_at
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
  if (!row.two_factor_secret_pending || !row.two_factor_pending_expires_at) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      'two-factor setup is required before enabling; call setup first'
    );
  }
  if (new Date(row.two_factor_pending_expires_at) <= new Date()) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      'two-factor setup has expired; please start setup again'
    );
  }

  const pendingSecret = decryptTotpSecret(deps.encryptionKey, row.two_factor_secret_pending);
  // Pin the epoch so the accepted step we persist below matches the epoch
  // verifySync used (no window-boundary race between verify and compute) —
  // mirrors totp-verification.ts's verifyAndConsumeTotp.
  const epoch = Math.floor(Date.now() / 1000);
  if (!verifySync({ token: req.token, secret: pendingSecret, epoch }).valid) {
    throw new HandlerError('INVALID_ARGUMENT', 'invalid two-factor code');
  }
  // The confirmation code just accepted proves possession of the
  // authenticator, exactly like a code checked via verifyAndConsumeTotp —
  // persist its time step so it can't also be replayed on the very next
  // Login within the same 30s window (ADS-976).
  const acceptedStep = Math.floor(epoch / TOTP_PERIOD_SECONDS);

  // Mint the backup/recovery codes (ADS-914b) now, before the write, so a
  // failed UPDATE (already-enabled race) doesn't leave us having hashed
  // codes we then throw away — cheap enough either way, but keeps the
  // happy path linear.
  const backupCodes = generateBackupCodes();
  const backupCodeHashes = await hashBackupCodes(deps.passwordHasher, backupCodes);

  // Promote the pending secret atomically. The WHERE clause re-checks both
  // two_factor_enabled = false and the pending expiry so a concurrent enable
  // or an expired setup can't slip through between the SELECT and this UPDATE.
  const updateRes = await deps.pool.query(
    `UPDATE auth.users
        SET two_factor_secret = two_factor_secret_pending,
            two_factor_enabled = true,
            two_factor_last_step = $1,
            two_factor_secret_pending = NULL,
            two_factor_pending_expires_at = NULL,
            backup_codes = $2,
            updated_at = now()
      WHERE user_id = $3 AND deleted_at IS NULL
        AND two_factor_enabled = false
        AND two_factor_secret_pending IS NOT NULL
        AND two_factor_pending_expires_at > now()`,
    [acceptedStep, backupCodeHashes, me.userId]
  );
  if (updateRes.rowCount === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'two-factor authentication is already enabled');
  }
  return { enabled: true, backupCodes };
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
            backup_codes = NULL, two_factor_secret_pending = NULL, two_factor_pending_expires_at = NULL,
            updated_at = now()
      WHERE user_id = $1`,
    [me.userId]
  );
  return { disabled: true };
}

// Mints a fresh set of backup codes and invalidates any still-unused ones
// from a prior enrolment/regeneration (ADS-914b). Same authorisation bar as
// disableTwoFactor — a current TOTP code proves possession of the
// authenticator — because the alternative (accepting a backup code here)
// would let a single leaked backup code mint an unlimited supply of new
// ones.
export async function regenerateBackupCodes(
  deps: HandlerDeps,
  principal: Principal | null,
  req: RegenerateBackupCodesRequest
): Promise<RegenerateBackupCodesResponse> {
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

  const backupCodes = generateBackupCodes();
  const backupCodeHashes = await hashBackupCodes(deps.passwordHasher, backupCodes);
  await deps.pool.query(
    `UPDATE auth.users SET backup_codes = $2, updated_at = now() WHERE user_id = $1`,
    [me.userId, backupCodeHashes]
  );
  return { backupCodes };
}
