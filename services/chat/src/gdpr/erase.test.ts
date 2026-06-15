import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

import { eraseChat } from './erase.js';

const PAYLOAD: GdprErasureRequestedPayload = {
  userId: 'usr-erase',
  correlationId: 'corr-1',
  requestedAt: '2026-06-15T00:00:00Z',
};

function makeClient(rowCounts: number[]): {
  client: PoolClient;
  calls: Array<{ text: string; values: unknown[] }>;
} {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  let i = 0;
  const query = vi.fn(async (text: string, values: unknown[]) => {
    calls.push({ text, values });
    const rowCount = rowCounts[i] ?? 0;
    i += 1;
    return { rowCount, rows: [] };
  });
  return { client: { query } as unknown as PoolClient, calls };
}

describe('eraseChat', () => {
  it('keys the chat_participants delete on participant_id (the real column, not user_id)', async () => {
    const { client, calls } = makeClient([1, 1, 1, 1]);
    await eraseChat(client, PAYLOAD);
    const participantsCall = calls.find(c => c.text.includes('chat_participants'));
    expect(participantsCall).toBeDefined();
    // chat_participants has no `user_id` column — the membership FK is
    // `participant_id`. Guard against the regression where erase keyed
    // on a non-existent column (would throw at runtime, aborting the saga).
    expect(participantsCall?.text).toMatch(/participant_id\s*=\s*\$1/);
    expect(participantsCall?.text).not.toMatch(/\buser_id\b/);
  });

  it('anonymises the user-authored messages and drops their reactions + reads', async () => {
    const { client, calls } = makeClient([2, 3, 1, 1]);
    const total = await eraseChat(client, PAYLOAD);

    expect(calls).toHaveLength(4);
    expect(calls.every(c => c.values[0] === 'usr-erase')).toBe(true);

    const msgCall = calls.find(c => c.text.includes('messages'));
    expect(msgCall?.text).toMatch(/SET content = '\[erased\]'/);
    expect(msgCall?.text).toMatch(/sender_id = \$1/);

    expect(calls.some(c => c.text.includes('message_reactions'))).toBe(true);
    expect(calls.some(c => c.text.includes('message_reads'))).toBe(true);

    // Sum of the row counts is reported back to the saga.
    expect(total).toBe(7);
  });

  it('returns 0 when the user has no data in this schema (idempotent re-run)', async () => {
    const { client } = makeClient([0, 0, 0, 0]);
    const total = await eraseChat(client, PAYLOAD);
    expect(total).toBe(0);
  });

  it("scrubs content from the user's own already-soft-deleted messages (no deleted_at guard)", async () => {
    const { calls } = makeClient([0, 0, 0, 0]);
    const client = {
      query: vi.fn(async (text: string, values: unknown[]) => {
        calls.push({ text, values });
        return { rowCount: 0, rows: [] };
      }),
    } as unknown as PoolClient;

    await eraseChat(client, PAYLOAD);

    const msgCall = calls.find(c => c.text.includes('messages'));
    // GDPR erasure must remove PII even from messages the user had already
    // soft-deleted themselves — those rows still carry content in the DB.
    // The scrub must NOT be gated on `deleted_at IS NULL`.
    expect(msgCall?.text).not.toMatch(/deleted_at\s+IS\s+NULL/i);
    // And it must only touch rows that aren't already scrubbed, so re-runs
    // stay idempotent.
    expect(msgCall?.text).toMatch(/content\s*<>\s*'\[erased\]'/i);
  });
});
