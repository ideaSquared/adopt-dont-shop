import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WithTransactionDeps } from '@adopt-dont-shop/events';

// Read-only imports of the audit service's real contract (it has no validator of its own;
// the uuid / NOT NULL columns are the validation).
import { persistAuditEvent } from '../../../audit/src/nats/subscribers.js';
import type { AuditEventPayload } from '../../../audit/src/nats/event-types.js';
import { purgeSentEmailQueue } from './email-queue-retention.js';

// Same scripted-client pattern as services/auth/src/grpc/privacy-handlers.test.ts:
// BEGIN/COMMIT/ROLLBACK and the event_outbox INSERT are withTransaction's own
// infrastructure, not queries this job issues.
function makeMocks() {
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string, _params?: unknown[]) => {
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
  const deps: WithTransactionDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool, clientMock: client, natsMock: nats, clientScript };
}

const emailRow = (id: string) => ({ email_id: id });

describe('purgeSentEmailQueue', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('deletes nothing and publishes nothing when no sent rows are past retention', async () => {
    mocks.clientScript.push({ rows: [] });

    const res = await purgeSentEmailQueue(mocks.deps, { retentionDays: 365, batchSize: 500 });

    expect(res.deletedCount).toBe(0);
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('deletes a batch smaller than batchSize in one pass, scoped by sent_at + retentionDays', async () => {
    mocks.clientScript.push({ rows: [emailRow('e-1'), emailRow('e-2')] });

    const res = await purgeSentEmailQueue(mocks.deps, { retentionDays: 365, batchSize: 500 });

    expect(res.deletedCount).toBe(2);
    const deleteCall = mocks.clientMock.query.mock.calls.find(([sql]) =>
      typeof sql === 'string' ? sql.includes('DELETE FROM email_queue') : false
    );
    expect(deleteCall).toBeDefined();
    expect(String(deleteCall?.[0])).toContain('sent_at IS NOT NULL');
    expect(deleteCall?.[1]).toEqual([365, 500]);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('notifications.actionTaken');
  });

  it('loops across multiple bounded batches, each its own transaction, until fewer than batchSize rows come back', async () => {
    mocks.clientScript.push({ rows: [emailRow('e-1'), emailRow('e-2')] }); // full batch
    mocks.clientScript.push({ rows: [emailRow('e-3')] }); // partial — stops here

    const res = await purgeSentEmailQueue(mocks.deps, { retentionDays: 365, batchSize: 2 });

    expect(res.deletedCount).toBe(3);
    expect(mocks.poolMock.connect).toHaveBeenCalledTimes(2);
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
  });

  it('does not publish when the delete throws (rollback, no audit noise)', async () => {
    await expect(
      purgeSentEmailQueue(mocks.deps, { retentionDays: 365, batchSize: 500 })
    ).rejects.toThrow();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  describe('published audit event', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    const decode = (call: unknown[]) =>
      JSON.parse(new TextDecoder().decode(call[1] as Uint8Array)) as {
        id: string;
        payload: AuditEventPayload;
      };

    const runOnce = async () => {
      const m = makeMocks();
      m.clientScript.push({ rows: [emailRow('e-1'), emailRow('e-2')] });
      await purgeSentEmailQueue(m.deps, { retentionDays: 365, batchSize: 500 });
      return decode(m.natsMock.publish.mock.calls[0]);
    };

    it('satisfies AuditEventPayload and persists through the audit subscriber insert', async () => {
      const envelope = await runOnce();
      const payload = envelope.payload;

      expect(payload.eventId).toMatch(UUID);
      expect(payload.aggregateId).toMatch(UUID);
      expect(payload.outcome).toBe('success');
      expect(Number.isNaN(Date.parse(payload.occurredAt))).toBe(false);
      expect(payload.actorUserId).toBeUndefined();
      expect(payload.payload).toMatchObject({ deletedCount: 2 });

      const query = vi.fn().mockResolvedValue({ rowCount: 1 });
      await persistAuditEvent({ query } as unknown as Pool, payload, 'notifications.actionTaken');
      const params = query.mock.calls[0][1] as unknown[];
      // event_id, aggregate_id, actor_user_id, outcome, occurred_at
      expect(params[0]).toMatch(UUID);
      expect(params[4]).toMatch(UUID);
      expect(params[5]).toBeNull();
      expect(params[8]).toBe('success');
      expect(params[9]).toEqual(expect.any(String));
    });

    it('uses a different envelope id and eventId for each run, even within the same millisecond', async () => {
      vi.useFakeTimers();
      try {
        const a = await runOnce();
        const b = await runOnce();
        expect(a.id).not.toBe(b.id);
        expect(a.payload.eventId).not.toBe(b.payload.eventId);
      } finally {
        vi.useRealTimers();
      }
    });

    it('carries no email ids or other row data, only counts', async () => {
      const envelope = await runOnce();
      expect(JSON.stringify(envelope.payload.payload)).not.toContain('e-1');
    });
  });
});
