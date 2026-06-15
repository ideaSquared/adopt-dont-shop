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

describe('eraseApplications', () => {
  it('scrubs the read-model PII columns that actually exist', async () => {
    const { client, query } = makeClient();
    query.mockResolvedValueOnce({ rowCount: 2 }); // applications update
    query.mockResolvedValueOnce({ rowCount: 1 }); // documents delete

    await eraseApplications(client, payload);

    const updateSql = query.mock.calls[0][0] as string;
    // The read model has NO `answers` / `references` columns — answers and
    // references live inside the JSONB `documents` column. Referencing the
    // non-existent columns would make the UPDATE throw at runtime.
    expect(updateSql).not.toMatch(/\banswers\s*=/);
    expect(updateSql).not.toMatch(/"references"\s*=/);
    // It MUST scrub the documents JSONB blob that holds answers/references.
    expect(updateSql).toMatch(/documents\s*=/);
    expect(query.mock.calls[0][1]).toEqual([payload.userId]);
  });

  it('hard-deletes document metadata from the application_documents table', async () => {
    const { client, query } = makeClient();
    query.mockResolvedValueOnce({ rowCount: 0 });
    query.mockResolvedValueOnce({ rowCount: 3 });

    await eraseApplications(client, payload);

    const deleteSql = query.mock.calls[1][0] as string;
    // The metadata table is `application_documents`, not `documents`.
    expect(deleteSql).toMatch(/application_documents/);
  });

  it('returns the total rows touched across both statements', async () => {
    const { client, query } = makeClient();
    query.mockResolvedValueOnce({ rowCount: 2 });
    query.mockResolvedValueOnce({ rowCount: 3 });

    const total = await eraseApplications(client, payload);

    expect(total).toBe(5);
  });
});
