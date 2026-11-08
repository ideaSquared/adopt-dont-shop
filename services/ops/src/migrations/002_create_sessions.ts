import type { MigrationBuilder } from 'node-pg-migrate';

// ops.sessions — bearer sessions handed to the CLI after login. Only the
// sha256 of the token is stored, so a database read cannot be replayed as a
// session.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('sessions', {
    session_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(operator_id)',
      onDelete: 'CASCADE',
    },
    token_hash: { type: 'char(64)', notNull: true, unique: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
  });
  pgm.createIndex('sessions', 'operator_id', { name: 'sessions_operator_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('sessions');
};
