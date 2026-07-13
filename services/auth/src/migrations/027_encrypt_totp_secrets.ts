import type { MigrationBuilder } from 'node-pg-migrate';

import { requireHexSecret } from '@adopt-dont-shop/config-secrets';

import { encryptTotpSecret } from '../grpc/totp-crypto.js';

// ADS-914: TOTP 2FA hardening.
//
// (a) `two_factor_secret` was written and read verbatim — a single DB read
// gave permanent, offline 2FA bypass for every enrolled user (the same
// class of risk 024/025 already fixed for reset/verification/refresh
// tokens, there by hashing). TOTP secrets must round-trip (the server
// needs the plaintext back to compute codes), so they're encrypted with
// AES-256-GCM under ENCRYPTION_KEY instead — see grpc/totp-crypto.ts.
// This migration re-wraps every existing plaintext secret in place; from
// this point the column holds ciphertext only, matching the runtime
// encrypt-on-enable / decrypt-on-verify code path (grpc/two-factor-handlers.ts,
// grpc/totp-verification.ts).
//
// (c) TOTP codes could be replayed within their validity window (observed
// once via screenshare/shoulder-surf/AiTM phishing, then reused). Adds
// `two_factor_last_step` so verifyAndConsumeTotp can reject any code whose
// RFC 6238 time step is <= the last accepted one.
//
// (b) Backup codes are a separate, larger self-service-recovery feature
// (generation, hashing, storage, redemption UI) and are deliberately out
// of scope for this migration — tracked as a follow-up.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('users', {
    two_factor_last_step: { type: 'integer' },
  });

  const encryptionKey = requireHexSecret('ENCRYPTION_KEY', process.env, {
    description: 'AES-256-GCM key for encrypting TOTP secrets at rest',
  });

  const rows = (await pgm.db.select(
    `SELECT user_id, two_factor_secret FROM auth.users WHERE two_factor_secret IS NOT NULL`
  )) as Array<{ user_id: string; two_factor_secret: string }>;

  for (const row of rows) {
    try {
      const encrypted = encryptTotpSecret(encryptionKey, row.two_factor_secret);
      await pgm.db.query(`UPDATE auth.users SET two_factor_secret = $1 WHERE user_id = $2`, [
        encrypted,
        row.user_id,
      ]);
    } catch (err) {
      // A single malformed row must not abort the whole rollout. The
      // affected user simply falls back to the existing admin-mediated
      // disableTwoFactor / re-enrolment flow.
      console.warn(
        `[027_encrypt_totp_secrets] failed to encrypt two_factor_secret for user_id=${row.user_id}`,
        err
      );
    }
  }
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumns('users', ['two_factor_last_step']);
  // Deliberately not reversing the encryption — decrypting back to
  // plaintext on downgrade would be a worse security posture than leaving
  // already-encrypted rows encrypted (same stance as 024/025).
};
