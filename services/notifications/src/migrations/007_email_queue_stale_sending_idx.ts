import type { MigrationBuilder } from 'node-pg-migrate';

// Partial index supporting the email-queue worker's stale-'sending'
// reclaim predicate.
//
// claimDueEmails (src/email/queue.ts) was extended to also pick up rows
// orphaned in status='sending' by a crashed worker, filtered on
// `status = 'sending' AND last_attempt_at <= now() - <stale interval>`.
// Without an index that branch sequentially scans the queue every poll.
// A partial index over last_attempt_at, restricted to status='sending',
// keeps the reclaim sweep cheap and is tiny in steady state (rows are
// only transiently 'sending').

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('email_queue', 'last_attempt_at', {
    name: 'email_queue_stale_sending_idx',
    where: "status = 'sending'",
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('email_queue', 'last_attempt_at', {
    name: 'email_queue_stale_sending_idx',
  });
};
