import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HandlerDeps } from '../grpc/adapter.js';
import { sendApplicationStaffNudges } from './application-staff-nudge.js';

// Same scripted-client pattern as application-draft-retention.test.ts:
// BEGIN/COMMIT/ROLLBACK and the event_outbox INSERT are withTransaction's
// own infrastructure, not queries this job issues.
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
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool, clientMock: client, natsMock: nats, clientScript };
}

const staleRow = (id: string) => ({
  application_id: id,
  rescue_id: 'rescue-1',
  pet_id: 'pet-1',
  user_id: 'user-1',
  submitted_at: '2026-06-01T00:00:00.000Z',
});

describe('sendApplicationStaffNudges', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => vi.resetAllMocks());

  it('nudges nothing and publishes nothing when no application is stale', async () => {
    mocks.clientScript.push({ rows: [] });

    const res = await sendApplicationStaffNudges(mocks.deps, { inactivityDays: 3, batchSize: 200 });

    expect(res.nudgedCount).toBe(0);
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('stamps and publishes one applications.staffNudgeDue event per stale application', async () => {
    mocks.clientScript.push({ rows: [staleRow('app-1'), staleRow('app-2')] });

    const res = await sendApplicationStaffNudges(mocks.deps, { inactivityDays: 3, batchSize: 200 });

    expect(res.nudgedCount).toBe(2);
    const updateCall = mocks.clientMock.query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE applications')
    );
    expect(updateCall).toBeDefined();
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(2);
    const [subject, data] = mocks.natsMock.publish.mock.calls[0] as [string, Uint8Array];
    expect(subject).toBe('applications.staffNudgeDue');
    const envelope = JSON.parse(new TextDecoder().decode(data)) as {
      id: string;
      payload: Record<string, unknown>;
    };
    expect(envelope.id).toBe('applications.staffNudgeDue.app-1');
    expect(envelope.payload).toEqual({
      applicationId: 'app-1',
      rescueId: 'rescue-1',
      petId: 'pet-1',
      adopterId: 'user-1',
      submittedAt: '2026-06-01T00:00:00.000Z',
      inactivityDays: 3,
    });
  });

  it('passes the configured threshold and batch size through to the query', async () => {
    mocks.clientScript.push({ rows: [] });

    await sendApplicationStaffNudges(mocks.deps, { inactivityDays: 5, batchSize: 50 });

    const updateCall = mocks.clientMock.query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE applications')
    );
    expect(updateCall?.[1]).toEqual([
      ['submitted', 'under_review', 'home_visit_scheduled', 'home_visit_completed'],
      5,
      50,
    ]);
  });

  it('loops across multiple bounded batches, each its own transaction, until fewer than batchSize rows come back', async () => {
    mocks.clientScript.push({ rows: [staleRow('app-1'), staleRow('app-2')] }); // full batch
    mocks.clientScript.push({ rows: [staleRow('app-3')] }); // partial — stops here

    const res = await sendApplicationStaffNudges(mocks.deps, { inactivityDays: 3, batchSize: 2 });

    expect(res.nudgedCount).toBe(3);
    expect(mocks.poolMock.connect).toHaveBeenCalledTimes(2);
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(3);
  });

  it('does not publish when the update throws (rollback, no notification noise)', async () => {
    await expect(
      sendApplicationStaffNudges(mocks.deps, { inactivityDays: 3, batchSize: 200 })
    ).rejects.toThrow();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });
});
