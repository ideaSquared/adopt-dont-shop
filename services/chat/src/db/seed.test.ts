import { describe, expect, it } from 'vitest';

import { seedChats, type QueryFn } from './seed.js';
import { SEED_CHATS } from './seed-data.js';

function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return undefined;
  };
  return { query, calls };
}

describe('chat seed', () => {
  it('inserts the chat before its participants (intra-schema FK order)', async () => {
    const { query, calls } = recordingQuery();

    const seeded = await seedChats({ query });

    const chat = SEED_CHATS[0];
    // First call is the chat upsert, then one upsert per participant.
    expect(calls[0].text).toMatch(/INSERT INTO chat\.chats/);
    expect(calls[0].values[0]).toBe(chat.chatId);
    for (let i = 0; i < chat.participants.length; i++) {
      expect(calls[i + 1].text).toMatch(/INSERT INTO chat\.chat_participants/);
      expect(calls[i + 1].values[1]).toBe(chat.chatId); // chat_id
    }
    expect(seeded).toEqual([chat.chatId]);
  });

  it('seeds both the adopter (user) and the rescue manager (rescue) as participants', async () => {
    const { query, calls } = recordingQuery();

    await seedChats({ query });

    const participantCalls = calls.filter(c => /chat_participants/.test(c.text));
    const roles = participantCalls.map(c => c.values[3]);
    expect(roles).toContain('user');
    expect(roles).toContain('rescue');
    const ids = participantCalls.map(c => c.values[2]);
    expect(ids).toContain('98915d9e-69ed-46b2-a897-57d8469ff360'); // John Smith
  });

  it('pins the chat id the e2e suite reads (SEEDED_CHAT_ID_FOR_ADOPTER)', async () => {
    const { query, calls } = recordingQuery();

    await seedChats({ query });

    expect(calls[0].values[0]).toBe('7dfe4c51-930a-443b-aac5-3e42750a2f1a');
  });

  it('is idempotent — chat + participant upserts use ON CONFLICT DO UPDATE', async () => {
    const { query, calls } = recordingQuery();

    await seedChats({ query });

    for (const call of calls) {
      expect(call.text).toMatch(/ON CONFLICT \([a-z_]+\) DO UPDATE/);
    }
    const second = recordingQuery();
    await seedChats({ query: second.query });
    expect(second.calls).toHaveLength(calls.length);
  });
});
