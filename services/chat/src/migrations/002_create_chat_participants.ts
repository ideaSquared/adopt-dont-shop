import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — chat_participants.
//
// Direct port of service.backend's 00-baseline-030-chat-participants.ts.
// participant_id, rescue_id, created_by, updated_by reference auth.users
// / rescue.rescues — cross-schema, no DB FK. chat_id is intra-schema
// so the FK is enforced with CASCADE on chat deletion.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('chat_participant_role', ['rescue', 'user', 'admin', 'member']);

  pgm.createTable('chat_participants', {
    chat_participant_id: { type: 'uuid', primaryKey: true },
    chat_id: {
      type: 'uuid',
      notNull: true,
      references: 'chats(chat_id)',
      onDelete: 'CASCADE',
    },
    participant_id: { type: 'uuid', notNull: true },
    role: { type: 'chat_participant_role', notNull: true },
    rescue_id: { type: 'uuid' },
    last_read_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('chat_participants', ['chat_id', 'participant_id'], {
    unique: true,
    name: 'chat_participants_chat_id_participant_id_unique',
  });
  pgm.createIndex('chat_participants', 'participant_id', {
    name: 'chat_participants_participant_id_idx',
  });
  pgm.createIndex('chat_participants', 'role', { name: 'chat_participants_role_idx' });
  pgm.createIndex('chat_participants', 'created_by', {
    name: 'chat_participants_created_by_idx',
  });
  pgm.createIndex('chat_participants', 'updated_by', {
    name: 'chat_participants_updated_by_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('chat_participants');
  pgm.dropType('chat_participant_role');
};
