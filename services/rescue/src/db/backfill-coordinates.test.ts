import { describe, expect, it, vi } from 'vitest';

import { backfillRescueCoordinates, formatBackfillSummary } from './backfill-coordinates.js';

describe('formatBackfillSummary', () => {
  it('says everything was geocoded when nothing was skipped', () => {
    expect(formatBackfillSummary({ updated: 3, skipped: 0 })).toBe(
      'Geocoded 3 rescue(s); none left without coordinates.'
    );
  });

  it('tells the user how many were skipped and how to retry, since offline looks like skipped', () => {
    const message = formatBackfillSummary({ updated: 1, skipped: 4 });

    expect(message).toContain('4 could not be geocoded');
    expect(message).toContain('offline');
    expect(message).toContain('pnpm --filter @adopt-dont-shop/service.rescue backfill:coordinates');
  });
});

describe('backfillRescueCoordinates', () => {
  it('geocodes rescues missing coordinates and leaves unresolvable ones for the next run', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          { rescue_id: 'r-1', zip_code: 'SW1A 1AA' },
          { rescue_id: 'r-2', zip_code: 'ZZ9 9ZZ' },
        ],
      })
      .mockResolvedValue({ rows: [], rowCount: 1 });
    const geocode = vi
      .fn()
      .mockResolvedValueOnce({ latitude: 51.5, longitude: -0.12 })
      .mockResolvedValueOnce(undefined);

    const result = await backfillRescueCoordinates({ query }, geocode);

    expect(result).toEqual({ updated: 1, skipped: 1 });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][1]).toEqual([51.5, -0.12, 'r-1', 'SW1A 1AA']);
    expect(query.mock.calls[0][0]).toMatch(/latitude IS NULL/);
  });

  it('writes only when the postcode and missing coordinates still match, and counts real writes', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ rescue_id: 'r-1', zip_code: 'SW1A 1AA' }] })
      // The rescue's postcode changed after the SELECT, so the guarded UPDATE matches no row.
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const geocode = vi.fn().mockResolvedValue({ latitude: 51.5, longitude: -0.12 });

    const result = await backfillRescueCoordinates({ query }, geocode);

    const sql = String(query.mock.calls[1][0]);
    expect(sql).toMatch(/zip_code = \$4/);
    expect(sql).toMatch(/latitude IS NULL OR longitude IS NULL/);
    expect(result).toEqual({ updated: 0, skipped: 1 });
  });
});
