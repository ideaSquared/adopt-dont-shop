/**
 * Create the `application_drafts` table.
 *
 * Moves application draft persistence off localStorage and onto the
 * backend so users can resume from any device. Semantics are
 * last-write-wins: each (user_id, pet_id) pair has at most one draft;
 * PUT /api/v1/applications/drafts/:petId overwrites whatever's there.
 *
 * `answers` is JSONB (free-form per-rescue question answers, the same
 * shape Application.answers stores at submit time).
 *
 * `expires_at` enforces a TTL — the service stamps NOW() + 30 days on
 * every upsert. A daily cron in jobs/application-drafts-purge.job.ts
 * deletes rows where expires_at < NOW().
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'application_drafts',
        {
          draft_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' },
            onDelete: 'CASCADE',
          },
          pet_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'pets', key: 'pet_id' },
            onDelete: 'CASCADE',
          },
          answers: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
        },
        { transaction }
      );

      // One draft per (user, pet). Upserts hit this constraint and the
      // service translates it into an UPDATE.
      await queryInterface.addIndex('application_drafts', {
        fields: ['user_id', 'pet_id'],
        name: 'application_drafts_user_pet_unique',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('application_drafts', {
        fields: ['expires_at'],
        name: 'application_drafts_expires_at_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('application_drafts', { transaction });
    });
  },
};
