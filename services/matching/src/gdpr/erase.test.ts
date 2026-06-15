import { describe, expect, it, vi } from 'vitest';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';
import type { PoolClient } from 'pg';

import { eraseMatching } from './erase.js';

const payload: GdprErasureRequestedPayload = {
  userId: 'usr-erase-1',
  correlationId: 'corr-1',
  requestedAt: '2026-06-15T12:00:00.000Z',
} as unknown as GdprErasureRequestedPayload;

function makeClient(): { client: PoolClient; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValue({ rowCount: 0 });
  return { client: { query } as unknown as PoolClient, query };
}

describe('eraseMatching', () => {
  it('deletes swipe actions before sessions so the FK does not block the delete', async () => {
    const { client, query } = makeClient();

    await eraseMatching(client, payload);

    const actionsSql = query.mock.calls[0][0] as string;
    const sessionsSql = query.mock.calls[1][0] as string;
    expect(actionsSql).toMatch(/DELETE FROM .*swipe_actions/s);
    expect(sessionsSql).toMatch(/DELETE FROM .*swipe_sessions/s);
  });

  it('removes the swipe history, sessions, and match profile for the user', async () => {
    const { client, query } = makeClient();

    await eraseMatching(client, payload);

    const tables = query.mock.calls.map(call => call[0] as string).join('\n');
    expect(tables).toMatch(/swipe_actions/);
    expect(tables).toMatch(/swipe_sessions/);
    expect(tables).toMatch(/adopter_match_profiles/);
    // Every statement is scoped to the erased user's id only.
    for (const call of query.mock.calls) {
      expect(call[1]).toEqual([payload.userId]);
    }
  });

  it('erases swipe actions the user made even on anonymous (null-owner) sessions', async () => {
    // recordSwipe lets an authenticated user swipe within a null-owner
    // session (the owner guard passes when session.user_id IS NULL), so
    // swipe_actions can carry user_id = X under a session with no owner.
    // Deleting only via session ownership would orphan that personal
    // data; the actions delete must also match swipe_actions.user_id.
    const { client, query } = makeClient();

    await eraseMatching(client, payload);

    const actionsSql = query.mock.calls[0][0] as string;
    expect(actionsSql).toMatch(/swipe_actions\.user_id = \$1/);
  });

  it('returns the total rows erased across all statements', async () => {
    const { client, query } = makeClient();
    query.mockResolvedValueOnce({ rowCount: 4 }); // swipe_actions
    query.mockResolvedValueOnce({ rowCount: 2 }); // swipe_sessions
    query.mockResolvedValueOnce({ rowCount: 1 }); // adopter_match_profiles

    const total = await eraseMatching(client, payload);

    expect(total).toBe(7);
  });
});
