// Shared TOTP verification for the encrypted-at-rest secret, with replay
// protection (ADS-914a/c). Used by both Login's 2FA check (handlers.ts)
// and disableTwoFactor (two-factor-handlers.ts) — anywhere a code is
// checked against the STORED secret, as opposed to setup/enable's
// not-yet-persisted secret.
//
// Replay protection: otplib's `afterTimeStep` rejects any code whose
// RFC 6238 time step is <= the last accepted step, so a code observed
// once (screenshare, shoulder-surf, AiTM phishing proxy) can't be reused
// even within its still-valid 30s window. We persist the matched time
// step on every successful verification.

import type { Pool } from 'pg';

import { verifySync } from 'otplib';

import { decryptTotpSecret } from './totp-crypto.js';

// RFC 6238 defaults otplib uses: 30-second period, t0 = 0. The accepted
// time step for a given epoch is therefore floor(epoch / TOTP_PERIOD).
// Exported so two-factor-handlers.ts can compute the same step when it
// verifies a code directly against a not-yet-persisted secret (enrolment)
// instead of going through verifyAndConsumeTotp (ADS-976).
export const TOTP_PERIOD_SECONDS = 30;

export type TotpVerificationDeps = {
  pool: Pick<Pool, 'query'>;
  encryptionKey: string;
};

export type TotpVerificationInput = {
  userId: string;
  // The at-rest (encrypted) secret, or null if 2FA was never enrolled.
  encryptedSecret: string | null;
  // The last TOTP time step accepted for this user, or null if none yet.
  lastStep: number | null;
};

export async function verifyAndConsumeTotp(
  deps: TotpVerificationDeps,
  input: TotpVerificationInput,
  token: string
): Promise<boolean> {
  if (!input.encryptedSecret) {
    return false;
  }

  let secret: string;
  try {
    secret = decryptTotpSecret(deps.encryptionKey, input.encryptedSecret);
  } catch {
    // Corrupted/foreign ciphertext must not crash the request — fail
    // closed as an invalid code, same as a wrong 6-digit guess.
    return false;
  }

  // Pin the epoch so the accepted step we persist matches the epoch the
  // verification used (no window-boundary race between verify and compute).
  const epoch = Math.floor(Date.now() / 1000);
  const result = verifySync({
    token,
    secret,
    epoch,
    afterTimeStep: input.lastStep ?? undefined,
  });
  if (!result.valid) {
    return false;
  }

  const step = Math.floor(epoch / TOTP_PERIOD_SECONDS);
  await deps.pool.query(
    `UPDATE auth.users SET two_factor_last_step = $2, updated_at = now() WHERE user_id = $1`,
    [input.userId, step]
  );
  return true;
}
