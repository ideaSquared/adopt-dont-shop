/**
 * ADS-758 — normalise rescue.service audit-log action verbs.
 *
 * Pre-migration the service wrote lowercase verbs ('create', 'update',
 * 'suspend', 'reject', 'addStaff', 'removeStaff', 'updateStaff',
 * 'delete', 'register', 'verify', 'approve') alongside the
 * SCREAMING_SNAKE_CASE convention used by every other service. This
 * migration rewrites historical rows so downstream queries (Grafana
 * dashboards, EntityInspector, audit-search) need a single casing.
 *
 * Safe to re-run: the WHERE clauses match the old values only, so a
 * second run is a no-op.
 *
 * `down` reverses the renames so the migration is fully reversible if
 * the change has to be unwound.
 */
import { type QueryInterface, QueryTypes } from 'sequelize';
import { runInTransaction } from './_helpers';

const RESCUE_ACTION_RENAMES: ReadonlyArray<{ from: string; to: string }> = [
  { from: 'register', to: 'RESCUE_REGISTERED' },
  { from: 'create', to: 'RESCUE_CREATED' },
  { from: 'update', to: 'RESCUE_UPDATED' },
  { from: 'verify', to: 'RESCUE_VERIFIED' },
  { from: 'approve', to: 'RESCUE_APPROVED' },
  { from: 'reject', to: 'RESCUE_REJECTED' },
  { from: 'suspend', to: 'RESCUE_SUSPENDED' },
  { from: 'delete', to: 'RESCUE_DELETED' },
  { from: 'addStaff', to: 'RESCUE_STAFF_ADDED' },
  { from: 'removeStaff', to: 'RESCUE_STAFF_REMOVED' },
  { from: 'updateStaff', to: 'RESCUE_STAFF_UPDATED' },
];

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await runInTransaction(queryInterface, async t => {
      for (const { from, to } of RESCUE_ACTION_RENAMES) {
        // Scope the UPDATE to category='rescue' so we don't accidentally
        // rewrite an unrelated row whose action happens to collide
        // (e.g. a generic 'update' on some other entity).
        await queryInterface.sequelize.query(
          `UPDATE audit_logs
             SET action = :to
           WHERE action = :from
             AND category = 'rescue'`,
          {
            replacements: { from, to },
            type: QueryTypes.UPDATE,
            transaction: t,
          }
        );
      }
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await runInTransaction(queryInterface, async t => {
      for (const { from, to } of RESCUE_ACTION_RENAMES) {
        await queryInterface.sequelize.query(
          `UPDATE audit_logs
             SET action = :from
           WHERE action = :to
             AND category = 'rescue'`,
          {
            replacements: { from, to },
            type: QueryTypes.UPDATE,
            transaction: t,
          }
        );
      }
    });
  },
};
