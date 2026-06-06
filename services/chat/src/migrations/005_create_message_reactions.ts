import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — message_reactions.
//
// Direct port of service.backend's 00-baseline-032-message-reactions.ts.
// No deleted_at — reactions are hard-deleted in the monolith
// (paranoid: false on the model). message_id FK is intra-schema and
// CASCADEs on message deletion; user_id is a soft pointer to
// auth.users.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('message_reactions', {
    reaction_id: { type: 'uuid', primaryKey: true },
    message_id: {
      type: 'uuid',
      notNull: true,
      references: 'messages(message_id)',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', notNull: true },
    emoji: { type: 'varchar(32)', notNull: true },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('message_reactions', ['message_id', 'user_id', 'emoji'], {
    unique: true,
    name: 'message_reactions_message_user_emoji_unique',
  });
  pgm.createIndex('message_reactions', 'user_id', { name: 'message_reactions_user_id_idx' });
  pgm.createIndex('message_reactions', 'created_by', {
    name: 'message_reactions_created_by_idx',
  });
  pgm.createIndex('message_reactions', 'updated_by', {
    name: 'message_reactions_updated_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('message_reactions');
};
