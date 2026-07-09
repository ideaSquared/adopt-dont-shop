// GDPR erasure for the auth schema. Strategy: anonymise the users row
// in place (set deleted_at, scrub PII columns) and hard-delete the
// session + refresh-token state. We never DELETE the users row itself
// because foreign keys live in other schemas as opaque user_id strings —
// rebroadcasting "user gone" lets downstream services clean themselves
// up via the saga, but the row needs to stay for FK integrity until the
// retention period passes.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function eraseAuth(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;

  // Anonymise the users row. Keeps user_id so cross-schema lookups still
  // resolve, but strips every column that could identify the person.
  const userRes = await client.query<{ user_id: string }>(
    `UPDATE auth.users
        SET email = $2,
            password = '__erased__',
            first_name = NULL,
            last_name = NULL,
            phone_number = NULL,
            date_of_birth = NULL,
            bio = NULL,
            profile_image_url = NULL,
            country = NULL,
            city = NULL,
            address_line_1 = NULL,
            address_line_2 = NULL,
            postal_code = NULL,
            two_factor_secret = NULL,
            backup_codes = NULL,
            reset_token_hash = NULL,
            reset_token_expiration = NULL,
            verification_token_hash = NULL,
            verification_token_expires_at = NULL,
            email_verified = false,
            phone_verified = false,
            status = 'deactivated',
            deleted_at = now(),
            updated_at = now()
      WHERE user_id = $1
      RETURNING user_id`,
    [payload.userId, `erased+${payload.userId}@example.invalid`]
  );
  total += userRes.rowCount ?? 0;

  // Hard-delete sessions + refresh tokens so the user can't be impersonated
  // after the erasure window. Idempotent: a re-run on an already-erased
  // user is a no-op.
  const sessRes = await client.query(`DELETE FROM auth.refresh_tokens WHERE user_id = $1`, [
    payload.userId,
  ]);
  total += sessRes.rowCount ?? 0;

  // Privacy prefs no longer apply — drop the row.
  const prefsRes = await client.query(`DELETE FROM auth.user_privacy_prefs WHERE user_id = $1`, [
    payload.userId,
  ]);
  total += prefsRes.rowCount ?? 0;

  // User-role rows so the principal evaluator can no longer derive
  // permissions for them.
  const rolesRes = await client.query(`DELETE FROM auth.user_roles WHERE user_id = $1`, [
    payload.userId,
  ]);
  total += rolesRes.rowCount ?? 0;

  return total;
}
