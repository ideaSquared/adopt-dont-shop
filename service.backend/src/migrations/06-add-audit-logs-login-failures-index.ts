/**
 * Composite index supporting SecurityService.getLoginFailuresByUser():
 *
 *   SELECT … FROM audit_logs
 *    WHERE action = 'LOGIN' AND status = 'failure' AND timestamp >= $1
 *
 * This query runs on every login attempt as part of the brute-force /
 * credential-stuffing detection path. The baseline ships single-column
 * indexes on `action`, `status`, and `timestamp` separately — at small
 * scale the planner picks one and filters the rest. Once audit_logs
 * grows into the millions of rows, that fallback degenerates to a
 * seq-scan inside the chosen index, turning the login hot-path into a
 * DoS amplifier (one login → full audit_logs scan).
 *
 * `(action, status, timestamp DESC)` lets the planner satisfy all three
 * predicates from a single index entry. DESC on timestamp matches the
 * query's ORDER BY so no extra sort is required.
 *
 * Built via CREATE INDEX CONCURRENTLY (and outside the transaction
 * helper) because audit_logs is append-only and high-traffic — a
 * non-concurrent build would take a ShareLock blocking writes for the
 * duration.
 */
import { type QueryInterface } from 'sequelize';
import { createIndexConcurrently, dropIndexConcurrently } from './_helpers';

const INDEX_NAME = 'audit_logs_login_failures_idx';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await createIndexConcurrently(queryInterface.sequelize, {
      name: INDEX_NAME,
      table: 'audit_logs',
      columns: ['action', 'status', 'timestamp DESC'],
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await dropIndexConcurrently(queryInterface.sequelize, INDEX_NAME);
  },
};
