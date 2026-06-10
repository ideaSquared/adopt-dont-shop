import { describe, expect, it } from 'vitest';

import { seedRescues, type QueryFn } from './seed.js';
import { SEED_RESCUES, SEED_STAFF } from './seed-data.js';

function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return undefined;
  };
  return { query, calls };
}

describe('rescue seed', () => {
  it('seeds every rescue and staff link', async () => {
    const { query, calls } = recordingQuery();

    const seeded = await seedRescues({ query });

    expect(calls).toHaveLength(SEED_RESCUES.length + SEED_STAFF.length);
    expect(seeded).toEqual(SEED_RESCUES.map(r => r.name));
  });

  it('seeds rescues as verified so the public "view a rescue" path works', async () => {
    const { query, calls } = recordingQuery();

    await seedRescues({ query });

    const rescueCalls = calls.filter(c => c.text.includes('rescue.rescues'));
    expect(rescueCalls).toHaveLength(SEED_RESCUES.length);
    for (const call of rescueCalls) {
      expect(call.text).toContain("'verified'");
    }
  });

  it('links staff to their rescue using the pinned auth user ids', async () => {
    const { query, calls } = recordingQuery();

    await seedRescues({ query });

    const staffCalls = calls.filter(c => c.text.includes('rescue.staff_members'));
    const userIds = staffCalls.map(c => c.values[2]);
    expect(userIds).toContain('b0000000-0000-4000-8000-000000000001');
  });

  it('is idempotent — every insert uses ON CONFLICT DO UPDATE', async () => {
    const { query, calls } = recordingQuery();

    await seedRescues({ query });

    for (const call of calls) {
      expect(call.text).toMatch(/ON CONFLICT[\s\S]*DO UPDATE/);
    }

    const second = recordingQuery();
    await seedRescues({ query: second.query });
    expect(second.calls).toHaveLength(calls.length);
  });
});
