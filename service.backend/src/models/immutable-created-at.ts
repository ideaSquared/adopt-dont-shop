import { QueryTypes, ModelStatic, Model } from 'sequelize';
import sequelize from '../sequelize';

/**
 * Install BEFORE UPDATE triggers that reject any UPDATE which mutates
 * `created_at`. Defence in depth against bad hooks, raw SQL, and
 * migration mistakes — the row's birthday should never change.
 *
 * Plan 5.5.10. Postgres-only. SQLite tests no-op the whole helper.
 *
 * Implemented as a single sequelize-level afterSync hook (rather than
 * one per model) so the shared trigger function is created exactly once
 * and the per-table installation walks the model registry in a single
 * pass. The WHEN clause means normal UPDATEs pay only dispatch overhead;
 * only created_at-touching UPDATEs raise.
 *
 * Idempotent: pg_trigger lookup short-circuits if the trigger already
 * exists, so repeat sync() calls don't churn.
 *
 * Errors during installation are logged but not re-thrown — the trigger
 * is defence in depth, not a hard correctness requirement; we don't want
 * a hook bug to take down backend boot.
 */
export const installImmutableCreatedAtTriggers = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  models: ReadonlyArray<ModelStatic<Model<any, any>>>
): void => {
  sequelize.afterSync(async () => {
    if (sequelize.getDialect() !== 'postgres') {
      return;
    }

    try {
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION raise_immutable_created_at() RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'created_at is immutable on table %', TG_TABLE_NAME
            USING ERRCODE = 'integrity_constraint_violation';
        END;
        $$ LANGUAGE plpgsql;
      `);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[immutable-created-at] failed to create function:', err);
      return;
    }

    for (const model of models) {
      // Models with timestamps:false (audit_logs, *_status_transitions)
      // don't have a created_at column — they use purpose-specific names
      // like `timestamp` or `transitioned_at`. Skip them.
      if (model.options.timestamps === false) {
        continue;
      }

      const rawTable = model.getTableName();
      const tableName = typeof rawTable === 'string' ? rawTable : rawTable.tableName;
      const triggerName = `${tableName}_created_at_immutable`;

      try {
        const existing = await sequelize.query<{ tgname: string }>(
          `SELECT t.tgname FROM pg_trigger t
           JOIN pg_class c ON c.oid = t.tgrelid
           WHERE c.relname = :table AND t.tgname = :trigger`,
          {
            replacements: { table: tableName, trigger: triggerName },
            type: QueryTypes.SELECT,
          }
        );
        if (existing.length > 0) {
          continue;
        }

        await sequelize.query(`
          CREATE TRIGGER ${triggerName}
          BEFORE UPDATE ON "${tableName}"
          FOR EACH ROW WHEN (OLD."created_at" IS DISTINCT FROM NEW."created_at")
          EXECUTE FUNCTION raise_immutable_created_at();
        `);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[immutable-created-at] failed on ${tableName}:`, err);
      }
    }
  });
};
