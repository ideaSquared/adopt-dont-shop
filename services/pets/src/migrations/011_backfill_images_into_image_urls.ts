import type { MigrationBuilder } from 'node-pg-migrate';

// One authoritative photo list: extra_json.image_urls.
//
// Photos used to be stored under two keys — `image_urls` (the image routes)
// and a bare `images` (the create/update body packed it there). The two
// drifted: removing a photo only touched image_urls, so it came back from
// the `images` copy. Writes now only ever produce image_urls (see the pets
// handlers' canonical image list); this folds the existing `images` values
// in and drops the key.
//
// Per row: image_urls entries first, then images, string values only,
// deduped keeping each url's earliest position. Idempotent — the WHERE
// clause only matches rows that still have the `images` key, which the
// UPDATE removes, so a re-run touches nothing.

const BACKFILL_SQL = `
UPDATE pets.pets
SET extra_json = (extra_json - 'images') || jsonb_build_object(
  'image_urls',
  COALESCE(
    (
      SELECT jsonb_agg(url ORDER BY first_pos)
      FROM (
        SELECT url, MIN(pos) AS first_pos
        FROM (
          SELECT e.value #>> '{}' AS url, e.ordinality AS pos
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(extra_json -> 'image_urls') = 'array'
                 THEN extra_json -> 'image_urls' ELSE '[]'::jsonb END
          ) WITH ORDINALITY AS e(value, ordinality)
          WHERE jsonb_typeof(e.value) = 'string'
          UNION ALL
          SELECT e.value #>> '{}' AS url, 1000000 + e.ordinality AS pos
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(extra_json -> 'images') = 'array'
                 THEN extra_json -> 'images' ELSE '[]'::jsonb END
          ) WITH ORDINALITY AS e(value, ordinality)
          WHERE jsonb_typeof(e.value) = 'string'
        ) all_urls
        WHERE url <> ''
        GROUP BY url
      ) deduped
    ),
    '[]'::jsonb
  )
)
WHERE extra_json ? 'images'
`;

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(BACKFILL_SQL);
};

// The original split between the two keys can't be reconstructed, and
// image_urls alone is a valid state for the code before this change.
export const down = async (): Promise<void> => {};
