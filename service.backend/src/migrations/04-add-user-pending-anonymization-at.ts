/**
 * Add `pending_anonymization_at` to users so the GDPR phase-1/phase-2
 * flow can distinguish:
 *
 *   - "soft-deleted, awaiting grace-window anonymization"   (deleted_at SET,    pending_anonymization_at SET)
 *   - "soft-deleted and already anonymized"                 (deleted_at SET,    pending_anonymization_at NULL)
 *   - "active"                                              (deleted_at NULL,   pending_anonymization_at NULL)
 *
 * The retention worker reads `pending_anonymization_at < now() - 30d`
 * to select users whose grace window has elapsed, then calls
 * GdprService.executeAnonymization which clears the column.
 *
 * Canonical signal — the retention worker reads this column rather
 * than sniffing the user's email domain to decide whether phase-2
 * anonymization is due.
 */
import { DataTypes, Op, type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.addColumn(
        'users',
        'pending_anonymization_at',
        {
          type: DataTypes.DATE,
          allowNull: true,
        },
        { transaction: t }
      );
      // Partial index so the retention worker's `WHERE pending_anonymization_at IS NOT NULL
      // AND pending_anonymization_at < ?` scan is cheap. The table is dominated
      // by NULL rows (active users), and an unfiltered index would index every
      // row for a query that only ever cares about a tiny minority.
      await queryInterface.addIndex('users', ['pending_anonymization_at'], {
        name: 'users_pending_anonymization_at_idx',
        where: { pending_anonymization_at: { [Op.ne]: null } },
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.removeIndex('users', 'users_pending_anonymization_at_idx', {
        transaction: t,
      });
      await queryInterface.removeColumn('users', 'pending_anonymization_at', { transaction: t });
    });
  },
};
