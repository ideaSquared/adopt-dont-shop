import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

import { eraseRescue } from './erase.js';

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

describe('eraseRescue', () => {
  it('targets only columns that exist on the rescue schema (no invited_user_id)', async () => {
    const { client, calls } = makeClient([1, 1, 1]);
    await eraseRescue(client, PAYLOAD);
    // The invitations table has no `invited_user_id` column — guard against
    // the regression where erase referenced a non-existent column.
    for (const call of calls) {
      expect(call.text).not.toContain('invited_user_id');
    }
  });

  it('never NULLs the NOT NULL foster_user_id column', async () => {
    const { client, calls } = makeClient([1, 1, 1]);
    await eraseRescue(client, PAYLOAD);
    const fosterCall = calls.find(c => c.text.includes('foster_placements'));
    expect(fosterCall).toBeDefined();
    expect(fosterCall?.text).not.toMatch(/foster_user_id\s*=\s*NULL/i);
  });

  it('erases staff memberships, foster placements and invitations for the user', async () => {
    const { client, calls } = makeClient([2, 1, 3]);
    const total = await eraseRescue(client, PAYLOAD);

    expect(calls).toHaveLength(3);
    expect(calls.every(c => c.values[0] === 'usr-erase')).toBe(true);
    expect(calls.some(c => c.text.includes('staff_members'))).toBe(true);
    expect(calls.some(c => c.text.includes('foster_placements'))).toBe(true);
    expect(calls.some(c => c.text.includes('invitations'))).toBe(true);
    // Sum of the row counts is reported back to the saga.
    expect(total).toBe(6);
  });

  it('returns 0 when the user has no data in this schema (idempotent re-run)', async () => {
    const { client } = makeClient([0, 0, 0]);
    const total = await eraseRescue(client, PAYLOAD);
    expect(total).toBe(0);
  });

  it('erases email-keyed pending invitations when the payload carries an email', async () => {
    // The user_id-keyed deletes touch 0 rows (the invitee never registered);
    // the email-keyed delete catches 2 pending invitations.
    const { client, calls } = makeClient([0, 0, 0, 2]);
    const total = await eraseRescue(client, { ...PAYLOAD, email: 'invitee@example.com' });

    const emailCall = calls.find(
      c => c.text.includes('invitations') && c.text.toLowerCase().includes('email')
    );
    expect(emailCall).toBeDefined();
    // Case-insensitive match so casing variants of the same address are caught.
    expect(emailCall?.text).toMatch(/lower\(email\)\s*=\s*lower\(\$1\)/i);
    expect(emailCall?.values[0]).toBe('invitee@example.com');
    expect(total).toBe(2);
  });

  it('does not run an email-keyed query when the payload has no email', async () => {
    const { client, calls } = makeClient([0, 0, 0]);
    await eraseRescue(client, PAYLOAD);
    expect(calls).toHaveLength(3);
    expect(calls.some(c => c.text.toLowerCase().includes('email'))).toBe(false);
  });
});
