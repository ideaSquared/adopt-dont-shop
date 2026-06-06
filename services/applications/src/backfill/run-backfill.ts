// Stage D.0 backfill runner — seeds the (empty) applications event
// store from the monolith's existing applications so a future cutover
// doesn't show adopters an empty history. See ADR
// docs/adr/0002-applications-strangler-cutover.md.
//
// Invoked manually (not part of `db:migrate`) — it's a one-shot data
// migration, idempotent so it can be re-run safely:
//
//   tsx services/applications/src/backfill/run-backfill.ts
//
// It reads the monolith table FULLY-QUALIFIED as public.applications.
// This is deliberate: the connection's search_path is
// `applications, public` (see @adopt-dont-shop/db createDbClient), so an
// UNqualified `applications` would resolve to THIS service's read-model
// table, not the monolith's. The two tables share a name in different
// schemas of the same physical Postgres.
//
// Per application: synthesize the event chain, insert events with
// ON CONFLICT DO NOTHING, project the read model — all in one
// transaction so a crash mid-run leaves each application either fully
// backfilled or untouched (and a re-run finishes the rest).

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import type { PoolClient } from 'pg';

import { loadConfig } from '../config.js';

import { backfillApplication } from './backfill-event-store.js';
import { rowToInput, type MonolithApplicationRow } from './read-monolith-row.js';

// Reads the monolith applications + their answers/references, aggregated
// into the per-row shape rowToInput expects. Soft-deleted monolith rows
// (deleted_at IS NOT NULL) are EXCLUDED — paranoid deletes are not
// history an adopter should see post-cutover. See OPEN QUESTIONS in the
// PR if closed/erased applications must be carried too.
//
// answers come from public.application_answers (plan 2.1 extracted
// table); references from public.application_references. Both are
// aggregated to jsonb so each application is a single row.
const SELECT_MONOLITH_APPLICATIONS = `
  SELECT
    a.application_id,
    a.user_id,
    a.pet_id,
    a.rescue_id,
    a.status,
    a.created_at,
    a.submitted_at,
    a.reviewed_at,
    a.decision_at,
    a.actioned_by,
    a.rejection_reason,
    a.withdrawal_reason,
    (
      SELECT jsonb_object_agg(ans.question_key, ans.answer_value)
      FROM public.application_answers ans
      WHERE ans.application_id = a.application_id
    ) AS answers,
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'name', ref.name,
                 'email', ref.email,
                 'relationship', ref.relationship
               )
               ORDER BY ref.order_index
             )
      FROM public.application_references ref
      WHERE ref.application_id = a.application_id
    ) AS references
  FROM public.applications a
  WHERE a.deleted_at IS NULL
  ORDER BY a.created_at ASC
`;

type RunSummary = {
  applicationsProcessed: number;
  eventsInserted: number;
  skipped: number;
};

// Process one application in its own transaction. Returns the per-row
// outcome, or null when the row was skipped (unmappable status) — the
// status surprise is logged and the run continues rather than aborting
// the whole backfill on one bad row.
async function processRow(
  client: PoolClient,
  row: MonolithApplicationRow,
  logger: ReturnType<typeof createLogger>
): Promise<number | null> {
  let input;
  try {
    input = rowToInput(row);
  } catch (err) {
    logger.warn('skipping application with unmappable status', {
      applicationId: row.application_id,
      status: row.status,
      err,
    });
    return null;
  }

  await client.query('BEGIN');
  try {
    const outcome = await backfillApplication(client, input);
    await client.query('COMMIT');
    return outcome.insertedEvents;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

export async function runBackfill(
  pool: ReturnType<typeof createDbClient>,
  logger: ReturnType<typeof createLogger>
): Promise<RunSummary> {
  const { rows } = await pool.query<MonolithApplicationRow>(SELECT_MONOLITH_APPLICATIONS);
  logger.info('backfill: monolith applications read', { count: rows.length });

  const summary: RunSummary = { applicationsProcessed: 0, eventsInserted: 0, skipped: 0 };

  const client = await pool.connect();
  try {
    for (const row of rows) {
      const inserted = await processRow(client, row, logger);
      if (inserted === null) {
        summary.skipped += 1;
        continue;
      }
      summary.applicationsProcessed += 1;
      summary.eventsInserted += inserted;
    }
  } finally {
    client.release();
  }

  return summary;
}

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.applications.backfill' });
  let pool: ReturnType<typeof createDbClient> | undefined;
  // The backfill does NOT publish NATS events — downstream consumers
  // (notifications) must not re-fire for historical applications. We
  // intentionally never connect to NATS here.

  try {
    const config = loadConfig();
    pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });

    logger.info('backfill: starting', { schema: config.schema });
    const summary = await runBackfill(pool, logger);
    logger.info('backfill: complete', summary);
  } catch (err) {
    logger.error('backfill: failed', { err });
    process.exitCode = 1;
  } finally {
    try {
      await pool?.end();
    } catch {
      // best-effort
    }
  }
};

// Only run when invoked directly (tsx run-backfill.ts), not when
// imported by tests.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
