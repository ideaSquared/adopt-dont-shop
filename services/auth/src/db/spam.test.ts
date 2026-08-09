import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { describe, expect, it } from 'vitest';

import { buildUserRows, spamUsers, type QueryFn } from './spam.js';

const COL = { user_id: 0, email: 3, user_type: 9 } as const;

describe('buildUserRows', () => {
  it('derives deterministic ids + emails from the adopter/staff key scheme', () => {
    const rows = buildUserRows(createSpamFaker(), 'hash', 2, 1);

    // adopters first, then staff — ids/emails the other seeders can recompute.
    expect(rows[0][COL.user_id]).toBe(seededUuid('adopter-0'));
    expect(rows[0][COL.email]).toBe('adopter0@example.test');
    expect(rows[0][COL.user_type]).toBe('adopter');
    expect(rows[2][COL.user_id]).toBe(seededUuid('staff-0'));
    expect(rows[2][COL.email]).toBe('staff0@example.test');
    expect(rows[2][COL.user_type]).toBe('rescue_staff');
  });

  it('is deterministic — same seed yields identical rows', () => {
    const now = new Date(0);
    expect(buildUserRows(createSpamFaker(), 'h', 5, 5, now)).toEqual(
      buildUserRows(createSpamFaker(), 'h', 5, 5, now)
    );
  });

  it('builds exactly the requested number of adopters and staff', () => {
    expect(buildUserRows(createSpamFaker(), 'h', 7, 3)).toHaveLength(10);
  });
});

describe('spamUsers', () => {
  it('inserts users idempotently (ON CONFLICT (user_id) DO NOTHING)', async () => {
    const calls: Array<{ text: string }> = [];
    const query: QueryFn = async text => {
      calls.push({ text });
      return { rows: [] };
    };

    const result = await spamUsers({
      query,
      faker: createSpamFaker(),
      passwordHash: 'hash',
      adopters: 3,
      staff: 2,
    });

    expect(result).toEqual({ adopters: 3, staff: 2 });
    expect(calls[0].text).toMatch(/INTO auth\.users/);
    expect(calls[0].text).toMatch(/ON CONFLICT \(user_id\) DO NOTHING/);
  });
});
