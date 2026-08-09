import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { describe, expect, it } from 'vitest';

import { spamChats, type QueryFn } from './spam.js';

function recording(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return { rows: [] };
  };
  return { query, calls };
}

const SEEDS = [
  {
    applicationId: seededUuid('app-a'),
    rescueId: seededUuid('rescue-0'),
    adopterId: seededUuid('adopter-0'),
    staffId: seededUuid('staff-0'),
  },
];

describe('spamChats', () => {
  it('inserts chats, participants and messages idempotently', async () => {
    const { query, calls } = recording();

    const result = await spamChats({
      query,
      faker: createSpamFaker(),
      chats: 2,
      messages: 6,
      seeds: SEEDS,
    });

    expect(result).toEqual({ chats: 2, participants: 4, messages: 6 });
    const byTable = (t: string) => calls.find(c => c.text.includes(t));
    expect(byTable('INTO chat.chats')?.text).toMatch(/ON CONFLICT \(chat_id\) DO NOTHING/);
    expect(byTable('INTO chat.chat_participants')?.text).toMatch(
      /ON CONFLICT \(chat_participant_id\) DO NOTHING/
    );
    expect(byTable('INTO chat.messages')?.text).toMatch(/ON CONFLICT \(message_id\) DO NOTHING/);
  });

  it('gives the first chat a deterministic id', async () => {
    const { query, calls } = recording();
    await spamChats({ query, faker: createSpamFaker(), chats: 1, messages: 1, seeds: SEEDS });
    // chat_id is the first column of the chat insert.
    expect(calls[0].values[0]).toBe(seededUuid('chat-0'));
  });
});
