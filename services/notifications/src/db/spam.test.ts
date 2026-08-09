import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { describe, expect, it } from 'vitest';

import { runSpam, spamNotifications, type QueryFn } from './spam.js';

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

describe('runSpam', () => {
  it('reads the spam users and seeds notifications addressed to them', async () => {
    const userIds = [seededUuid('adopter-0'), seededUuid('adopter-1')];
    const inserts: string[] = [];
    const query: QueryFn = async text => {
      if (text.includes('SELECT user_id FROM auth.users')) {
        return { rows: userIds.map(user_id => ({ user_id })) };
      }
      if (text.includes('INTO')) {
        inserts.push(text);
      }
      return { rows: [] };
    };

    const result = await runSpam({ query, faker: createSpamFaker() });

    expect(result.notifications).toBeGreaterThan(0);
    expect(inserts.some(t => t.includes('INTO notifications.notifications'))).toBe(true);
  });

  it('throws when no spam users exist yet', async () => {
    const emptyQuery: QueryFn = async () => ({ rows: [] });
    await expect(runSpam({ query: emptyQuery, faker: createSpamFaker() })).rejects.toThrow(
      /run the auth spam first/
    );
  });
});
