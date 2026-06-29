import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-882: reset_token_force_flag (001_create_users.ts:52) was never read
// anywhere — the password reset flow only ever cleared it back to false.
// Dead schema with a misleading name (looks like an admin-forced-reset
// toggle but does nothing), so it's removed rather than wired up.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('users', 'reset_token_force_flag');
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('users', {
    reset_token_force_flag: { type: 'boolean', notNull: true, default: false },
  });
};
