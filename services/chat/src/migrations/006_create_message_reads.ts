import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — message_reads.
//
// Direct port of service.backend's 00-baseline-033-message-reads.ts.
// (message_id, user_id) UNIQUE — at most one read receipt per
// (message, user). message_id FK is intra-schema and CASCADEs on
// message deletion; user_id is a soft pointer to auth.users.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('message_reads', {
    read_id: { type: 'uuid', primaryKey: true },
    message_id: {
      type: 'uuid',
      notNull: true,
      references: 'messages(message_id)',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', notNull: true },
    read_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('message_reads', ['message_id', 'user_id'], {
    unique: true,
    name: 'message_reads_message_user_unique',
  });
  pgm.createIndex('message_reads', 'user_id', { name: 'message_reads_user_id_idx' });
  pgm.createIndex('message_reads', 'created_by', { name: 'message_reads_created_by_idx' });
  pgm.createIndex('message_reads', 'updated_by', { name: 'message_reads_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('message_reads');
};
