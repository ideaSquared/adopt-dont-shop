// Email-queue retention purge (ADS-1320).
//
// services/notifications/src/migrations/004_create_email_queue.ts documents
// "the retention job hard-deletes terminal rows after a configurable
// horizon" but no such job existed — sent rows accumulated forever. This
// job is that purge: it deletes rows whose `sent_at` is older than the
// configured retention window (default: 1 year, matching docs/PRIVACY.md's
// documented retention period for EmailQueue).
//
// Deletes in bounded batches, each its own withTransaction commit, so a
// large backlog never holds one long-running transaction or lock. Publishes
// one notifications.actionTaken summary event per run (only when rows were
// actually deleted) — see the audit-logging skill.

import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';

import { runSummaryActionTaken } from './run-summary-audit.js';

export type EmailQueueRetentionOptions = {
  // Age (in days) a sent row must reach before it's purged.
  retentionDays: number;
  // Max rows deleted per transaction. Bounds lock/transaction duration.
  batchSize: number;
};

export type EmailQueueRetentionResult = {
  deletedCount: number;
};

export async function purgeSentEmailQueue(
  deps: WithTransactionDeps,
  opts: EmailQueueRetentionOptions
): Promise<EmailQueueRetentionResult> {
  let deletedCount = 0;

  for (;;) {
    const batchDeleted = await withTransaction(deps, async ({ client, publish }) => {
      const { rows } = await client.query<{ email_id: string }>(
        `DELETE FROM email_queue
         WHERE email_id IN (
           SELECT email_id FROM email_queue
           WHERE sent_at IS NOT NULL AND sent_at < now() - ($1 || ' days')::interval
           ORDER BY sent_at
           LIMIT $2
         )
         RETURNING email_id`,
        [opts.retentionDays, opts.batchSize]
      );
      deletedCount += rows.length;
      const isLastBatch = rows.length < opts.batchSize;

      // Attach the summary event to the final batch's commit — a run that
      // deleted nothing publishes nothing (no audit noise for a no-op tick).
      if (isLastBatch && deletedCount > 0) {
        publish(
          runSummaryActionTaken({
            aggregateType: 'email_queue',
            action: 'retention_purge',
            details: { deletedCount, retentionDays: opts.retentionDays },
          })
        );
      }

      return rows.length;
    });

    if (batchDeleted < opts.batchSize) {
      break;
    }
  }

  return { deletedCount };
}
