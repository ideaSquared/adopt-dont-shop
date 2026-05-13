import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — cms_content (rebaseline 10/10, platform domain).
 *
 * Frozen snapshot of `Content`'s sync() output. Carries the audit columns
 * (`created_by`, `updated_by`), `version` (optimistic concurrency), and
 * paranoid `deleted_at`.
 *
 * Cross-table foreign keys (`author_id`, `last_modified_by`, `created_by`,
 * `updated_by` → users) are intentionally omitted — they land in
 * `00-baseline-999-foreign-keys.ts`.
 *
 * `metaKeywords` is a Postgres TEXT[] (array of strings); `versions` is
 * JSONB with the version-history shape documented on the model.
 */
const MIGRATION_KEY = '00-baseline-060-cms-content';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'cms_content',
        {
          content_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          title: {
            type: DataTypes.STRING(500),
            allowNull: false,
          },
          slug: {
            type: DataTypes.STRING(500),
            allowNull: false,
            unique: true,
          },
          content_type: {
            type: DataTypes.ENUM('page', 'blog_post', 'help_article'),
            allowNull: false,
          },
          status: {
            type: DataTypes.ENUM('draft', 'published', 'archived', 'scheduled'),
            allowNull: false,
            defaultValue: 'draft',
          },
          content: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '',
          },
          excerpt: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          meta_title: {
            type: DataTypes.STRING(500),
            allowNull: true,
          },
          meta_description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          meta_keywords: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: [],
          },
          featured_image_url: {
            type: DataTypes.STRING(2000),
            allowNull: true,
          },
          published_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          scheduled_publish_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          scheduled_unpublish_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          versions: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          current_version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          author_id: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          last_modified_by: {
            type: DataTypes.UUID,
            allowNull: true,
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
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('cms_content', {
        fields: ['slug'],
        unique: true,
        transaction: t,
      });
      await queryInterface.addIndex('cms_content', { fields: ['content_type'], transaction: t });
      await queryInterface.addIndex('cms_content', { fields: ['status'], transaction: t });
      await queryInterface.addIndex('cms_content', { fields: ['author_id'], transaction: t });
      await queryInterface.addIndex('cms_content', {
        fields: ['last_modified_by'],
        transaction: t,
      });
      await queryInterface.addIndex('cms_content', { fields: ['published_at'], transaction: t });
      await queryInterface.addIndex('cms_content', {
        fields: ['scheduled_publish_at'],
        transaction: t,
      });
      await queryInterface.addIndex('cms_content', {
        fields: ['deleted_at'],
        name: 'cms_content_deleted_at_idx',
        transaction: t,
      });
      await queryInterface.addIndex('cms_content', {
        fields: ['created_by'],
        name: 'cms_content_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('cms_content', {
        fields: ['updated_by'],
        name: 'cms_content_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('cms_content');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_cms_content_content_type');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_cms_content_status');
  },
};
