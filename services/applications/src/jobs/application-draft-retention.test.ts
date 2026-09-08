import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HandlerDeps } from '../grpc/adapter.js';
import { purgeExpiredApplicationDrafts } from './application-draft-retention.js';

// Same scripted-client pattern as services/auth/src/grpc/privacy-handlers.test.ts:
// BEGIN/COMMIT/ROLLBACK and the event_outbox INSERT are withTransaction's own
// infrastructure, not queries this job issues — make them transparent so
// the scripted DELETE responses line up with the job's own SQL.
function makeMocks() {
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('event_outbox')) {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  };
  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool, clientMock: client, natsMock: nats, clientScript };
}

const draftRow = (id: string) => ({ draft_id: id });

describe('purgeExpiredApplicationDrafts', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('deletes nothing and publishes nothing when no drafts are expired', async () => {
    mocks.clientScript.push({ rows: [] });

    const res = await purgeExpiredApplicationDrafts(mocks.deps, { batchSize: 500 });

    expect(res.deletedCount).toBe(0);
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('deletes a batch smaller than batchSize in one pass and publishes one summary event', async () => {
    mocks.clientScript.push({ rows: [draftRow('d-1'), draftRow('d-2')] });

    const res = await purgeExpiredApplicationDrafts(mocks.deps, { batchSize: 500 });

    expect(res.deletedCount).toBe(2);
    const deleteCall = mocks.clientMock.query.mock.calls.find(([sql]: [string]) =>
      typeof sql === 'string' ? sql.includes('DELETE FROM application_drafts') : false
    );
    expect(deleteCall).toBeDefined();
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('applications.actionTaken');
  });

  it('loops across multiple bounded batches, each its own transaction, until fewer than batchSize rows come back', async () => {
    mocks.clientScript.push({ rows: [draftRow('d-1'), draftRow('d-2')] }); // full batch
    mocks.clientScript.push({ rows: [draftRow('d-3')] }); // partial — stops here

    const res = await purgeExpiredApplicationDrafts(mocks.deps, { batchSize: 2 });

    expect(res.deletedCount).toBe(3);
    // Two separate pool.connect() calls == two separate transactions.
    expect(mocks.poolMock.connect).toHaveBeenCalledTimes(2);
    // Exactly one summary event, attached to the final (partial) batch.
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
  });

  it('does not publish when the delete throws (rollback, no audit noise)', async () => {
    // No scripted response for the DELETE — the mock's own fallback throws
    // "unscripted", modelling the query failing.
    await expect(purgeExpiredApplicationDrafts(mocks.deps, { batchSize: 500 })).rejects.toThrow();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });
});
