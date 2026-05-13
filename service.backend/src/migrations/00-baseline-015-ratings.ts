import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline (rebaseline 2/10): `ratings`.
 *
 * Cross-table FKs (`reviewer_id`/`reviewee_id` → users, `pet_id` → pets,
 * `rescue_id` → rescues, `application_id` → applications,
 * `created_by`/`updated_by` → users) are intentionally omitted; they live
 * in `00-baseline-999-foreign-keys.ts`.
 *
 * `down` drops the table and the ENUM types created inline
 * (`enum_ratings_rating_type`, `enum_ratings_category`).
 */
const MIGRATION_KEY = '00-baseline-015-ratings';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'ratings',
        {
          rating_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          // FK columns; constraints deferred to 00-baseline-999-foreign-keys.ts.
          reviewer_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          reviewee_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          pet_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          application_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          rating_type: {
            type: DataTypes.ENUM('pet', 'rescue', 'user', 'application', 'experience'),
            allowNull: false,
          },
          category: {
            type: DataTypes.ENUM(
              'overall',
              'communication',
              'process',
              'care',
              'follow_up',
              'value',
              'recommendation'
            ),
            allowNull: false,
          },
          score: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          title: {
            type: DataTypes.STRING(200),
            allowNull: true,
          },
          review_text: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          pros: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          cons: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          helpful_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          reported_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          is_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          is_anonymous: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          is_featured: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          is_moderated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          moderation_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          response_text: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          response_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          // Audit columns (FK constraints added in 00-baseline-999-foreign-keys.ts).
          created_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          // The model does not override the global `paranoid: true` default,
          // so sync() emits deleted_at for ratings too.
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      // Indexes from the model. The first one omits an explicit name, so
      // Sequelize generates `ratings_rating_type_category`.
      await queryInterface.addIndex('ratings', ['rating_type', 'category'], { transaction: t });
      await queryInterface.addIndex('ratings', ['pet_id'], {
        name: 'ratings_pet_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('ratings', ['rescue_id'], {
        name: 'ratings_rescue_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('ratings', ['reviewer_id'], {
        name: 'ratings_reviewer_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('ratings', ['reviewee_id'], {
        name: 'ratings_reviewee_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('ratings', ['application_id'], {
        name: 'ratings_application_id_idx',
        transaction: t,
      });
      await queryInterface.addIndex('ratings', ['score'], { transaction: t });
      await queryInterface.addIndex('ratings', ['is_featured'], { transaction: t });
      await queryInterface.addIndex('ratings', ['is_moderated'], { transaction: t });
      await queryInterface.addIndex('ratings', ['created_at'], { transaction: t });
      await queryInterface.addIndex('ratings', ['created_by'], {
        name: 'ratings_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('ratings', ['updated_by'], {
        name: 'ratings_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.dropTable('ratings', { transaction: t });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_ratings_rating_type');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_ratings_category');
  },
};
