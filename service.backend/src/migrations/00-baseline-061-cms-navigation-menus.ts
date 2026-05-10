import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — cms_navigation_menus (rebaseline 10/10, platform domain).
 *
 * Frozen snapshot of `NavigationMenu`'s sync() output. Carries the audit
 * columns (`created_by`, `updated_by`) and `version` (optimistic
 * concurrency). No paranoid soft-delete.
 *
 * Cross-table FKs (`created_by`, `updated_by` → users) land in
 * `00-baseline-zzz-foreign-keys.ts`.
 *
 * `items` is JSONB carrying the `NavigationItem[]` tree (label / url /
 * order / children) defined on the model.
 */
const MIGRATION_KEY = '00-baseline-061-cms-navigation-menus';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'cms_navigation_menus',
        {
          menu_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: DataTypes.STRING(255),
            allowNull: false,
          },
          location: {
            type: DataTypes.ENUM('header', 'footer', 'sidebar'),
            allowNull: false,
          },
          items: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
        },
        { transaction: t }
      );

      await queryInterface.addIndex('cms_navigation_menus', {
        fields: ['location'],
        transaction: t,
      });
      await queryInterface.addIndex('cms_navigation_menus', {
        fields: ['is_active'],
        transaction: t,
      });
      await queryInterface.addIndex('cms_navigation_menus', {
        fields: ['created_by'],
        name: 'cms_navigation_menus_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('cms_navigation_menus', {
        fields: ['updated_by'],
        name: 'cms_navigation_menus_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await queryInterface.dropTable('cms_navigation_menus');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_cms_navigation_menus_location');
  },
};
