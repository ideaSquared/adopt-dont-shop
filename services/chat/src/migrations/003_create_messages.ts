import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — messages.
//
// Direct port of service.backend's 00-baseline-031-messages.ts. Moderation
// columns (is_flagged / flag_reason / flag_severity / moderation_status /
// flagged_at) are carried verbatim — the monolith ships them on Message
// and services/moderation (Phase 8) reads them via gRPC. chat_id FK is
// intra-schema and CASCADEs on chat deletion; sender_id is a soft pointer
// into auth.users.
//
// Full-text search: the search_vector column is TSVECTOR + GIN index here.
// The BEFORE INSERT/UPDATE trigger that maintains it ships in the next
// migration (004_install_messages_search_vector_trigger.ts) so the
// model's afterSync hook (`installGeneratedSearchVector`) becomes
// unnecessary for this service — the DB owns the invariant.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('message_content_format', ['plain', 'markdown', 'html']);
  pgm.createType('message_flag_severity', ['low', 'medium', 'high', 'critical']);
  pgm.createType('message_moderation_status', ['pending_review', 'approved', 'rejected']);

  pgm.createTable('messages', {
    message_id: { type: 'uuid', primaryKey: true },
    chat_id: {
      type: 'uuid',
      notNull: true,
      references: 'chats(chat_id)',
      onDelete: 'CASCADE',
    },
    sender_id: { type: 'uuid', notNull: true },
    content: { type: 'text', notNull: true },
    content_format: {
      type: 'message_content_format',
      notNull: true,
      default: 'plain',
    },
    attachments: { type: 'jsonb', notNull: true, default: pgm.func(`'[]'::jsonb`) },
    search_vector: { type: 'tsvector' },
    is_flagged: { type: 'boolean', notNull: true, default: false },
    flag_reason: { type: 'varchar(255)' },
    flag_severity: { type: 'message_flag_severity' },
    moderation_status: { type: 'message_moderation_status' },
    flagged_at: { type: 'timestamptz' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('messages', 'chat_id', { name: 'messages_chat_id_idx' });
  pgm.createIndex('messages', 'sender_id', { name: 'messages_sender_id_idx' });
  pgm.createIndex('messages', 'created_at', { name: 'messages_created_at_idx' });
  pgm.createIndex('messages', 'search_vector', {
    method: 'gin',
    name: 'messages_search_vector_gin_idx',
  });
  // Compound idx for chat-window pagination: load latest N messages for
  // a chat ordered by recency. Mirrors the monolith's
  // messages_chat_created_idx.
  pgm.sql('CREATE INDEX messages_chat_created_idx ON messages (chat_id, created_at DESC);');
  pgm.createIndex('messages', 'created_by', { name: 'messages_created_by_idx' });
  pgm.createIndex('messages', 'updated_by', { name: 'messages_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('messages');
  pgm.dropType('message_content_format');
  pgm.dropType('message_flag_severity');
  pgm.dropType('message_moderation_status');
};
