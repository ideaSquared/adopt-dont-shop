// Application-drafts retention purge (ADS-1320).
//
// services/applications/src/migrations/007_create_application_drafts.ts
// documented "a daily cron eventually deletes rows where expires_at <
// now()" but no such job existed — drafts past their 30-day TTL
// (application-draft-handlers.ts stamps `expires_at = now() + interval '30
// days'` on every upsert) accumulated forever. This job is that purge.
//
// Deletes in bounded batches, each its own withTransaction commit, so a
// large backlog never holds one long-running transaction or lock. Publishes
// one applications.actionTaken summary event per run (only when rows were
// actually deleted) rather than one per row — see the audit-logging skill.

import { randomUUID } from 'node:crypto';

import { withTransaction } from '@adopt-dont-shop/events';

import type { HandlerDeps } from '../grpc/adapter.js';

export type ApplicationDraftRetentionOptions = {
  // Max rows deleted per transaction. Bounds lock/transaction duration.
  batchSize: number;
};

export type ApplicationDraftRetentionResult = {
  deletedCount: number;
};

export async function purgeExpiredApplicationDrafts(
  deps: HandlerDeps,
  opts: ApplicationDraftRetentionOptions
): Promise<ApplicationDraftRetentionResult> {
  let deletedCount = 0;

  for (;;) {
    const batchDeleted = await withTransaction(deps, async ({ client, publish }) => {
      const { rows } = await client.query<{ draft_id: string }>(
        `DELETE FROM application_drafts
         WHERE draft_id IN (
           SELECT draft_id FROM application_drafts
           WHERE expires_at IS NOT NULL AND expires_at < now()
           ORDER BY expires_at
           LIMIT $1
         )
         RETURNING draft_id`,
        [opts.batchSize]
      );
      deletedCount += rows.length;
      const isLastBatch = rows.length < opts.batchSize;

      // Attach the summary event to the final batch's commit — a run that
      // deleted nothing publishes nothing (no audit noise for a no-op tick).
      if (isLastBatch && deletedCount > 0) {
        publish({
          type: 'applications.actionTaken',
          id: `applications.actionTaken.draftRetentionPurge.${Date.now()}`,
          payload: {
            service: 'service.applications',
            subject: 'applications.actionTaken',
            aggregateType: 'application_draft',
            // Synthetic per-run id — audit_events.aggregate_id is a uuid
            // column and there is no single row this bulk purge maps to.
            aggregateId: randomUUID(),
            action: 'retention_purge',
            details: { deletedCount },
          },
        });
      }

      return rows.length;
    });

    if (batchDeleted < opts.batchSize) {
      break;
    }
  }

  return { deletedCount };
}
