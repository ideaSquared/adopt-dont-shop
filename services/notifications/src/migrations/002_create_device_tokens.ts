import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — device_tokens.
//
// Direct port of service.backend's 00-baseline-036-device-tokens.ts.
// `DeviceToken` does NOT use the monolith's `withAuditHooks` decorator,
// so no created_by / updated_by / version columns. Paranoid (deleted_at)
// still on.
//
// The unique partial index `device_tokens_user_token_unique` enforces
// "one active token per user+device_token" while permitting historical
// soft-deleted rows.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('device_token_platform', ['ios', 'android', 'web']);
  pgm.createType('device_token_status', ['active', 'inactive', 'expired', 'invalid']);

  pgm.createTable('device_tokens', {
    token_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid', notNull: true },
    device_token: { type: 'text', notNull: true },
    platform: { type: 'device_token_platform', notNull: true },
    app_version: { type: 'varchar(50)' },
    device_info: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    status: { type: 'device_token_status', notNull: true, default: 'active' },
    last_used_at: { type: 'timestamptz' },
    expires_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('device_tokens', 'user_id', { name: 'device_tokens_user_id_idx' });
  pgm.createIndex('device_tokens', 'device_token', { name: 'device_tokens_token_idx' });
  pgm.createIndex('device_tokens', 'platform', { name: 'device_tokens_platform_idx' });
  pgm.createIndex('device_tokens', 'status', { name: 'device_tokens_status_idx' });
  pgm.createIndex('device_tokens', 'last_used_at', { name: 'device_tokens_last_used_idx' });
  pgm.createIndex('device_tokens', 'expires_at', { name: 'device_tokens_expires_idx' });
  // Partial unique index — one active token per (user, device_token);
  // historical soft-deleted rows are permitted (deleted_at IS NOT NULL
  // does not collide with this constraint).
  pgm.createIndex('device_tokens', ['user_id', 'device_token'], {
    name: 'device_tokens_user_token_unique',
    unique: true,
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('device_tokens', 'deleted_at', { name: 'device_tokens_deleted_at_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('device_tokens');
  pgm.dropType('device_token_status');
  pgm.dropType('device_token_platform');
};
