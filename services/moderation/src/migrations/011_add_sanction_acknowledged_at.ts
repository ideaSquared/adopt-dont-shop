import type { MigrationBuilder } from 'node-pg-migrate';

// Add user_sanctions.acknowledged_at — set when the sanctioned user
// dismisses the in-app banner (GET /api/v1/auth/sanctions/active filters
// on it being null so dismissed sanctions stay gone). Nullable: existing
// rows are treated as unacknowledged. The partial index backs the
// active-and-unacknowledged banner query.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('user_sanctions', {
    acknowledged_at: { type: 'timestamptz' },
  });
  pgm.createIndex('user_sanctions', ['user_id'], {
    name: 'user_sanctions_user_unacknowledged_idx',
    where: 'is_active = true AND acknowledged_at IS NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('user_sanctions', ['user_id'], {
    name: 'user_sanctions_user_unacknowledged_idx',
  });
  pgm.dropColumn('user_sanctions', 'acknowledged_at');
};
