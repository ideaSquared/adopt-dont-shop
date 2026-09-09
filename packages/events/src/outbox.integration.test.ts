// Real-Postgres integration coverage for the transactional-outbox
// publish-after-commit semantics (ADS-1315).
//
// publish.test.ts / outbox.test.ts already cover this logic against a mocked
// `pg.Pool` — but a mock can only assert "the mock's .query was called with
// BEGIN/COMMIT/ROLLBACK", not that a rollback actually undid a write. This
// suite runs the same code against a real, migrated, throwaway schema so the
// three failure/success modes documented on `withTransaction` are proven
// against real transaction semantics:
//   1. Commit path: the business write persists, the event is delivered, and
//      the outbox row is deleted (self-cleaning queue).
//   2. Business-fn throws: neither the write nor the outbox row exist —
//      a real ROLLBACK, not a mocked one.
//   3. Inline delivery fails: the business write still commits and the event
//      stays durably queued in the outbox for the relay — proven by reading
//      the row back from Postgres after the call returns.
//
// Skipped (not silently passed) when DATABASE_URL isn't set — see
// docs/testing.md for how to run these locally and in CI.
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { makeNatsDouble, withTestDatabase } from '@adopt-dont-shop/test-utils';

import { withTransaction } from './publish.js';
import { OUTBOX_TABLE } from './outbox-schema.js';

// node-pg-migrate needs a real migrations directory on disk. A migration
// file that RE-EXPORTS outbox-schema.ts's up/down (what every real
// consuming service's own migration does — see e.g.
// services/auth/src/migrations/030_create_event_outbox.ts) would seem
// cleanest, but this test file's own `withTransaction` import already
// loads outbox-schema.ts as part of this process's module graph (via
// ./publish.js → ./outbox.js → ./outbox-schema.js); node-pg-migrate loading
// a second reference to that same already-loaded ES module from its dynamic
// migration loader throws "Cannot require() ES Module ... in a cycle" under
// the tsx loader withTestDatabase registers. So this DDL is duplicated
// (self-contained, no imports back into this package) rather than
// re-exported — keep it in sync with outbox-schema.ts's `up`/`down` if that
// schema ever changes.
function writeOutboxMigrationsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'events-outbox-migrations-'));
  writeFileSync(
    join(dir, '001_create_event_outbox.ts'),
    `import type { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable(${JSON.stringify(OUTBOX_TABLE)}, {
    outbox_id: { type: 'uuid', primaryKey: true },
    seq: { type: 'bigserial', notNull: true },
    event_id: { type: 'text' },
    subject: { type: 'text', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    occurred_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    attempts: { type: 'integer', notNull: true, default: 0 },
    last_attempt_at: { type: 'timestamptz' },
    last_error: { type: 'text' },
  });
  pgm.createIndex(${JSON.stringify(OUTBOX_TABLE)}, 'seq', { name: 'event_outbox_seq_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable(${JSON.stringify(OUTBOX_TABLE)});
};
`
  );
  return dir;
}

describe.skipIf(!process.env.DATABASE_URL)(
  'withTransaction — transactional outbox publish-after-commit semantics (real Postgres)',
  () => {
    it('commits the business write, delivers the event inline, and self-cleans the outbox row', async () => {
      await withTestDatabase(
        { schemaPrefix: 'events_outbox', migrationsDir: writeOutboxMigrationsDir() },
        async pool => {
          await pool.query('CREATE TABLE widgets (id uuid PRIMARY KEY, name text NOT NULL)');
          const nats = makeNatsDouble();
          const widgetId = randomUUID();

          const result = await withTransaction({ pool, nats: nats.connection }, async scope => {
            await scope.client.query('INSERT INTO widgets (id, name) VALUES ($1, $2)', [
              widgetId,
              'thing',
            ]);
            scope.publish({ type: 'widgets.created', id: widgetId, payload: { widgetId } });
            return 'ok';
          });

          expect(result).toBe('ok');

          const { rows: widgetRows } = await pool.query('SELECT * FROM widgets WHERE id = $1', [
            widgetId,
          ]);
          expect(widgetRows).toHaveLength(1);

          expect(nats.published).toEqual([expect.objectContaining({ subject: 'widgets.created' })]);

          // Inline delivery succeeded, so the row was DELETEd — the outbox is
          // a self-cleaning queue, not an append-only log.
          const { rows: outboxRows } = await pool.query(`SELECT * FROM ${OUTBOX_TABLE}`);
          expect(outboxRows).toHaveLength(0);
        }
      );
    });

    it('rolls back the business write and never stages an event when the transaction fn throws', async () => {
      await withTestDatabase(
        { schemaPrefix: 'events_outbox', migrationsDir: writeOutboxMigrationsDir() },
        async pool => {
          await pool.query('CREATE TABLE widgets (id uuid PRIMARY KEY, name text NOT NULL)');
          const nats = makeNatsDouble();
          const widgetId = randomUUID();

          await expect(
            withTransaction({ pool, nats: nats.connection }, async scope => {
              await scope.client.query('INSERT INTO widgets (id, name) VALUES ($1, $2)', [
                widgetId,
                'thing',
              ]);
              scope.publish({ type: 'widgets.created', id: widgetId, payload: { widgetId } });
              throw new Error('business logic failed');
            })
          ).rejects.toThrow('business logic failed');

          // Real ROLLBACK — the row a mocked pool would happily "insert"
          // never actually persists here.
          const { rows: widgetRows } = await pool.query('SELECT * FROM widgets WHERE id = $1', [
            widgetId,
          ]);
          expect(widgetRows).toHaveLength(0);

          expect(nats.published).toEqual([]);

          const { rows: outboxRows } = await pool.query(`SELECT * FROM ${OUTBOX_TABLE}`);
          expect(outboxRows).toHaveLength(0);
        }
      );
    });

    it('keeps the event durably queued in the outbox when inline delivery fails', async () => {
      await withTestDatabase(
        { schemaPrefix: 'events_outbox', migrationsDir: writeOutboxMigrationsDir() },
        async pool => {
          const nats = makeNatsDouble();
          // Only the FIRST jetstream() call (the one flushInline makes)
          // fails — proves the outbox row, not the caller's success, is
          // what carries the durability guarantee. The stub only implements
          // `publish`, not the full JetStreamClient surface, so the cast is
          // unavoidable.
          vi.spyOn(nats.connection, 'jetstream').mockReturnValueOnce({
            publish: async () => {
              throw new Error('nats unreachable');
            },
          } as unknown as ReturnType<(typeof nats.connection)['jetstream']>);

          const eventId = randomUUID();
          const result = await withTransaction({ pool, nats: nats.connection }, async scope => {
            scope.publish({ type: 'widgets.created', id: eventId, payload: { widgetId: eventId } });
            return 'ok';
          });

          // The caller still sees success: the write (if any) committed and
          // the event is durably queued — delivery is the relay's job now.
          expect(result).toBe('ok');

          const { rows: outboxRows } = await pool.query(
            `SELECT event_id, subject FROM ${OUTBOX_TABLE}`
          );
          expect(outboxRows).toEqual([
            expect.objectContaining({ event_id: eventId, subject: 'widgets.created' }),
          ]);
        }
      );
    });
  }
);
