import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — event_attendees.
//
// Tracks registrations and check-ins for events with registration
// enabled. user_id is a cross-schema pointer to auth.users (FK-free,
// audit-pointer convention). The unique constraint on (event_id,
// user_id) prevents double-registrations.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('event_attendees', {
    attendee_id: { type: 'uuid', primaryKey: true },
    event_id: {
      type: 'uuid',
      notNull: true,
      references: 'events(event_id)',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    email: { type: 'varchar(255)', notNull: true },
    registered_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    checked_in: { type: 'boolean', notNull: true, default: false },
    checked_in_at: { type: 'timestamptz' },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('event_attendees', 'event_id', { name: 'event_attendees_event_id_idx' });
  pgm.createIndex('event_attendees', 'user_id', { name: 'event_attendees_user_id_idx' });
  pgm.createIndex('event_attendees', ['event_id', 'user_id'], {
    name: 'event_attendees_unique_user_per_event',
    unique: true,
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('event_attendees');
};
