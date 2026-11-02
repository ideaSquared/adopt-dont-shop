import { BREEDS_BY_SPECIES } from '@adopt-dont-shop/seed-faker';
import { describe, expect, it } from 'vitest';

import { seedBreeds, type QueryFn } from './seed.js';

function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return undefined;
  };
  return { query, calls };
}

describe('pets seed (breeds)', () => {
  it('plants every canonical breed once, idempotently on (species, name)', async () => {
    const total = Object.values(BREEDS_BY_SPECIES).reduce((n, b) => n + b.length, 0);
    const { query, calls } = recordingQuery();

    const seeded = await seedBreeds({ query });

    expect(seeded).toBe(total);
    expect(calls).toHaveLength(total);
    for (const call of calls) {
      expect(call.text).toMatch(/ON CONFLICT \(species, name\) DO NOTHING/);
    }
  });

  it('gives breeds deterministic ids so pets reference the same id across runs', async () => {
    const a = recordingQuery();
    await seedBreeds({ query: a.query });
    const b = recordingQuery();
    await seedBreeds({ query: b.query });

    expect(a.calls.map(c => c.values[0])).toEqual(b.calls.map(c => c.values[0]));
  });
});
