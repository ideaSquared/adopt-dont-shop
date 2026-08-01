import type { MigrationBuilder } from 'node-pg-migrate';

// Enforce that a device token maps to at most one ACTIVE user (ADS-1010).
//
// Registration previously keyed uniqueness on (user_id, device_token), so the
// same physical device token could be active under two users at once — one
// user's notifications would then reach another user's device, and the mapping
// survived the prior owner's GDPR erasure. registerDeviceToken now transfers a
// token between users instead of duplicating it; this migration backs that with
// a database-level invariant.
//
// 1. Dedupe any pre-existing active duplicates: for each device_token with
//    more than one active (deleted_at IS NULL) row, keep the most recently
//    created row and soft-delete the rest, so the unique index can be built.
// 2. Add a partial unique index on device_token WHERE deleted_at IS NULL.
//    (The older (user_id, device_token) partial unique index is left in place —
//    it is subsumed by this stricter one but harmless.)

const ACTIVE_TOKEN_UNIQUE_INDEX = 'device_tokens_active_token_unique';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // Soft-delete every active duplicate except the newest per device_token.
  // Tie-break on token_id so the choice is deterministic when created_at ties.
  pgm.sql(`
    UPDATE device_tokens dt
    SET status     = 'inactive',
        deleted_at = now(),
        updated_at = now()
    WHERE dt.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM device_tokens newer
        WHERE newer.device_token = dt.device_token
          AND newer.deleted_at IS NULL
          AND (
            newer.created_at > dt.created_at
            OR (newer.created_at = dt.created_at AND newer.token_id > dt.token_id)
          )
      )
  `);

  pgm.createIndex('device_tokens', 'device_token', {
    name: ACTIVE_TOKEN_UNIQUE_INDEX,
    unique: true,
    where: 'deleted_at IS NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // Drop only the index — the dedupe soft-deletes are not reversible (and
  // reinstating duplicate active mappings would be a regression, not a fix).
  pgm.dropIndex('device_tokens', 'device_token', { name: ACTIVE_TOKEN_UNIQUE_INDEX });
};
