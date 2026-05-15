import type { QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Follow-up to ADS-422 (PR #415): align `file_uploads.url` with the
 * on-disk prefix.
 *
 * Post-writer-fix corruption risk: this migration is a data backfill whose
 * down() rewrites `file_uploads.url` / `thumbnail_url` back to the
 * pre-#421 broken `/uploads/<filename>` shape. Once writers downstream
 * (e.g. chat / application uploaders that COPY the URL into JSONB on
 * write) have stamped the corrected URL into other tables, reverting the
 * file_uploads source alone leaves those copies pointing at a URL whose
 * canonical form no longer matches. Operators must acknowledge the
 * destructive-down guard before running this rollback.
 *
 * The writer in `services/file-upload.service.ts` historically generated
 * URLs as `/uploads/<filename>` while multer placed the file at
 * `<uploadDir>/<prefix>/<filename>`. The `/uploads/*` route resolves the
 * request path relative to `<uploadDir>`, so any consumer that used the
 * stored URL got a 404 (or, worse, the wrong file if `<filename>`
 * collided across prefixes). The writer is fixed to emit
 * `/uploads/<prefix>/<filename>` for new rows; this migration backfills
 * the prefix into rows already in the table.
 *
 * Strategy: derive the prefix from `stored_filename`, which follows the
 * writer's convention `${uploadType}_${timestamp}_${uuid}${ext}`. This is
 * more reliable than `entity_type` (which doesn't 1:1 map to the on-disk
 * directory: `entity_type='application'` corresponds to prefix
 * `applications`) and works without joining other tables.
 *
 * Safety:
 *
 *   - Idempotent. Only matches rows whose `url` (or `thumbnail_url`)
 *     already lacks a prefix segment under `/uploads/`. A second run
 *     finds nothing to update because the rewritten rows now include
 *     the prefix.
 *   - Skips CDN / external URLs (anything starting with `http://` or
 *     `https://`) — those are explicit overrides we must preserve.
 *   - Skips rows whose `stored_filename` doesn't match the writer's
 *     `<prefix>_<...>` convention (e.g. legacy / hand-seeded rows whose
 *     URL is already correctly shaped, or whose filename uses a
 *     different naming scheme). These are left untouched rather than
 *     silently rewritten to the wrong place.
 *   - Wrapped in a single transaction (ADS-403). The table is small in
 *     this codebase and a single UPDATE..WHERE is far simpler than
 *     batched updates; if the table grows beyond ~100k rows the
 *     migration should be re-shaped to chunk by `created_at`.
 *
 * Down-migration: reverses the rewrite by stripping the prefix segment
 * from any URL whose path matches `/uploads/<prefix>/<filename>` and whose
 * `stored_filename` equals `<filename>`. Down() is therefore a true
 * inverse for rows this migration touched, and a no-op for rows it
 * didn't.
 */

const MIGRATION_KEY = '17-fix-fileupload-url-prefix';

// Keep this list in lock-step with `UPLOAD_CONFIG.directories` in
// `services/file-upload.service.ts`. New entries there require a new
// migration to backfill any rows written via that prefix.
const UPLOAD_PREFIXES = ['pets', 'applications', 'chat', 'profiles', 'documents', 'temp'] as const;

/**
 * SQL fragment that builds the corrected URL from the existing one. We
 * derive `<prefix>` from `stored_filename` (the part before the first
 * underscore — matches the writer's `${uploadType}_${timestamp}_...`
 * naming) and slot it in between `/uploads/` and the filename.
 *
 * Postgres-flavoured: uses `~` for regex match and `regexp_replace` /
 * `split_part` for extraction. Both are dialect-specific; the
 * accompanying tests skip on non-postgres.
 */
const FIX_URL_SQL = (column: 'url' | 'thumbnail_url'): string => `
  UPDATE file_uploads
     SET ${column} = '/uploads/' || split_part(stored_filename, '_', 1) || '/' || regexp_replace(${column}, '^/uploads/', '')
   WHERE ${column} IS NOT NULL
     AND ${column} ~ '^/uploads/[^/]+$'
     AND split_part(stored_filename, '_', 1) IN (${UPLOAD_PREFIXES.map(p => `'${p}'`).join(', ')})
`;

const REVERT_URL_SQL = (column: 'url' | 'thumbnail_url'): string => `
  UPDATE file_uploads
     SET ${column} = '/uploads/' || regexp_replace(${column}, '^/uploads/[^/]+/', '')
   WHERE ${column} IS NOT NULL
     AND ${column} ~ ('^/uploads/(' || '${UPLOAD_PREFIXES.join('|')}' || ')/[^/]+$')
     AND regexp_replace(${column}, '^/uploads/[^/]+/', '') = stored_filename
`;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.sequelize.query(FIX_URL_SQL('url'), { transaction: t });
      await queryInterface.sequelize.query(FIX_URL_SQL('thumbnail_url'), { transaction: t });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.sequelize.query(REVERT_URL_SQL('thumbnail_url'), { transaction: t });
      await queryInterface.sequelize.query(REVERT_URL_SQL('url'), { transaction: t });
    });
  },
};
