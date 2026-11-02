import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SEED_LOCATIONS } from './seed-locations.js';
import {
  buildRescueRows,
  buildStaffRows,
  repairSeededLocations,
  runSpam,
  spamRescues,
  type QueryFn,
} from './spam.js';

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

describe('buildRescueRows locations', () => {
  const LOCATION = { city: 4, zip_code: 5, latitude: 6, longitude: 7 } as const;

  it('gives each rescue a real postcode, its city and coordinates, with no network', () => {
    const rows = buildRescueRows(createSpamFaker(), 3);

    rows.forEach((row, i) => {
      const expected = SEED_LOCATIONS[i];
      expect(row[LOCATION.city]).toBe(expected.city);
      expect(row[LOCATION.zip_code]).toBe(expected.postcode);
      expect(row[LOCATION.latitude]).toBe(expected.latitude);
      expect(row[LOCATION.longitude]).toBe(expected.longitude);
    });
  });

  it('puts the seeded columns in the order the INSERT lists them', () => {
    const calls: Array<{ text: string }> = [];
    const query: QueryFn = async text => {
      calls.push({ text });
      return { rows: [] };
    };
    return spamRescues({ query, faker: createSpamFaker(), rescues: 1, staff: 0 }).then(() => {
      const insert = calls.find(c => c.text.includes('INTO rescue.rescues'))?.text ?? '';
      expect(insert).toMatch(
        /\(rescue_id, name, email, address, city, zip_code, latitude, longitude,/
      );
    });
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

// A synthetic rescue as an older seed left it: right id/email, faker postcode.
const oldRescueRow = (index: number, zip_code = 'RG50 83E') => ({
  rescue_id: seededUuid(`rescue-${index}`),
  email: `rescue${index}@example.test`,
  zip_code,
});

describe('repairSeededLocations', () => {
  const run = async (rows: ReturnType<typeof oldRescueRow>[]) => {
    const updates: Array<readonly unknown[]> = [];
    const query: QueryFn = async (text, values) => {
      if (text.includes('UPDATE rescue.rescues')) {
        updates.push(values);
      }
      return { rows };
    };
    const repaired = await repairSeededLocations(query);
    return { repaired, updates };
  };

  it('fixes every old synthetic rescue, including ones past the current default count of 8', async () => {
    // A DB once seeded with 16 rescues, booted with the default 8.
    const rows = Array.from({ length: 16 }, (_, i) => oldRescueRow(i));

    const { repaired, updates } = await run(rows);

    expect(repaired).toBe(16);
    expect(updates).toHaveLength(16);
    SEED_LOCATIONS.forEach((location, i) => {
      expect(updates[i]).toEqual([
        seededUuid(`rescue-${i}`),
        location.city,
        location.postcode,
        location.latitude,
        location.longitude,
      ]);
    });
  });

  it('leaves rescues that already have their table postcode alone', async () => {
    const { repaired, updates } = await run([oldRescueRow(2, SEED_LOCATIONS[2].postcode)]);

    expect(repaired).toBe(0);
    expect(updates).toHaveLength(0);
  });

  it('never touches a rescue that merely looks synthetic (id does not match its email)', async () => {
    const { repaired } = await run([
      { rescue_id: seededUuid('rescue-9'), email: 'rescue3@example.test', zip_code: 'AB1 2CD' },
      { rescue_id: seededUuid('rescue-1'), email: 'rescue1x@example.test', zip_code: 'AB1 2CD' },
    ]);

    expect(repaired).toBe(0);
  });

  it('wraps past the end of the table like the planter does', async () => {
    const { updates } = await run([oldRescueRow(17)]);

    expect(updates[0]?.[2]).toBe(SEED_LOCATIONS[1].postcode);
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

  it('repairs old postcodes even when the DB is already populated and boot skips planting', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', 'true');
    const updates: Array<{ text: string; values: readonly unknown[] }> = [];
    const query: QueryFn = async (text, values) => {
      if (text.includes('SELECT 1 FROM rescue.rescues')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (text.includes('SELECT rescue_id, email, zip_code')) {
        return { rows: [oldRescueRow(0)] };
      }
      if (text.includes('UPDATE rescue.rescues')) {
        updates.push({ text, values });
      }
      return { rows: [] };
    };

    const result = await runSpam({ query, faker: createSpamFaker() });

    expect(result.seeded).toBe(false);
    expect(updates).toHaveLength(1);
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
