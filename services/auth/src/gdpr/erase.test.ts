import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

import { eraseAuth } from './erase.js';

const PAYLOAD: GdprErasureRequestedPayload = {
  userId: 'usr-1',
  correlationId: 'corr-abc',
  requestedAt: '2026-06-09T00:00:00Z',
};

function fakeClient(rowCounts: number[]): PoolClient {
  let i = 0;
  return {
    query: vi.fn(async () => {
      const rowCount = rowCounts[i] ?? 0;
      i++;
      return { rows: [], rowCount };
    }),
    release: vi.fn(),
  } as unknown as PoolClient;
}

describe('eraseAuth', () => {
  it('scrubs the users row + drops sessions / prefs / roles', async () => {
    const client = fakeClient([1, 3, 1, 2]); // UPDATE users (1), DELETE refresh (3), prefs (1), roles (2)
    const total = await eraseAuth(client, PAYLOAD);
    expect(total).toBe(7);

    const calls = (client.query as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(4);

    const usersSql = String(calls[0][0]);
    expect(usersSql).toContain('UPDATE auth.users');
    expect(usersSql).toContain("status = 'deactivated'");
    expect(usersSql).toContain('deleted_at = now()');
    // PII columns are nulled or replaced.
    expect(usersSql).toContain('first_name = NULL');
    expect(usersSql).toContain('phone_number = NULL');
    expect(usersSql).toContain('email = $2');

    // refresh_tokens / privacy_prefs / user_roles deleted by user_id.
    expect(String(calls[1][0])).toContain('DELETE FROM auth.refresh_tokens');
    expect(String(calls[2][0])).toContain('DELETE FROM auth.user_privacy_prefs');
    expect(String(calls[3][0])).toContain('DELETE FROM auth.user_roles');
    for (const c of calls) {
      expect((c[1] as unknown[])[0]).toBe('usr-1');
    }
  });

  it('returns 0 when the user did not exist (idempotent re-run)', async () => {
    const client = fakeClient([0, 0, 0, 0]);
    const total = await eraseAuth(client, PAYLOAD);
    expect(total).toBe(0);
  });

  it('uses a stable scrubbed-email placeholder (no PII leak in the new value)', async () => {
    const client = fakeClient([1, 0, 0, 0]);
    await eraseAuth(client, PAYLOAD);
    const calls = (client.query as ReturnType<typeof vi.fn>).mock.calls;
    const scrubbedEmail = (calls[0][1] as unknown[])[1] as string;
    expect(scrubbedEmail).toMatch(/^erased\+/);
    expect(scrubbedEmail).toContain('@example.invalid');
  });
});
