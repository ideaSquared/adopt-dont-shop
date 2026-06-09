import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { eraseNotifications } from './erase.js';

const PAYLOAD = {
  userId: 'usr-1',
  correlationId: 'corr',
  requestedAt: '2026-06-09T00:00:00Z',
};

function fakeClient(counts: number[]): PoolClient {
  let i = 0;
  return {
    query: vi.fn(async () => {
      const rowCount = counts[i] ?? 0;
      i++;
      return { rows: [], rowCount };
    }),
    release: vi.fn(),
  } as unknown as PoolClient;
}

describe('eraseNotifications', () => {
  it('deletes from all four user-keyed tables in the notifications schema', async () => {
    const client = fakeClient([4, 1, 1, 2]);
    const total = await eraseNotifications(client, PAYLOAD);
    expect(total).toBe(8);
    const calls = (client.query as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(4);
    expect(String(calls[0][0])).toContain('DELETE FROM notifications.notifications');
    expect(String(calls[1][0])).toContain('DELETE FROM notifications.user_notification_prefs');
    expect(String(calls[2][0])).toContain('DELETE FROM notifications.email_preferences');
    expect(String(calls[3][0])).toContain('DELETE FROM notifications.device_tokens');
  });
});
