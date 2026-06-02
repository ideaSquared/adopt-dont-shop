/**
 * ADS-635: Add `allergies` column to `adopter_match_profile`.
 *
 * The onboarding quiz previously stored allergies in a user preferences
 * blob. Now that the two onboarding flows are consolidated, allergies
 * live directly on the match profile so the matching engine can use them.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { columnExists, runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface) => {
    // ADS-784: idempotency guard. `00-baseline.ts` sync() already adds this
    // column on a clean DB (the model declares it) and sorts before this
    // migration; no-op when present, add when truly fresh. (Approved edit to
    // an existing migration — it never worked from a clean DB.)
    if (await columnExists(queryInterface, 'adopter_match_profile', 'allergies')) {
      return;
    }
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.addColumn(
        'adopter_match_profile',
        'allergies',
        {
          type: DataTypes.STRING,
          allowNull: true,
          defaultValue: null,
        },
        { transaction }
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.removeColumn('adopter_match_profile', 'allergies', { transaction });
    });
  },
};
