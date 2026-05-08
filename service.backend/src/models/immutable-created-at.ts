import { QueryTypes, ModelStatic, Model } from 'sequelize';
import sequelize from '../sequelize';
import logger from '../utils/logger';

/**
 * Install BEFORE UPDATE triggers that reject any UPDATE which mutates
 * `created_at`. Defence in depth against bad hooks, raw SQL, and
 * migration mistakes — the row's birthday should never change.
 *
 * Plan 5.5.10. Postgres-only. SQLite tests no-op.
 *
 * Called explicitly from the boot script after sequelize.sync() returns
 * — not as a Sequelize afterSync hook. Two reasons:
 *   - Boot-time setup runs once at a known point. Hooks fire on every
 *     sync (incl. dev HMR resyncs) and any mistake there blocks boot
 *     before the HTTP server comes up, which is a hard failure mode to
 *     diagnose without log access.
 *   - The intent ("after the schema exists, install DB-level
 *     invariants") reads naturally as boot-script code; an afterSync
 *     hook obscures it.
 *
 * Errors during installation are logged but not re-thrown — the trigger
 * is defence in depth, not a hard correctness requirement; we'd rather
 * boot without it and surface the error than wedge boot.
 */
export const installImmutableCreatedAtTriggers = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  models: ReadonlyArray<ModelStatic<Model<any, any>>>
): Promise<void> => {
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
    logger.error('[immutable-created-at] failed to create function', { err });
    return;
  }

  for (const model of models) {
    // Models with timestamps:false (audit_logs, *_status_transitions)
    // don't have a created_at column — they use purpose-specific names
    // like `timestamp` or `transitioned_at`. Skip them.
    if (model.options.timestamps === false) {
      continue;
    }
    // Models that opt out of just createdAt (e.g. revoked_tokens uses
    // `revoked_at` as its birthday and a separate `updated_at` for forward
    // compat — `createdAt: false`) don't have a `created_at` column either.
    if (model.options.createdAt === false) {
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
      logger.error(`[immutable-created-at] failed on ${tableName}`, { err });
    }
  }
};
