import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-1054: auth.users.email carried two identical unique btree indexes.
// The column-level `unique: true` in 001_create_users.ts already backs the
// email uniqueness with the constraint index `users_email_key`; the explicit
// `createIndex('users', 'email', { name: 'users_email_unique', unique: true })`
// on the same single `email` column duplicated it exactly (same column, same
// uniqueness, same method). Drop the redundant standalone index — the column
// constraint (`users_email_key`) still enforces uniqueness.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('users', 'email', { name: 'users_email_unique' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('users', 'email', { name: 'users_email_unique', unique: true });
};
