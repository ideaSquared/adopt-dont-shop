import { ModelStatic, Model, QueryTypes } from 'sequelize';
import sequelize from '../sequelize';

/**
 * Install a BEFORE UPDATE trigger that rejects any UPDATE which mutates
 * `created_at`. Defence in depth against bad hooks, raw SQL, and migration
 * mistakes — the row's birthday should never change.
 *
 * Plan 5.5.10: every transactional table gets this trigger, applied via
 * the same `addHook('afterSync', ...)` mechanism used by
 * installStatusTransitionTrigger / installGeneratedSearchVector. The
 * SQLite test path is a no-op (the same dialect-skip those helpers use).
 *
 * The shared trigger function lives at the schema level and is created
 * once with CREATE OR REPLACE, then per-table triggers reference it. Per
 * Postgres semantics the WHEN (OLD.created_at IS DISTINCT FROM
 * NEW.created_at) clause skips the trigger body entirely on no-op
 * UPDATEs, so this is essentially free for the normal write path.
 *
 * Idempotent: pg_trigger lookup short-circuits if the per-table trigger
 * already exists, so repeat sync() calls don't churn.
 */
export const installImmutableCreatedAtTrigger = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: ModelStatic<Model<any, any>>
): void => {
  // Models with timestamps:false (audit_logs, *_status_transitions) don't
  // have a created_at column at all — they use purpose-specific names like
  // `timestamp` or `transitioned_at`. Those are append-only by convention
  // already; the trigger isn't needed (and would fail to install).
  if (model.options.timestamps === false) {
    return;
  }

  const rawTable = model.getTableName();
  const tableName = typeof rawTable === 'string' ? rawTable : rawTable.tableName;
  const triggerName = `${tableName}_created_at_immutable`;

  // The DB column name is whatever Sequelize mapped the createdAt timestamp
  // to. With `underscored: true` it's `created_at`, but a handful of legacy
  // models (ModeratorAction, Report, Rescue, UserSanction) override
  // `createdAt: 'createdAt'` to keep the column camelCase — the slice 1.3
  // naming-convention cleanup will normalise that, but until then we
  // honour whatever the model declares.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdAtAttr = (model.rawAttributes as Record<string, any>).createdAt;
  const createdAtColumn = createdAtAttr?.field ?? 'created_at';

  model.addHook('afterSync', async () => {
    if (sequelize.getDialect() !== 'postgres') {
      return;
    }

    // Shared function: one per database, raises a SQLSTATE 23000
    // (integrity_constraint_violation) so callers see a recognisable
    // class of error rather than an opaque internal exception.
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION raise_immutable_created_at() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'created_at is immutable on table %', TG_TABLE_NAME
          USING ERRCODE = '23000';
      END;
      $$ LANGUAGE plpgsql;
    `);

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
      return;
    }

    // The WHEN clause means the trigger body only fires when created_at
    // actually changed — UPDATEs that don't touch created_at pay only the
    // trigger-dispatch overhead (microseconds), not the function call.
    await sequelize.query(`
      CREATE TRIGGER ${triggerName}
      BEFORE UPDATE ON "${tableName}"
      FOR EACH ROW WHEN (OLD."${createdAtColumn}" IS DISTINCT FROM NEW."${createdAtColumn}")
      EXECUTE FUNCTION raise_immutable_created_at();
    `);
  });
};
