// Device-token persistence. The RPCs are thin wrappers around these
// helpers; the worker uses `listActiveTokensForUser` to fan a push
// notification out to every device the recipient registered.

import { randomUUID } from 'node:crypto';

import type { DbConn } from '../email/queue.js';

import type { DevicePlatform, DeviceTokenStatus } from './types.js';

export type DeviceTokenRow = {
  token_id: string;
  user_id: string;
  device_token: string;
  platform: DevicePlatform;
  app_version: string | null;
  device_info: Record<string, unknown>;
  status: DeviceTokenStatus;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type RegisterDeviceTokenInput = {
  userId: string;
  deviceToken: string;
  platform: DevicePlatform;
  appVersion?: string | null;
  deviceInfo?: Record<string, unknown>;
};

// Register a device token under `input.userId`, treating the token as
// globally unique to a single active mapping (ADS-1010).
//
// The lookup keys on `device_token` alone, not `(user_id, device_token)`, so a
// token already active under a DIFFERENT user is detected. A device genuinely
// changing hands is the common legitimate case, so the prior mapping is
// soft-deleted (transferred) rather than left to duplicate — a duplicate would
// let one physical device receive two users' notifications and survive the
// prior owner's GDPR erasure. `device_tokens_active_token_unique` enforces the
// single-active-mapping invariant at the database level.
//
// Returns the row, an `alreadyRegistered` flag (true → the same user's row was
// refreshed in place), and `replacedUserId` when a different user's mapping was
// taken over (so the caller can audit the transfer). Run inside a transaction:
// the takeover is a soft-delete followed by an insert.
export const registerDeviceToken = async (
  conn: DbConn,
  input: RegisterDeviceTokenInput
): Promise<{ row: DeviceTokenRow; alreadyRegistered: boolean; replacedUserId?: string }> => {
  // Serialise concurrent registrations of the SAME token so the
  // lookup → (soft-delete) → insert sequence can't race two callers into a
  // unique-violation against device_tokens_active_token_unique. Transaction-
  // scoped, so the lock releases on commit/rollback; keyed on a hash of the
  // token so it only contends per device_token, not globally. Requires the
  // caller to run this inside a transaction (registerDeviceTokenHandler does).
  await conn.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [input.deviceToken]);

  // Look up by device_token alone so a token owned by another user is seen.
  const existing = await conn.query<DeviceTokenRow>(
    `
    SELECT * FROM device_tokens
    WHERE device_token = $1 AND deleted_at IS NULL
    LIMIT 1
    `,
    [input.deviceToken]
  );
  const current = existing.rows[0];

  // Same user re-registering their own token → refresh in place (normal path,
  // unchanged behaviour, alreadyRegistered = true).
  if (current && current.user_id === input.userId) {
    const refreshed = await conn.query<DeviceTokenRow>(
      `
      UPDATE device_tokens
      SET app_version = COALESCE($2, app_version),
          device_info = COALESCE($3::jsonb, device_info),
          platform    = $4,
          status      = 'active',
          last_used_at = now(),
          updated_at  = now()
      WHERE token_id = $1
      RETURNING *
      `,
      [
        current.token_id,
        input.appVersion ?? null,
        input.deviceInfo ? JSON.stringify(input.deviceInfo) : null,
        input.platform,
      ]
    );
    return { row: refreshed.rows[0], alreadyRegistered: true };
  }

  // Token currently mapped to a DIFFERENT user → transfer it: soft-delete the
  // prior mapping so at most one active row per device_token survives.
  let replacedUserId: string | undefined;
  if (current) {
    await conn.query(
      `
      UPDATE device_tokens
      SET status     = 'inactive',
          deleted_at = COALESCE(deleted_at, now()),
          updated_at = now()
      WHERE token_id = $1
      `,
      [current.token_id]
    );
    replacedUserId = current.user_id;
  }

  const inserted = await conn.query<DeviceTokenRow>(
    `
    INSERT INTO device_tokens (
      token_id, user_id, device_token, platform,
      app_version, device_info, status,
      last_used_at, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4,
      $5, $6::jsonb, 'active',
      now(), now(), now()
    )
    RETURNING *
    `,
    [
      randomUUID(),
      input.userId,
      input.deviceToken,
      input.platform,
      input.appVersion ?? null,
      JSON.stringify(input.deviceInfo ?? {}),
    ]
  );
  return { row: inserted.rows[0], alreadyRegistered: false, replacedUserId };
};

// Soft-delete by token_id. Idempotent — a second call returns the
// already-deleted row.
export const unregisterDeviceToken = async (
  conn: DbConn,
  tokenId: string
): Promise<DeviceTokenRow | null> => {
  const res = await conn.query<DeviceTokenRow>(
    `
    UPDATE device_tokens
    SET status     = 'inactive',
        deleted_at = COALESCE(deleted_at, now()),
        updated_at = now()
    WHERE token_id = $1
    RETURNING *
    `,
    [tokenId]
  );
  return res.rows[0] ?? null;
};

export const getDeviceTokenById = async (
  conn: DbConn,
  tokenId: string
): Promise<DeviceTokenRow | null> => {
  const res = await conn.query<DeviceTokenRow>(
    `SELECT * FROM device_tokens WHERE token_id = $1 LIMIT 1`,
    [tokenId]
  );
  return res.rows[0] ?? null;
};

export const listDeviceTokensForUser = async (
  conn: DbConn,
  userId: string,
  includeInactive: boolean
): Promise<DeviceTokenRow[]> => {
  const res = await conn.query<DeviceTokenRow>(
    `
    SELECT * FROM device_tokens
    WHERE user_id = $1
      ${includeInactive ? '' : "AND deleted_at IS NULL AND status = 'active'"}
    ORDER BY created_at DESC
    `,
    [userId]
  );
  return res.rows;
};

// Mark a token invalid — called by the push worker when the provider
// reports the token is permanently rejected (FCM NotRegistered etc.).
export const markDeviceTokenInvalid = async (
  conn: DbConn,
  tokenId: string,
  reason: string
): Promise<void> => {
  await conn.query(
    `
    UPDATE device_tokens
    SET status     = 'invalid',
        device_info = jsonb_set(
          COALESCE(device_info, '{}'::jsonb),
          '{lastFailureReason}',
          to_jsonb($2::text),
          true
        ),
        updated_at = now()
    WHERE token_id = $1
    `,
    [tokenId, reason]
  );
};
