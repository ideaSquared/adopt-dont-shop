import { describe, expect, it, vi } from 'vitest';

import { backfillRescueCoordinates } from './backfill-coordinates.js';

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
      .mockResolvedValue({ rows: [] });
    const geocode = vi
      .fn()
      .mockResolvedValueOnce({ latitude: 51.5, longitude: -0.12 })
      .mockResolvedValueOnce(undefined);

    const result = await backfillRescueCoordinates({ query }, geocode);

    expect(result).toEqual({ updated: 1, skipped: 1 });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][1]).toEqual([51.5, -0.12, 'r-1']);
    expect(query.mock.calls[0][0]).toMatch(/latitude IS NULL/);
  });
});
