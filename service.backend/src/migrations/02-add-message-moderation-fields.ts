import type { QueryInterface } from 'sequelize';

/**
 * Original purpose: add 5 moderation fields + 4 indexes to `messages`.
 *
 * Idempotency note (follow-up to #451 / #454): the `Message` model's
 * declaration now includes the moderation columns, so `00-baseline-031-messages.ts`
 * creates them via `createTable`'s column list and `sync()` does the same on
 * its own. The original `addColumn` / `addIndex` calls collide on a fresh DB
 * once the per-model baseline has run. Patched to use raw
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
 * so the migration is a no-op on fresh-DB-with-baseline and still meaningful
 * on existing-DB-from-old-monolithic-baseline.
 *
 * ENUM types are inline-declared by `DataTypes.ENUM(...)` in the model, so
 * the ENUM types `enum_messages_flag_severity` and
 * `enum_messages_moderation_status` already exist when this migration runs
 * on a fresh DB. We reference them by name in the `ALTER TABLE` calls.
 *
 * `down()` is intentionally unchanged.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize;

  // ENUM types are auto-created by either `00-baseline-031-messages.ts` or
  // `00-baseline.ts`'s `sync()` (whichever runs first on this DB). Pre-emptively
  // create them here so we can be hit standalone on a pre-rebaseline DB too.
  await sequelize.query(
    `DO $$ BEGIN
       CREATE TYPE "enum_messages_flag_severity" AS ENUM ('low', 'medium', 'high', 'critical');
     EXCEPTION WHEN duplicate_object THEN null; END $$`
  );
  await sequelize.query(
    `DO $$ BEGIN
       CREATE TYPE "enum_messages_moderation_status" AS ENUM ('pending_review', 'approved', 'rejected');
     EXCEPTION WHEN duplicate_object THEN null; END $$`
  );

  await sequelize.query(
    'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_flagged" BOOLEAN NOT NULL DEFAULT FALSE'
  );
  await sequelize.query(
    'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "flag_reason" VARCHAR(255)'
  );
  await sequelize.query(
    'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "flag_severity" "enum_messages_flag_severity"'
  );
  await sequelize.query(
    'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "moderation_status" "enum_messages_moderation_status"'
  );
  await sequelize.query(
    'ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "flagged_at" TIMESTAMP WITH TIME ZONE'
  );

  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "messages_is_flagged_idx" ON "messages" ("is_flagged")'
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "messages_flag_severity_idx" ON "messages" ("flag_severity")'
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "messages_moderation_status_idx" ON "messages" ("moderation_status")'
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "messages_flagged_queue_idx" ON "messages" ("is_flagged", "moderation_status")'
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('messages', 'messages_flagged_queue_idx');
  await queryInterface.removeIndex('messages', 'messages_moderation_status_idx');
  await queryInterface.removeIndex('messages', 'messages_flag_severity_idx');
  await queryInterface.removeIndex('messages', 'messages_is_flagged_idx');

  await queryInterface.removeColumn('messages', 'flagged_at');
  await queryInterface.removeColumn('messages', 'moderation_status');
  await queryInterface.removeColumn('messages', 'flag_severity');
  await queryInterface.removeColumn('messages', 'flag_reason');
  await queryInterface.removeColumn('messages', 'is_flagged');
}
