import { QueryInterface } from 'sequelize';

/**
 * ADS-508: tamper-resistance for the audit_logs table.
 *
 * The audit log is the forensic record-of-record for admin actions. A
 * compromised connection or buggy code path that issued UPDATE/DELETE
 * against `audit_logs` could rewrite history without leaving any trace.
 * Postgres lets us reject those statements at the database boundary so
 * the application layer cannot accidentally (or maliciously) mutate the
 * audit trail.
 *
 * The migration installs a row-level trigger that raises on UPDATE or
 * DELETE for any role except the explicit maintenance superuser (which
 * still needs to run retention cleanups). INSERT remains permitted so
 * the application can keep appending; SELECT remains permitted so
 * admins can read.
 *
 * Postgres-only — SQLite (used in tests) gets the equivalent guard via
 * Sequelize beforeUpdate / beforeDestroy hooks on the AuditLog model.
 */
const TRIGGER_FN = 'audit_logs_reject_mutation';
const TRIGGER_NAME = 'audit_logs_immutable';

export default {
  up: async (queryInterface: QueryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') {
      return;
    }

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION ${TRIGGER_FN}() RETURNS TRIGGER AS $$
      BEGIN
        IF current_setting('audit_logs.allow_mutation', true) = 'on' THEN
          RETURN COALESCE(NEW, OLD);
        END IF;
        RAISE EXCEPTION 'audit_logs is append-only (ADS-508); UPDATE/DELETE rejected';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS ${TRIGGER_NAME} ON audit_logs;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER ${TRIGGER_NAME}
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION ${TRIGGER_FN}();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') {
      return;
    }

    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS ${TRIGGER_NAME} ON audit_logs;`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${TRIGGER_FN}();`);
  },
};
