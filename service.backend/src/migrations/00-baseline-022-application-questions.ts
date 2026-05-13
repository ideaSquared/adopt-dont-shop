import { DataTypes, type QueryInterface } from 'sequelize';
import {
  runInTransaction,
  dropEnumTypeIfExists,
  assertDestructiveDownAcknowledged,
} from './_helpers';

/**
 * Per-model rebaseline (domain: applications) — `application_questions` table.
 *
 * Frozen `createTable` body extracted from `models/ApplicationQuestion.ts`.
 * Three ENUM columns (scope, category, question_type); their dialect-private
 * types are dropped in `down()` to avoid leaking into pg_type.
 *
 * Cross-table FK constraints are added in `00-baseline-999-foreign-keys.ts`.
 */
const MIGRATION_KEY = '00-baseline-022-application-questions';

const QUESTION_SCOPES = ['core', 'rescue_specific'] as const;
const QUESTION_CATEGORIES = [
  'personal_information',
  'household_information',
  'pet_ownership_experience',
  'lifestyle_compatibility',
  'pet_care_commitment',
  'references_verification',
  'final_acknowledgments',
] as const;
const QUESTION_TYPES = [
  'text',
  'email',
  'phone',
  'number',
  'boolean',
  'select',
  'multi_select',
  'address',
  'date',
  'file',
] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'application_questions',
        {
          question_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          question_key: {
            type: DataTypes.STRING(100),
            allowNull: false,
          },
          scope: {
            type: DataTypes.ENUM(...QUESTION_SCOPES),
            allowNull: false,
          },
          category: {
            type: DataTypes.ENUM(...QUESTION_CATEGORIES),
            allowNull: false,
          },
          question_type: {
            type: DataTypes.ENUM(...QUESTION_TYPES),
            allowNull: false,
          },
          question_text: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          help_text: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          placeholder: {
            type: DataTypes.STRING(255),
            allowNull: true,
          },
          options: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
          },
          validation_rules: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
          },
          display_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          is_required: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          conditional_logic: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
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
          deleted_at: { type: DataTypes.DATE, allowNull: true },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('application_questions', {
        fields: ['rescue_id'],
        name: 'application_questions_rescue_id_idx',
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['scope'],
        name: 'application_questions_scope_idx',
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['category'],
        name: 'application_questions_category_idx',
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['question_type'],
        name: 'application_questions_type_idx',
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['is_enabled'],
        name: 'application_questions_enabled_idx',
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['display_order'],
        name: 'application_questions_order_idx',
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['question_key', 'rescue_id'],
        unique: true,
        name: 'application_questions_key_rescue_unique',
        where: { deleted_at: null },
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['question_key'],
        unique: true,
        name: 'application_questions_core_key_unique',
        where: { scope: 'core', deleted_at: null },
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['deleted_at'],
        name: 'application_questions_deleted_at_idx',
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['created_by'],
        name: 'application_questions_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('application_questions', {
        fields: ['updated_by'],
        name: 'application_questions_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('application_questions', { transaction });
    });
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_application_questions_scope');
    await dropEnumTypeIfExists(sql, 'enum_application_questions_category');
    await dropEnumTypeIfExists(sql, 'enum_application_questions_question_type');
  },
};
