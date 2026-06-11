import type { MigrationBuilder } from 'node-pg-migrate';

// Align user_roles with the assignRole handler.
//
// 005 ported the monolith's bare junction table (user_id, role_id,
// created_at, updated_at), but the assignRole handler INSERTs
// assigned_by / assigned_at / expires_at to record who granted the role
// and when. Same class of schema/SQL drift as 010 — the pool-mocked
// tests can't see undefined columns, only a real database can.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('user_roles', {
    assigned_by: { type: 'uuid' },
    assigned_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz' },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumns('user_roles', ['assigned_by', 'assigned_at', 'expires_at']);
};
