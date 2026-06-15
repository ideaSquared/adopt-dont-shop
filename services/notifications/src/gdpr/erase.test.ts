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
  it('deletes from all user-keyed tables in the notifications schema, including the email queue', async () => {
    const client = fakeClient([4, 1, 1, 2, 3]);
    const total = await eraseNotifications(client, PAYLOAD);
    expect(total).toBe(11);
    const calls = (client.query as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(5);
    expect(String(calls[0][0])).toContain('DELETE FROM notifications.notifications');
    expect(String(calls[1][0])).toContain('DELETE FROM notifications.user_notification_prefs');
    expect(String(calls[2][0])).toContain('DELETE FROM notifications.email_preferences');
    expect(String(calls[3][0])).toContain('DELETE FROM notifications.device_tokens');
    expect(String(calls[4][0])).toContain('DELETE FROM notifications.email_queue');
  });

  it('parameterizes the user id on every delete', async () => {
    const client = fakeClient([0, 0, 0, 0, 0]);
    await eraseNotifications(client, PAYLOAD);
    const calls = (client.query as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of calls) {
      expect(call[1]).toEqual([PAYLOAD.userId]);
    }
  });
});
