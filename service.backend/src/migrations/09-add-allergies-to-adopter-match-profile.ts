/**
 * ADS-635: Add `allergies` column to `adopter_match_profile`.
 *
 * The onboarding quiz previously stored allergies in a user preferences
 * blob. Now that the two onboarding flows are consolidated, allergies
 * live directly on the match profile so the matching engine can use them.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface) => {
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
