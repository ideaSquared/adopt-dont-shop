import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildRescueRows, buildStaffRows, runSpam, spamRescues, type QueryFn } from './spam.js';

const RESCUE = { rescue_id: 0, name: 1, email: 2 } as const;
const STAFF = { staff_member_id: 0, rescue_id: 1, user_id: 2 } as const;

describe('buildRescueRows', () => {
  it('derives deterministic ids + emails from the rescue index', () => {
    const rows = buildRescueRows(createSpamFaker(), 3);
    expect(rows[0][RESCUE.rescue_id]).toBe(seededUuid('rescue-0'));
    expect(rows[0][RESCUE.email]).toBe('rescue0@example.test');
    expect(rows[2][RESCUE.rescue_id]).toBe(seededUuid('rescue-2'));
  });

  it('gives every rescue a distinct real-sounding name (name is UNIQUE)', () => {
    // 20 > the name pool, so this also covers the numeric-suffix overflow path.
    const rows = buildRescueRows(createSpamFaker(), 20);
    const names = rows.map(r => r[RESCUE.name]);
    expect(new Set(names).size).toBe(20);
    expect(names[0]).toMatch(/[A-Za-z]/);
  });

  it('is deterministic — same seed yields identical rows', () => {
    const now = new Date(0);
    expect(buildRescueRows(createSpamFaker(), 5, now)).toEqual(
      buildRescueRows(createSpamFaker(), 5, now)
    );
  });
});

describe('buildStaffRows', () => {
  it('links staff computed from the auth key scheme, spread across rescues', () => {
    const rows = buildStaffRows(createSpamFaker(), 3, 2);
    expect(rows[0][STAFF.user_id]).toBe(seededUuid('staff-0'));
    expect(rows[0][STAFF.staff_member_id]).toBe(seededUuid('staffmember-0'));
    // index 2 wraps back onto rescue-0 (2 rescues).
    expect(rows[2][STAFF.rescue_id]).toBe(seededUuid('rescue-0'));
  });
});

describe('spamRescues', () => {
  it('inserts rescues and staff idempotently (ON CONFLICT DO NOTHING)', async () => {
    const calls: Array<{ text: string }> = [];
    const query: QueryFn = async text => {
      calls.push({ text });
      return { rows: [] };
    };

    const result = await spamRescues({ query, faker: createSpamFaker(), rescues: 3, staff: 4 });

    expect(result).toEqual({ rescues: 3, staff: 4 });
    const rescueInsert = calls.find(c => c.text.includes('INTO rescue.rescues'));
    const staffInsert = calls.find(c => c.text.includes('INTO rescue.staff_members'));
    expect(rescueInsert?.text).toMatch(/ON CONFLICT \(rescue_id\) DO NOTHING/);
    expect(staffInsert?.text).toMatch(/ON CONFLICT \(staff_member_id\) DO NOTHING/);
  });
});

describe('runSpam', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('seeds when the flag is unset (manual command)', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', '');
    const inserts: string[] = [];
    const query: QueryFn = async text => {
      if (text.includes('INTO')) {
        inserts.push(text);
      }
      return { rows: [] };
    };

    const result = await runSpam({ query, faker: createSpamFaker() });

    expect(result.seeded).toBe(true);
    expect(inserts.some(t => t.includes('INTO rescue.rescues'))).toBe(true);
  });

  it('skips on boot when the anchor rescue already exists', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', 'true');
    const inserts: string[] = [];
    const query: QueryFn = async text => {
      if (text.includes('SELECT 1 FROM rescue.rescues')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (text.includes('INTO')) {
        inserts.push(text);
      }
      return { rows: [] };
    };

    const result = await runSpam({ query, faker: createSpamFaker() });

    expect(result).toEqual({ seeded: false, rescues: 0, staff: 0 });
    expect(inserts).toHaveLength(0);
  });
});
