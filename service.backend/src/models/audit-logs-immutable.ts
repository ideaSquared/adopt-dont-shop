import sequelize from '../sequelize';
import { logger } from '../utils/logger';

/**
 * Install the tamper-resistance trigger on `audit_logs`. Originally
 * shipped as migration `11-add-audit-log-immutable-trigger`; folded
 * into a post-sync installer when the project moved to model-driven
 * schema (ADS-531 Phase 3).
 *
 * The audit log is the forensic record-of-record for admin actions. A
 * compromised connection or buggy code path that issued UPDATE/DELETE
 * against `audit_logs` could rewrite history without leaving any
 * trace. Postgres rejects those statements at the database boundary
 * so the application layer cannot accidentally (or maliciously)
 * mutate the audit trail. INSERT remains permitted so the
 * application keeps appending; SELECT remains permitted so admins
 * can read. A maintenance flag (`SET LOCAL audit_logs.allow_mutation
 * = 'on'`) opens a per-transaction escape hatch for retention
 * cleanups.
 *
 * Postgres-only. SQLite (tests) gets the equivalent guard via the
 * AuditLog model's beforeUpdate / beforeDestroy hooks.
 */
const TRIGGER_FN = 'audit_logs_reject_mutation';
const TRIGGER_NAME = 'audit_logs_immutable';

export const installAuditLogsImmutableTrigger = async (): Promise<void> => {
  if (sequelize.getDialect() !== 'postgres') {
    return;
  }

  try {
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION ${TRIGGER_FN}() RETURNS TRIGGER AS $$
      BEGIN
        IF current_setting('audit_logs.allow_mutation', true) = 'on' THEN
          RETURN COALESCE(NEW, OLD);
        END IF;
        RAISE EXCEPTION 'audit_logs is append-only (ADS-508); UPDATE/DELETE rejected';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await sequelize.query(`DROP TRIGGER IF EXISTS ${TRIGGER_NAME} ON audit_logs;`);

    await sequelize.query(`
      CREATE TRIGGER ${TRIGGER_NAME}
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION ${TRIGGER_FN}();
    `);
  } catch (err) {
    logger.error('[audit-logs-immutable] failed to install trigger', { err });
  }
};
