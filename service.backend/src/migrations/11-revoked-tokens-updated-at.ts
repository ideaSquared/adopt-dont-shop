import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

/**
 * ADS-502: `revoked_tokens` is missing `updated_at` even though the global
 * Sequelize `define` block sets `timestamps: true`.
 *
 * The current `RevokedToken` model overrides with `timestamps: false`, so
 * today the schema and model agree. But anyone changing the model to the
 * project default (or adding a hook that touches `updatedAt`) would hit a
 * silent column-not-found error. Adding the column up front aligns the
 * table with the platform-wide convention and removes the foot-gun.
 *
 * `revoked_at` continues to act as the "created at" — a token row is
 * inserted exactly once when revoked. `updated_at` exists for forward
 * compatibility and tracks any future status flips (e.g. unrevoke).
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.addColumn(
        'revoked_tokens',
        'updated_at',
        {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.removeColumn('revoked_tokens', 'updated_at', { transaction: t });
    });
  },
};
