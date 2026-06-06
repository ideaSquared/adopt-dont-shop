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

// Upsert by (user_id, device_token). The partial unique index
// `device_tokens_user_token_unique` enforces the uniqueness while
// permitting historical soft-deleted rows.
//
// Returns the row + a flag indicating whether the registration was
// new (false → call refreshed an existing row's last_used_at).
export const registerDeviceToken = async (
  conn: DbConn,
  input: RegisterDeviceTokenInput
): Promise<{ row: DeviceTokenRow; alreadyRegistered: boolean }> => {
  // Look up first so we can report alreadyRegistered accurately.
  const existing = await conn.query<DeviceTokenRow>(
    `
    SELECT * FROM device_tokens
    WHERE user_id = $1 AND device_token = $2 AND deleted_at IS NULL
    LIMIT 1
    `,
    [input.userId, input.deviceToken]
  );

  if (existing.rows[0]) {
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
        existing.rows[0].token_id,
        input.appVersion ?? null,
        input.deviceInfo ? JSON.stringify(input.deviceInfo) : null,
        input.platform,
      ]
    );
    return { row: refreshed.rows[0], alreadyRegistered: true };
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
  return { row: inserted.rows[0], alreadyRegistered: false };
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
