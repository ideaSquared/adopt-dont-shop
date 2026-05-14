import type { QueryInterface } from 'sequelize';

/**
 * Original purpose: create `revoked_tokens` plus two single-column indexes.
 *
 * Idempotency note (follow-up to #451 / #454): the per-model rebaseline now
 * ships `00-baseline-007-revoked-tokens.ts`, which creates the same table +
 * indexes for fresh DBs. On a fresh DB `db:migrate` runs the baseline first,
 * so by the time this migration's `up()` fires the relations already exist
 * and the default `createTable` / `addIndex` calls error with
 * "relation already exists". Replaced with raw `CREATE TABLE IF NOT EXISTS`
 * + `CREATE INDEX IF NOT EXISTS` so the migration coexists with the per-model
 * baseline AND with the pre-rebaseline monolithic `00-baseline.ts` (which
 * does not create `revoked_tokens` until the model is loaded by sync()).
 *
 * `down()` is intentionally unchanged — per the rebaseline design doc,
 * rollback is via DB backup, not `db:migrate:undo`.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const sequelize = queryInterface.sequelize;

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "revoked_tokens" (
      "jti" VARCHAR(255) NOT NULL PRIMARY KEY,
      "user_id" VARCHAR(255) NOT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "revoked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "revoked_tokens_expires_at_idx" ON "revoked_tokens" ("expires_at")'
  );
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS "revoked_tokens_user_id_idx" ON "revoked_tokens" ("user_id")'
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('revoked_tokens');
}
