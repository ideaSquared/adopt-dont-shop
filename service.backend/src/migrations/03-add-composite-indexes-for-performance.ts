import { QueryInterface } from 'sequelize';

/**
 * Add composite indexes for hot queries across the application:
 *
 * - applications(rescue_id, status, created_at DESC) for rescue dashboard queries
 * - messages(chat_id, created_at DESC) for chat timeline pagination
 * - cms_content(last_modified_by) for audit trails
 * - cms_navigation_menus(created_by, updated_by) for audit queries
 *
 * These indexes reduce query planning overhead and enable single-pass scans.
 * Resolves ADS-226, ADS-227, ADS-259.
 *
 * Idempotency note: each addIndex was replaced with raw `CREATE INDEX IF NOT
 * EXISTS` so this migration coexists with the per-model rebaseline baselines
 * (#441-450). `messages_chat_created_idx` is declared on the `Message` model's
 * `indexes:` block and is therefore emitted by `00-baseline-031-messages.ts`.
 * The other four indexes do not currently collide with any baseline file, but
 * are wrapped in the same IF NOT EXISTS pattern as a guard against future
 * model-side index declarations adding the same names. Same approach as #451.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize;

  // ADS-226: Rescue dashboard's primary query filters by (rescue_id, status)
  // and orders by created_at. The composite index allows Postgres to skip
  // the heap entirely and perform a single index range scan.
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "applications_rescue_status_created_idx" ' +
      'ON "applications" ("rescue_id", "status", "created_at" DESC)'
  );

  // ADS-227: Every chat timeline query paginates with
  // WHERE chat_id = ? ORDER BY created_at DESC. The composite index
  // enables a single index range scan instead of heap lookups + sort.
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "messages_chat_created_idx" ' +
      'ON "messages" ("chat_id", "created_at" DESC)'
  );

  // ADS-259: CMS audit queries filter by last_modified_by to show
  // "everything this admin edited". Postgres needs an index to avoid
  // sequential scans. This mirrors the existing index on author_id.
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "cms_content_last_modified_by_idx" ' +
      'ON "cms_content" ("last_modified_by")'
  );

  // ADS-259: Navigation menu audit queries filter by created_by and
  // updated_by (the audit columns). These prevent sequential scans during
  // user deletion cascades or audit lookups. Note: auditIndexes helper
  // provides these automatically, but we add them explicitly here for
  // clarity and schema versioning.
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "cms_nav_created_by_idx" ' +
      'ON "cms_navigation_menus" ("created_by")'
  );

  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "cms_nav_updated_by_idx" ' +
      'ON "cms_navigation_menus" ("updated_by")'
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Drop in reverse order. Down is intentionally unchanged — per the
  // per-model rebaseline design doc, rollback for rebaseline-coexistent
  // migrations is via DB backup, not `db:migrate:undo`.
  await queryInterface.removeIndex('cms_navigation_menus', 'cms_nav_updated_by_idx');
  await queryInterface.removeIndex('cms_navigation_menus', 'cms_nav_created_by_idx');
  await queryInterface.removeIndex('cms_content', 'cms_content_last_modified_by_idx');
  await queryInterface.removeIndex('messages', 'messages_chat_created_idx');
  await queryInterface.removeIndex('applications', 'applications_rescue_status_created_idx');
}
