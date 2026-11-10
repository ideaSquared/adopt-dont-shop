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
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE applications SET pet_type = \$1, pet_breed = \$2/);
    expect(sql).toMatch(/WHERE pet_id = \$3/);
    expect(params).toEqual(['cat', 'Maine Coon', 'pet-1']);
  });

  it('clears the breed when the pet no longer has one', async () => {
    const { pool, query } = makePool();

    await applyPetUpdate(pool, { petId: 'pet-1', type: 'dog', breed: null });

    expect(query.mock.calls[0][1]).toEqual(['dog', null, 'pet-1']);
  });

  it('ignores an event without type, such as one from a pets service that predates the field', async () => {
    const { pool, query } = makePool();

    await applyPetUpdate(pool, { petId: 'pet-1', rescueId: 'rsc-1' });
    await applyPetUpdate(pool, { type: 'dog' });
    await applyPetUpdate(pool, 'not an object');

    expect(query).not.toHaveBeenCalled();
  });
});
