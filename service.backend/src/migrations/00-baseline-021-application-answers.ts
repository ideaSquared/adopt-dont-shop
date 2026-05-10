import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction, assertDestructiveDownAcknowledged } from './_helpers';

/**
 * Per-model rebaseline (domain: applications) — `application_answers` table.
 *
 * Frozen `createTable` body extracted from `models/ApplicationAnswer.ts`.
 * No ENUM columns. Cross-table FK constraints are batched into the
 * separate `00-baseline-zzz-foreign-keys.ts` file; FK-column indexes
 * (plain B-tree) are created here because they accelerate joins
 * regardless of whether the FK is enforced at the DB layer.
 */
const MIGRATION_KEY = '00-baseline-021-application-answers';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'application_answers',
        {
          answer_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          application_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          question_key: {
            type: DataTypes.STRING(128),
            allowNull: false,
          },
          answer_value: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          answered_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          created_by: { type: DataTypes.UUID, allowNull: true },
          updated_by: { type: DataTypes.UUID, allowNull: true },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('application_answers', {
        fields: ['application_id', 'question_key'],
        unique: true,
        name: 'application_answers_app_question_unique',
        transaction,
      });
      await queryInterface.addIndex('application_answers', {
        fields: ['application_id'],
        name: 'application_answers_app_idx',
        transaction,
      });
      await queryInterface.addIndex('application_answers', {
        fields: ['question_key'],
        name: 'application_answers_question_key_idx',
        transaction,
      });
      await queryInterface.addIndex('application_answers', {
        fields: ['created_by'],
        name: 'application_answers_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('application_answers', {
        fields: ['updated_by'],
        name: 'application_answers_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('application_answers', { transaction });
    });
  },
};
