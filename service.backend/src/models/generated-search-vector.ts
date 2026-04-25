import { ModelStatic, Model, QueryTypes } from 'sequelize';
import sequelize from '../sequelize';

/**
 * Convert a model's `search_vector` column into a Postgres
 * `tsvector GENERATED ALWAYS AS (...) STORED` column.
 *
 * Sequelize's DDL generator can't emit GENERATED columns, so we let
 * `sync()` create the column as a regular tsvector first and then convert
 * it via raw SQL on the model's afterSync hook. This means:
 *
 *   - The column always reflects current row content — there's no JS
 *     hook that can be bypassed by raw queries, bulkInsert, etc.
 *   - Drift is impossible. The DB owns the value.
 *   - JS callers must NOT write to the column (Postgres rejects writes
 *     to a GENERATED column). The model's set() override on the
 *     attribute should be a no-op so Sequelize never includes it in
 *     INSERT/UPDATE statements.
 *
 * No-op for non-Postgres dialects. SQLite tests keep the regular
 * tsvector-as-TEXT column; tests don't exercise full-text search.
 *
 * Idempotent: if the column is already GENERATED ALWAYS, skip the swap
 * (avoids churn on repeated sync({ alter: true }) calls).
 */
export const installGeneratedSearchVector = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: ModelStatic<Model<any, any>>,
  options: {
    table: string;
    expression: string;
    indexName: string;
  }
): void => {
  model.addHook('afterSync', async () => {
    if (sequelize.getDialect() !== 'postgres') {
      return;
    }

    // information_schema reports `is_generated = 'ALWAYS'` for stored
    // generated columns. If we're already there, no need to rebuild.
    const rows = await sequelize.query<{ is_generated: string }>(
      `SELECT is_generated FROM information_schema.columns
       WHERE table_name = :table AND column_name = 'search_vector'`,
      { replacements: { table: options.table }, type: QueryTypes.SELECT }
    );
    if (rows[0]?.is_generated === 'ALWAYS') {
      return;
    }

    // Drop the GIN index first — the column drop would fail otherwise.
    await sequelize.query(`DROP INDEX IF EXISTS "${options.indexName}"`);
    await sequelize.query(`ALTER TABLE "${options.table}" DROP COLUMN IF EXISTS search_vector`);
    await sequelize.query(
      `ALTER TABLE "${options.table}" ADD COLUMN search_vector tsvector ` +
        `GENERATED ALWAYS AS (${options.expression}) STORED`
    );
    await sequelize.query(
      `CREATE INDEX "${options.indexName}" ON "${options.table}" USING gin (search_vector)`
    );
  });
};
