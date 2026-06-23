import type { MigrationBuilder } from 'node-pg-migrate';

// GDPR Art. 17 deletion-scheduling watermark for the admin Privacy Tools.
//
// RequestAccountDeletion deactivates the account and stamps
// deletion_scheduled_at = now() + the grace window. A downstream
// anonymisation job (out of scope for that RPC) selects rows whose
// deletion_scheduled_at has elapsed and hard-anonymises them. NULL (the
// default) means "no deletion scheduled" — the common case — so the
// column adds nothing for accounts that have never been scheduled.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('users', {
    deletion_scheduled_at: { type: 'timestamptz' },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('users', 'deletion_scheduled_at');
};
