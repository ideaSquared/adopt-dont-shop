import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { describe, expect, it } from 'vitest';

import { spamNotifications, type QueryFn } from './spam.js';

function recording(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return { rows: [] };
  };
  return { query, calls };
}

describe('spamNotifications', () => {
  it('inserts idempotently with deterministic ids and real titles', async () => {
    const { query, calls } = recording();

    const result = await spamNotifications({
      query,
      faker: createSpamFaker(),
      notifications: 3,
      userIds: [seededUuid('adopter-0'), seededUuid('adopter-1')],
    });

    expect(result.notifications).toBe(3);
    expect(calls[0].text).toMatch(/ON CONFLICT \(notification_id\) DO NOTHING/);
    // notification_id (col 0) is deterministic; title (col 5) is real copy, not lorem.
    expect(calls[0].values[0]).toBe(seededUuid('notification-0'));
    expect(typeof calls[0].values[5]).toBe('string');
    expect((calls[0].values[5] as string).length).toBeGreaterThan(0);
  });
});
