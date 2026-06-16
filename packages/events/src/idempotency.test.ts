import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { claimEvent } from './idempotency.js';

const makeConn = (rowCount: number) => {
  const query = vi.fn().mockResolvedValue({ rowCount, rows: [] });
  return { conn: { query } as unknown as Pool, query };
};

describe('claimEvent', () => {
  it('returns true the first time an event is claimed (one row inserted)', async () => {
    const { conn, query } = makeConn(1);

    const claimed = await claimEvent(conn, 'applications.approved', 'app-1');

    expect(claimed).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('processed_events'), [
      'applications.approved',
      'app-1',
    ]);
    // ON CONFLICT keeps a redelivery from inserting twice.
    expect(query.mock.calls[0][0]).toMatch(/ON CONFLICT \(consumer, event_id\) DO NOTHING/);
  });

  it('returns false on a redelivery (ON CONFLICT inserts nothing)', async () => {
    const { conn } = makeConn(0);

    const claimed = await claimEvent(conn, 'applications.approved', 'app-1');

    expect(claimed).toBe(false);
  });

  it('keys on (consumer, event_id) so the same id under different subjects both claim', async () => {
    const { conn, query } = makeConn(1);

    await claimEvent(conn, 'applications.approved', 'app-1');
    await claimEvent(conn, 'applications.adopted', 'app-1');

    expect(query.mock.calls[0][1]).toEqual(['applications.approved', 'app-1']);
    expect(query.mock.calls[1][1]).toEqual(['applications.adopted', 'app-1']);
  });
});
