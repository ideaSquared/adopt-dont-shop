import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
} from './_helpers';

/**
 * Per-model baseline — file_uploads (rebaseline 5/10).
 *
 * Frozen snapshot of `FileUpload`'s sync() output. FK (uploaded_by,
 * created_by, updated_by) lands in `00-baseline-999-foreign-keys.ts`.
 *
 * `url` and `thumbnail_url` are declared as STRING(1000) only — the
 * `/uploads/<prefix>/<filename>` shape was fixed by migration 17 and is
 * enforced by callers. The baseline column type captures the size limit;
 * URL convention is not a DDL concern.
 *
 * `metadata` is JSONB. Per-key validation is on the model.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.createTable(
        'file_uploads',
        {
          upload_id: {
            type: DataTypes.UUID,
            primaryKey: true,
          },
          original_filename: {
            type: DataTypes.STRING(500),
            allowNull: false,
          },
          stored_filename: {
            type: DataTypes.STRING(500),
            allowNull: false,
            unique: true,
          },
          file_path: {
            type: DataTypes.STRING(1000),
            allowNull: false,
          },
          mime_type: {
            type: DataTypes.STRING(100),
            allowNull: false,
          },
          file_size: {
            type: DataTypes.BIGINT,
            allowNull: false,
          },
          url: {
            type: DataTypes.STRING(1000),
            allowNull: false,
          },
          thumbnail_url: {
            type: DataTypes.STRING(1000),
            allowNull: true,
          },
          uploaded_by: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          entity_id: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          entity_type: {
            type: DataTypes.ENUM('chat', 'message', 'application', 'pet', 'user', 'rescue'),
            allowNull: true,
          },
          purpose: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
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
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      await queryInterface.addIndex('file_uploads', {
        fields: ['uploaded_by'],
        name: 'file_uploads_uploaded_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('file_uploads', {
        fields: ['entity_id', 'entity_type'],
        transaction: t,
      });
      await queryInterface.addIndex('file_uploads', { fields: ['purpose'], transaction: t });
      await queryInterface.addIndex('file_uploads', { fields: ['mime_type'], transaction: t });
      await queryInterface.addIndex('file_uploads', { fields: ['created_at'], transaction: t });
      await queryInterface.addIndex('file_uploads', {
        fields: ['stored_filename'],
        unique: true,
        name: 'file_uploads_stored_filename_unique',
        transaction: t,
      });
      await queryInterface.addIndex('file_uploads', {
        fields: ['created_by'],
        name: 'file_uploads_created_by_idx',
        transaction: t,
      });
      await queryInterface.addIndex('file_uploads', {
        fields: ['updated_by'],
        name: 'file_uploads_updated_by_idx',
        transaction: t,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged('00-baseline-034-file-uploads');
    await queryInterface.dropTable('file_uploads');
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_file_uploads_entity_type');
  },
};
