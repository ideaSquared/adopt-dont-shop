import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — moderation_evidence (rebaseline 7/10).
 *
 * Frozen snapshot of `ModerationEvidence`'s sync() output. The audit FK
 * columns (created_by, updated_by) carry shape only — REFERENCES are
 * deferred to `00-baseline-zzz-foreign-keys.ts`.
 *
 * Polymorphic via (parent_type, parent_id). The parent_type ENUM is the
 * discriminator; there is no DB-level FK to a single parent table by
 * design (see model comment).
 *
 * `paranoid: false` — no `deleted_at` column. withAuditHooks contributes
 * created_by / updated_by / version + matching FK indexes.
 */
const MIGRATION_KEY = '00-baseline-048-moderation-evidence';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'moderation_evidence',
        {
          evidence_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          parent_type: {
            type: DataTypes.ENUM('report', 'moderator_action'),
            allowNull: false,
          },
          parent_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          type: {
            type: DataTypes.ENUM('screenshot', 'url', 'text', 'file'),
            allowNull: false,
          },
          content: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          uploaded_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
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

      await queryInterface.addIndex('moderation_evidence', {
        fields: ['parent_type', 'parent_id'],
        name: 'moderation_evidence_parent_idx',
        transaction,
      });
      await queryInterface.addIndex('moderation_evidence', {
        fields: ['created_by'],
        name: 'moderation_evidence_created_by_idx',
        transaction,
      });
      await queryInterface.addIndex('moderation_evidence', {
        fields: ['updated_by'],
        name: 'moderation_evidence_updated_by_idx',
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('moderation_evidence');
    const sql = queryInterface.sequelize;
    await dropEnumTypeIfExists(sql, 'enum_moderation_evidence_parent_type');
    await dropEnumTypeIfExists(sql, 'enum_moderation_evidence_type');
  },
};
