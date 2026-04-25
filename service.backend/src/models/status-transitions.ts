import { ModelStatic, Model, QueryTypes } from 'sequelize';
import sequelize from '../sequelize';

/**
 * Install the AFTER INSERT trigger that maintains a parent table's
 * `current_status` column from inserts into a status-transitions table.
 *
 * Status-transition tables are append-only event logs:
 *
 *   <entity>_status_transitions (transition_id, <entity>_id, from_status,
 *     to_status, transitioned_at, transitioned_by, reason, metadata)
 *
 * The application code never writes the parent's status column directly;
 * it inserts a transition row and the trigger denormalizes the current
 * value back onto the parent for O(1) reads. This keeps:
 *
 *   - history complete and immutable (transitions table is append-only)
 *   - status-timestamp consistency structural (timestamp lives on the
 *     transition row), not defensive
 *   - the read path identical to before (still parent.status / .current_status)
 *
 * The trigger is the SOLE writer of the parent's status column in the
 * intended steady state. Pre-existing rows that were inserted with a
 * status value before any transition exists keep that value (the trigger
 * is only for ongoing changes); a seeder can either pre-populate the row
 * with a status AND insert a matching first transition, or just rely on
 * the row's column directly (the trigger doesn't validate that the row
 * came from a transition).
 *
 * Postgres-only. No-op on SQLite (test DB) — the test suite doesn't
 * exercise the transition flow against the trigger.
 *
 * Idempotent: skips if the trigger is already installed (so repeated
 * sync({ alter: true }) doesn't churn).
 */
export const installStatusTransitionTrigger = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transitionModel: ModelStatic<Model<any, any>>,
  options: {
    /** Parent table whose status column is denormalized. */
    parentTable: string;
    /** Append-only transitions table that this trigger fires on. */
    transitionTable: string;
    /** FK column on the transitions table that points at the parent PK. */
    parentFkColumn: string;
    /** PK column on the parent table. */
    parentPkColumn: string;
    /**
     * Status column on the parent that the trigger overwrites with
     * NEW.to_status.
     */
    statusColumn: string;
  }
): void => {
  const fnName = `${options.transitionTable}_apply_to_parent`;
  const triggerName = `${options.transitionTable}_after_insert`;

  transitionModel.addHook('afterSync', async () => {
    if (sequelize.getDialect() !== 'postgres') {
      return;
    }

    const existing = await sequelize.query<{ tgname: string }>(
      `SELECT t.tgname FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       WHERE c.relname = :table AND t.tgname = :trigger`,
      {
        replacements: { table: options.transitionTable, trigger: triggerName },
        type: QueryTypes.SELECT,
      }
    );
    if (existing.length > 0) {
      return;
    }

    // The function copies NEW.to_status onto the parent row identified by
    // NEW.<parentFkColumn>. No-op if the parent has been deleted (the
    // CASCADE FK on the transitions table makes that impossible in
    // practice; this is just defensive).
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION ${fnName}() RETURNS trigger AS $$
      BEGIN
        UPDATE "${options.parentTable}"
           SET "${options.statusColumn}" = NEW."to_status"
         WHERE "${options.parentPkColumn}" = NEW."${options.parentFkColumn}";
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await sequelize.query(`DROP TRIGGER IF EXISTS ${triggerName} ON "${options.transitionTable}"`);
    await sequelize.query(`
      CREATE TRIGGER ${triggerName}
      AFTER INSERT ON "${options.transitionTable}"
      FOR EACH ROW EXECUTE FUNCTION ${fnName}();
    `);
  });
};
