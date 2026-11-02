import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { PET_VIEWS_RETENTION_DAYS, prunePetViews } from './prune-pet-views.js';

describe('prunePetViews', () => {
  it('deletes only rows older than the retention window and reports how many', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 12 });
    const pool = { query } as unknown as Pool;

    const deleted = await prunePetViews(pool);

    expect(deleted).toBe(12);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM pets\.pet_views/);
    expect(sql).toMatch(/viewed_at < now\(\) - \(\$1 \* interval '1 day'\)/);
    expect(params).toEqual([PET_VIEWS_RETENTION_DAYS]);
  });

  it('keeps the window comfortably longer than the 24h the label reads', () => {
    expect(PET_VIEWS_RETENTION_DAYS).toBeGreaterThanOrEqual(2);
  });

  it('reports zero when the driver gives no row count', async () => {
    const pool = { query: vi.fn().mockResolvedValue({}) } as unknown as Pool;
    expect(await prunePetViews(pool)).toBe(0);
  });
});
