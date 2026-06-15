import { describe, expect, it, vi } from 'vitest';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';
import type { PoolClient } from 'pg';

import { eraseApplications } from './erase.js';

const payload: GdprErasureRequestedPayload = {
  userId: 'usr-erase-1',
  correlationId: 'corr-1',
  requestedAt: '2026-06-15T12:00:00.000Z',
} as unknown as GdprErasureRequestedPayload;

function makeClient(): { client: PoolClient; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValue({ rowCount: 0 });
  return { client: { query } as unknown as PoolClient, query };
}

// Find the first call whose SQL matches `pattern`, or fail loudly.
function sqlMatching(query: ReturnType<typeof vi.fn>, pattern: RegExp): string {
  const call = query.mock.calls.find(c => pattern.test(c[0] as string));
  if (call === undefined) {
    throw new Error(`no query matched ${pattern}`);
  }
  return call[0] as string;
}

describe('eraseApplications', () => {
  it('scrubs the read-model PII columns that actually exist', async () => {
    const { client, query } = makeClient();

    await eraseApplications(client, payload);

    const updateSql = sqlMatching(query, /UPDATE applications\.applications/);
    // The read model has NO `answers` / `references` columns — answers and
    // references live inside the JSONB `documents` column. Referencing the
    // non-existent columns would make the UPDATE throw at runtime.
    expect(updateSql).not.toMatch(/\banswers\s*=/);
    expect(updateSql).not.toMatch(/"references"\s*=/);
    // It MUST scrub the documents JSONB blob that holds answers/references.
    expect(updateSql).toMatch(/documents\s*=/);
  });

  it('hard-deletes document metadata from the application_documents table', async () => {
    const { client, query } = makeClient();

    await eraseApplications(client, payload);

    const deleteSql = sqlMatching(query, /DELETE FROM applications\.application_documents/);
    // The metadata table is `application_documents`, not `documents`.
    expect(deleteSql).toMatch(/application_documents/);
  });

  it('scrubs PII out of the immutable event store for the user', async () => {
    const { client, query } = makeClient();

    await eraseApplications(client, payload);

    // The read path (Get/List) folds the EVENT STREAM, not the read-model
    // blob — so erasure that only touches `applications` leaves answers,
    // references and free-text notes resurfacing on the next Get. The
    // event_data JSONB must be scrubbed too.
    const eventSql = sqlMatching(query, /UPDATE applications\.application_events/);
    expect(eventSql).toMatch(/event_data/);
    // Scoped to the user's aggregates via the read-model owner join.
    expect(eventSql).toMatch(/user_id/);
  });

  it('opens the append-only escape hatch before mutating the event store', async () => {
    const { client, query } = makeClient();

    await eraseApplications(client, payload);

    // application_events is append-only (immutable trigger). The only
    // sanctioned mutation path is the per-transaction GUC the trigger
    // checks — it must be SET LOCAL (transaction-scoped) before the UPDATE.
    const hatchIdx = query.mock.calls.findIndex(c =>
      /SET\s+LOCAL\s+applications\.allow_event_mutation\s*=\s*'on'/i.test(c[0] as string)
    );
    const eventUpdateIdx = query.mock.calls.findIndex(c =>
      /UPDATE applications\.application_events/.test(c[0] as string)
    );
    expect(hatchIdx).toBeGreaterThanOrEqual(0);
    expect(eventUpdateIdx).toBeGreaterThan(hatchIdx);
  });

  it('returns the total read-model + document rows touched', async () => {
    const { client, query } = makeClient();
    query.mockImplementation((sql: string) => {
      if (/UPDATE applications\.applications\b/.test(sql)) {
        return Promise.resolve({ rowCount: 2 });
      }
      if (/DELETE FROM applications\.application_documents/.test(sql)) {
        return Promise.resolve({ rowCount: 3 });
      }
      return Promise.resolve({ rowCount: 7 });
    });

    const total = await eraseApplications(client, payload);

    // The count reflects the user-facing records erased (applications +
    // documents); event-store scrubbing is an internal anonymisation and
    // is not double-counted into the reported total.
    expect(total).toBe(5);
  });
});
