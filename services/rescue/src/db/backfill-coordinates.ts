// One-shot, idempotent backfill: geocode the postcode of every UK rescue that
// has no coordinates yet (rescues created before migration 014, or whose
// lookup failed at the time). Run by hand:
//
//   pnpm --filter @adopt-dont-shop/service.rescue backfill:coordinates
//
// Rescues whose postcode still can't be geocoded are left NULL and retried on
// the next run. Lookups are sequential to stay polite to the free geocoder.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import type { Pool } from 'pg';

import { loadConfig } from '../config.js';
import { createPostcodesIoGeocoder, type Geocoder } from '../geocode.js';

type PendingRescue = { rescue_id: string; zip_code: string };

export async function backfillRescueCoordinates(
  pool: Pick<Pool, 'query'>,
  geocode: Geocoder
): Promise<{ updated: number; skipped: number }> {
  const { rows } = await pool.query<PendingRescue>(
    `SELECT rescue_id, zip_code
       FROM rescue.rescues
      WHERE deleted_at IS NULL
        AND country = 'GB'
        AND (latitude IS NULL OR longitude IS NULL)`
  );

  let updated = 0;
  for (const { rescue_id, zip_code } of rows) {
    const coordinates = await geocode(zip_code);
    if (coordinates === undefined) {
      continue;
    }
    // Guarded on the postcode we geocoded and on still-missing coordinates: if the
    // rescue's postcode changed (or was geocoded by a concurrent update) since
    // the SELECT, this writes nothing instead of overwriting newer coordinates
    // with the old postcode's location.
    const result = await pool.query(
      `UPDATE rescue.rescues
          SET latitude = $1, longitude = $2
        WHERE rescue_id = $3
          AND zip_code = $4
          AND country = 'GB'
          AND deleted_at IS NULL
          AND (latitude IS NULL OR longitude IS NULL)`,
      [coordinates.latitude, coordinates.longitude, rescue_id, zip_code]
    );
    updated += result.rowCount ?? 0;
  }
  return { updated, skipped: rows.length - updated };
}

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.rescue' });
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const result = await backfillRescueCoordinates(pool, createPostcodesIoGeocoder());
    logger.info('rescue coordinates backfill complete', result);
  } finally {
    await pool.end();
  }
};

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
