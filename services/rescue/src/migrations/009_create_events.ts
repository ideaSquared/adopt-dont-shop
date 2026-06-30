import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — events.
//
// Events are rescue-owned: each event belongs to exactly one rescue
// (rescue_id FK → rescues with CASCADE delete). featured_pets and
// assigned_staff are stored as UUID arrays so the rescue vertical
// doesn't need cross-schema FK joins to service.pets / service.auth.
// location rides as a JSONB blob (type + optional address/city/postcode
// for physical; virtualLink for virtual) matching the EventLocation TS
// type in apps/rescue/src/types/events.ts.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('event_type', ['adoption', 'fundraising', 'volunteer', 'community']);
  pgm.createType('event_status', ['draft', 'published', 'in_progress', 'completed', 'cancelled']);

  pgm.createTable('events', {
    event_id: { type: 'uuid', primaryKey: true },
    rescue_id: {
      type: 'uuid',
      notNull: true,
      references: 'rescues(rescue_id)',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text', notNull: true, default: '' },
    type: { type: 'event_type', notNull: true },
    start_date: { type: 'timestamptz', notNull: true },
    end_date: { type: 'timestamptz', notNull: true },
    location: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    capacity: { type: 'integer' },
    registration_required: { type: 'boolean', notNull: true, default: false },
    status: { type: 'event_status', notNull: true, default: 'draft' },
    featured_pets: { type: 'uuid[]', notNull: true, default: pgm.func("'{}'::uuid[]") },
    assigned_staff: { type: 'uuid[]', notNull: true, default: pgm.func("'{}'::uuid[]") },
    is_public: { type: 'boolean', notNull: true, default: true },
    image_url: { type: 'text' },
    current_attendance: { type: 'integer', notNull: true, default: 0 },
    created_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('events', 'rescue_id', { name: 'events_rescue_id_idx' });
  pgm.createIndex('events', 'status', { name: 'events_status_idx' });
  pgm.createIndex('events', 'type', { name: 'events_type_idx' });
  pgm.createIndex('events', 'start_date', { name: 'events_start_date_idx' });
  pgm.createIndex('events', 'deleted_at', { name: 'events_deleted_at_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('events');
  pgm.dropType('event_status');
  pgm.dropType('event_type');
};
