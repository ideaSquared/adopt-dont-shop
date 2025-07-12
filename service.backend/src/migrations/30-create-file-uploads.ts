import { DataTypes, QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('file_uploads', {
    upload_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    entity_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    entity_type: {
      type: DataTypes.STRING(100),
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
  });

  // Create indexes
  await queryInterface.addIndex('file_uploads', ['uploaded_by']);
  await queryInterface.addIndex('file_uploads', ['entity_id', 'entity_type']);
  await queryInterface.addIndex('file_uploads', ['purpose']);
  await queryInterface.addIndex('file_uploads', ['mime_type']);
  await queryInterface.addIndex('file_uploads', ['created_at']);
  await queryInterface.addIndex('file_uploads', ['stored_filename'], { unique: true });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('file_uploads');
}
