import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — refresh_tokens.
//
// Direct port of service.backend's 00-baseline-006-refresh-tokens.ts.
// family_id groups a rotation chain; replaced_by_token_id is a soft
// pointer to the next row (no DB FK in the monolith, so none here).
// user_id is an intra-schema FK to users.user_id.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('refresh_tokens', {
    token_id: { type: 'uuid', primaryKey: true },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    family_id: { type: 'varchar(255)', notNull: true },
    is_revoked: { type: 'boolean', notNull: true, default: false },
    expires_at: { type: 'timestamptz', notNull: true },
    replaced_by_token_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('refresh_tokens', 'user_id', { name: 'refresh_tokens_user_id_idx' });
  pgm.createIndex('refresh_tokens', 'family_id', { name: 'refresh_tokens_family_id_idx' });
  pgm.createIndex('refresh_tokens', 'is_revoked', { name: 'refresh_tokens_is_revoked_idx' });
  pgm.createIndex('refresh_tokens', 'expires_at', { name: 'refresh_tokens_expires_at_idx' });
  pgm.createIndex('refresh_tokens', ['user_id', 'family_id'], {
    name: 'refresh_tokens_user_family_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('refresh_tokens');
};
