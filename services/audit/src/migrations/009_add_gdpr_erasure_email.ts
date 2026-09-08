import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-1323 — persist the user's email on audit.gdpr_erasure_requests.
//
// gdpr.erasureRequested carries an optional `email` (resolved by the
// gateway at request time) so subscribers can erase email-keyed rows that
// carry no user_id — notably rescue pending invitations for a user who
// never registered. recordRequest() never persisted it, so when the sweep
// (gdpr-sweep.ts runGdprSweep) republishes a failed saga on retry, it
// rebuilds the payload from this table's columns alone and the retry omits
// email — a retried erasure permanently skips those email-keyed rows even
// though the original request had the email available.
//
// Nullable: not every erasure has a resolvable email (the gateway's auth
// lookup can fail — it falls through to a userId-only event rather than
// blocking the saga), and completions can arrive before the request row
// exists (see recordRequest's ON CONFLICT skeleton-insert comment).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumn('gdpr_erasure_requests', {
    email: { type: 'text' },
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropColumn('gdpr_erasure_requests', 'email');
};
