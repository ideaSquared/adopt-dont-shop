import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — revoked_tokens.
//
// Direct port of service.backend's 00-baseline-007-revoked-tokens.ts.
// Access-token denylist keyed by `jti` (the JWT ID claim). `revoked_at`
// acts as createdAt; `updated_at` is present (the monolith's migration
// 14 added it, folded in here). `user_id` is a STRING here, not a UUID
// FK — the monolith stores it as a plain string and there's no DB-level
// FK, so the port keeps it loose (a revoked token may outlive its user
// row, which is the point of a denylist).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('revoked_tokens', {
    jti: { type: 'varchar(255)', primaryKey: true },
    user_id: { type: 'varchar(255)', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('revoked_tokens', 'expires_at', { name: 'revoked_tokens_expires_at_idx' });
  pgm.createIndex('revoked_tokens', 'user_id', { name: 'revoked_tokens_user_id_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('revoked_tokens');
};
