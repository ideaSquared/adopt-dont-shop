import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — chats.
//
// Direct port of service.backend's 00-baseline-029-chats.ts INTO the
// `chat` schema, with 09-add-chats-assigned-to.ts folded in (the
// `assigned_to` column ships in the baseline now, matching the
// monolith's CURRENT state). Cross-schema FK targets (application_id
// in applications.*, rescue_id in rescue.*, pet_id in pets.*,
// assigned_to / created_by / updated_by in auth.users) are
// deliberately omitted — schema-per-service rule keeps them
// application-side over gRPC, no DB REFERENCES.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('chat_status', ['active', 'locked', 'archived']);

  pgm.createTable('chats', {
    chat_id: { type: 'uuid', primaryKey: true },
    application_id: { type: 'uuid' },
    rescue_id: { type: 'uuid', notNull: true },
    pet_id: { type: 'uuid' },
    status: { type: 'chat_status', notNull: true, default: 'active' },
    assigned_to: { type: 'uuid' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('chats', 'application_id', { name: 'chats_application_id_idx' });
  pgm.createIndex('chats', 'rescue_id', { name: 'chats_rescue_id_idx' });
  pgm.createIndex('chats', 'pet_id', { name: 'chats_pet_id_idx' });
  pgm.createIndex('chats', 'status', { name: 'chats_status_idx' });
  pgm.createIndex('chats', 'assigned_to', { name: 'chats_assigned_to_idx' });
  pgm.createIndex('chats', 'created_by', { name: 'chats_created_by_idx' });
  pgm.createIndex('chats', 'updated_by', { name: 'chats_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('chats');
  pgm.dropType('chat_status');
};
