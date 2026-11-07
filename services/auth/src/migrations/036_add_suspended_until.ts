import type { MigrationBuilder } from 'node-pg-migrate';

// End time of a timed suspension.
//
// ApplyUserSanction sets suspended_until from the moderation action's
// expires_at; NULL means the suspension is indefinite (or the user is not
// suspended). A scheduled job and the login path reactivate users whose
// suspended_until has passed (see src/grpc/suspension-expiry.ts).
//
// The partial index keeps the job's due-lookup cheap: it only covers the few
// currently-suspended users that actually have an end time.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('users', {
    suspended_until: { type: 'timestamptz' },
  });
  pgm.createIndex('users', 'suspended_until', {
    name: 'users_suspended_until_idx',
    where: "status = 'suspended' AND suspended_until IS NOT NULL",
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('users', 'suspended_until', { name: 'users_suspended_until_idx' });
  pgm.dropColumn('users', 'suspended_until');
};
