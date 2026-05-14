import { DataTypes, type QueryInterface } from 'sequelize';
import { assertDestructiveDownAcknowledged, runInTransaction } from './_helpers';

/**
 * Per-model baseline — email_template_versions (rebaseline 6/10).
 *
 * Frozen snapshot of `EmailTemplateVersion`'s sync() output. FKs (template_id
 * → email_templates with CASCADE, created_by/updated_by → users) live in
 * `00-baseline-999-foreign-keys.ts`.
 *
 * Append-only history of template revisions (plan 5.4) — no soft-delete
 * (paranoid not set), so no `deleted_at` column. No ENUMs on this table.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'email_template_versions',
        {
          template_version_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          template_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          version: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          subject: {
            type: DataTypes.STRING(500),
            allowNull: false,
          },
          html_content: {
            type: DataTypes.TEXT,
            allowNull: false,
          },
          text_content: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          change_notes: {
            type: DataTypes.TEXT,
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
          // Audit columns (FKs in 00-baseline-999-foreign-keys.ts).
          // NOTE: the model declares a `version` column (template revision
          // number) AND opts into optimistic locking via `withAuditHooks`,
          // which also wants a `version` column. Sequelize collapses the
          // two onto the existing `version` column above — there is no
          // separate optimistic-lock counter on this table.
          created_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('email_template_versions', {
        fields: ['template_id', { name: 'version', order: 'DESC' }],
        name: 'email_template_versions_template_version_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_template_versions', {
        fields: ['template_id', 'version'],
        name: 'email_template_versions_template_version_unique',
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('email_template_versions', {
        fields: ['created_by'],
        name: 'email_template_versions_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('email_template_versions', {
        fields: ['updated_by'],
        name: 'email_template_versions_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-038-email-template-versions');
    await queryInterface.dropTable('email_template_versions');
  },
};
