import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { applyPetUpdate } from './pet-updates.js';

const makePool = () => {
  const query = vi.fn().mockResolvedValue({ rowCount: 2, rows: [] });
  return { pool: { query } as unknown as Pool, query };
};

describe('applyPetUpdate', () => {
  it("rewrites the pet's type and breed on its applications when the pet changes", async () => {
    const { pool, query } = makePool();

    await applyPetUpdate(pool, {
      petId: 'pet-1',
      rescueId: 'rsc-1',
      type: 'cat',
      breed: 'Maine Coon',
      version: 7,
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/SET pet_type = \$1, pet_breed = \$2, pet_version = \$4/);
    expect(sql).toMatch(/WHERE pet_id = \$3/);
    expect(params).toEqual(['cat', 'Maine Coon', 'pet-1', 7]);
  });

  it('clears the breed when the pet no longer has one', async () => {
    const { pool, query } = makePool();

    await applyPetUpdate(pool, { petId: 'pet-1', type: 'dog', breed: null, version: 3 });

    expect(query.mock.calls[0][1]).toEqual(['dog', null, 'pet-1', 3]);
  });

  it('only applies an edit newer than the one already stored, so a late redelivery cannot win', async () => {
    const { pool, query } = makePool();

    await applyPetUpdate(pool, { petId: 'pet-1', type: 'dog', breed: null, version: 3 });

    expect(query.mock.calls[0][0]).toMatch(/pet_version IS NULL OR pet_version < \$4/);
  });

  it('ignores an event without type or version, such as one from a pets service that predates them', async () => {
    const { pool, query } = makePool();

    await applyPetUpdate(pool, { petId: 'pet-1', rescueId: 'rsc-1' });
    await applyPetUpdate(pool, { petId: 'pet-1', type: 'dog', breed: null });
    await applyPetUpdate(pool, { type: 'dog' });
    await applyPetUpdate(pool, 'not an object');

    expect(query).not.toHaveBeenCalled();
  });
});
