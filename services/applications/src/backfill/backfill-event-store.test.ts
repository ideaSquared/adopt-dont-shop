import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';

import { backfillApplication } from './backfill-event-store.js';
import type { MonolithApplicationInput } from './map-monolith-application.js';

const input = (overrides: Partial<MonolithApplicationInput> = {}): MonolithApplicationInput => ({
  applicationId: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  petId: '33333333-3333-3333-3333-333333333333',
  rescueId: '44444444-4444-4444-4444-444444444444',
  status: 'approved',
  answers: { hasYard: true },
  references: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  submittedAt: '2026-01-02T10:00:00.000Z',
  reviewedAt: '2026-01-03T10:00:00.000Z',
  decidedAt: '2026-01-04T10:00:00.000Z',
  actionedBy: '55555555-5555-5555-5555-555555555555',
  rejectionReason: null,
  withdrawalReason: null,
  ...overrides,
});

// A scripted client: every INSERT reports `rowCount` from the supplied
// queue (1 = inserted, 0 = ON CONFLICT no-op); the final projection
// UPSERT resolves empty.
function makeClient(insertRowCounts: ReadonlyArray<number>): {
  client: PoolClient;
  query: ReturnType<typeof vi.fn>;
} {
  const counts = [...insertRowCounts];
  const query = vi.fn((text: string) => {
    if (text.includes('INSERT INTO application_events')) {
      return Promise.resolve({ rowCount: counts.shift() ?? 0, rows: [] });
    }
    return Promise.resolve({ rowCount: 0, rows: [] });
  });
  const client = { query } as unknown as PoolClient;
  return { client, query };
}

describe('backfillApplication', () => {
  it('inserts one event per synthesized event then projects the read model', async () => {
    // approved with answers → draftCreated, draftAnswersSaved,
    // draftSubmitted, reviewStarted, approved = 5 events.
    const { client, query } = makeClient([1, 1, 1, 1, 1]);
    const outcome = await backfillApplication(client, input());

    expect(outcome.totalEvents).toBe(5);
    expect(outcome.insertedEvents).toBe(5);

    const inserts = query.mock.calls.filter(c =>
      String(c[0]).includes('INSERT INTO application_events')
    );
    expect(inserts).toHaveLength(5);
    const projections = query.mock.calls.filter(c =>
      String(c[0]).includes('INSERT INTO applications')
    );
    expect(projections).toHaveLength(1);
  });

  it('inserts events at sequential versions starting from 1', async () => {
    const { client, query } = makeClient([1, 1, 1]);
    await backfillApplication(client, input({ status: 'submitted', answers: {} }));

    const versions = query.mock.calls
      .filter(c => String(c[0]).includes('INSERT INTO application_events'))
      .map(c => (c[1] as unknown[])[1]);
    expect(versions).toEqual([1, 2]); // submitted (no answers) = draftCreated, draftSubmitted
  });

  it('uses ON CONFLICT DO NOTHING so re-runs do not duplicate events', async () => {
    const { client, query } = makeClient([0, 0]);
    const outcome = await backfillApplication(client, input({ status: 'submitted', answers: {} }));

    // Every insert collided (rowCount 0) → nothing newly inserted, but
    // the projection still runs (idempotent UPSERT).
    expect(outcome.insertedEvents).toBe(0);
    expect(outcome.totalEvents).toBe(2);
    const insertSql = String(query.mock.calls[0][0]);
    expect(insertSql).toContain('ON CONFLICT (aggregate_id, version) DO NOTHING');
  });

  it('stamps the monolith actioned_by as the actor on every event row', async () => {
    const { client, query } = makeClient([1, 1, 1, 1, 1]);
    await backfillApplication(client, input());

    const actors = query.mock.calls
      .filter(c => String(c[0]).includes('INSERT INTO application_events'))
      .map(c => (c[1] as unknown[])[5]);
    expect(new Set(actors)).toEqual(new Set(['55555555-5555-5555-5555-555555555555']));
  });

  it('stamps a null actor when the monolith never recorded actioned_by', async () => {
    const { client, query } = makeClient([1, 1, 1, 1, 1]);
    await backfillApplication(client, input({ actionedBy: null }));

    const actors = query.mock.calls
      .filter(c => String(c[0]).includes('INSERT INTO application_events'))
      .map(c => (c[1] as unknown[])[5]);
    expect(new Set(actors)).toEqual(new Set([null]));
  });

  it('stamps occurred_at from the event domain timestamp', async () => {
    const { client, query } = makeClient([1, 1]);
    await backfillApplication(client, input({ status: 'submitted', answers: {} }));

    const firstInsert = query.mock.calls.find(c =>
      String(c[0]).includes('INSERT INTO application_events')
    );
    // params: [aggregateId, version, type, data, occurred_at, actor]
    expect((firstInsert?.[1] as unknown[])[4]).toBe('2026-01-01T10:00:00.000Z');
  });
});
