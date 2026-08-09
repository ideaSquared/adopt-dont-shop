import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildUserRows, runSpam, spamUsers, type QueryFn } from './spam.js';

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

describe('runSpam', () => {
  afterEach(() => vi.unstubAllEnvs());

  const hash = async (pw: string): Promise<string> => `hashed:${pw}`;

  it('seeds without probing when SEED_ONLY_IF_EMPTY is unset (manual command)', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', '');
    const calls: Array<{ text: string }> = [];
    const query: QueryFn = async text => {
      calls.push({ text });
      return { rows: [] };
    };

    const result = await runSpam({ query, faker: createSpamFaker(), hash });

    expect(result.seeded).toBe(true);
    // No anchor probe on the manual path; only the bulk insert runs.
    expect(calls.every(c => !c.text.includes('SELECT 1 FROM auth.users'))).toBe(true);
    expect(calls.some(c => /INTO auth\.users/.test(c.text))).toBe(true);
  });

  it('skips on boot when the anchor user already exists', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', 'true');
    const inserts: string[] = [];
    const query: QueryFn = async text => {
      if (text.includes('SELECT 1 FROM auth.users')) {
        return { rows: [{ '?column?': 1 }] };
      }
      inserts.push(text);
      return { rows: [] };
    };

    const result = await runSpam({ query, faker: createSpamFaker(), hash });

    expect(result).toEqual({ seeded: false, adopters: 0, staff: 0 });
    expect(inserts).toHaveLength(0);
  });
});
