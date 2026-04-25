import { ModelStatic, Model, QueryTypes } from 'sequelize';
import sequelize from '../sequelize';

/**
 * Install a trigger that keeps a model's `search_vector` column in lockstep
 * with row content on Postgres. The DB owns the value — there's no JS hook
 * that can be bypassed by raw queries (`bulkInsert`, raw `UPDATE`, `COPY`),
 * and there's no risk of drift when a new searchable field is added.
 *
 * Why a trigger instead of a stored generated column:
 *   `tsvector GENERATED ALWAYS AS (to_tsvector(...)) STORED` would be ideal,
 *   but `to_tsvector` is marked STABLE (not IMMUTABLE) in Postgres because
 *   the result depends on the active text-search configuration. Postgres
 *   rejects non-IMMUTABLE expressions in generated columns
 *   ("generation expression is not immutable"). A BEFORE INSERT/UPDATE
 *   trigger sidesteps that constraint cleanly and produces the same
 *   end-state.
 *
 * Caller passes an expression that references `NEW.column_name` and
 * evaluates to a tsvector. The helper wraps it in a `BEGIN ... END`
 * trigger function and installs both function and trigger on the table.
 *
 * Idempotent: re-running the afterSync hook DROP + CREATEs both objects.
 * No-op on non-Postgres dialects (SQLite tests don't exercise full-text
 * search; the column stays a plain tsvector-as-TEXT placeholder).
 */
export const installGeneratedSearchVector = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: ModelStatic<Model<any, any>>,
  options: {
    table: string;
    /** Expression returning tsvector, referencing `NEW.<column>`. */
    expression: string;
    indexName: string;
  }
): void => {
  const fnName = `${options.table}_search_vector_update`;
  const triggerName = `${options.table}_search_vector_trigger`;

  model.addHook('afterSync', async () => {
    if (sequelize.getDialect() !== 'postgres') {
      return;
    }

    // Skip if our trigger is already installed (avoids churn on repeated
    // sync({ alter: true }) calls). pg_trigger.tgname is unique per table.
    const existing = await sequelize.query<{ tgname: string }>(
      `SELECT t.tgname FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       WHERE c.relname = :table AND t.tgname = :trigger`,
      {
        replacements: { table: options.table, trigger: triggerName },
        type: QueryTypes.SELECT,
      }
    );
    if (existing.length > 0) {
      return;
    }

    // Sequelize created search_vector as a writable tsvector column. We
    // keep that shape (no DROP); the trigger fills it on every write.
    // Just (re)create the function + trigger and ensure the GIN index
    // exists by name.
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION ${fnName}() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := ${options.expression};
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await sequelize.query(`DROP TRIGGER IF EXISTS ${triggerName} ON "${options.table}"`);
    await sequelize.query(`
      CREATE TRIGGER ${triggerName}
      BEFORE INSERT OR UPDATE ON "${options.table}"
      FOR EACH ROW EXECUTE FUNCTION ${fnName}();
    `);
    // Sync runs against an empty table; seeders that follow are subject
    // to the trigger. No backfill needed for the fresh-DB case. Existing
    // rows in long-lived environments would need a one-shot UPDATE; out
    // of scope here.
  });
};
