import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('field_permissions', {
    field_permission_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    resource: {
      type: DataTypes.ENUM('users', 'pets', 'applications', 'rescues'),
      allowNull: false,
    },
    field_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    access_level: {
      type: DataTypes.ENUM('none', 'read', 'write'),
      allowNull: false,
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

  // Unique constraint: one override per resource + field + role combination
  await queryInterface.addIndex('field_permissions', ['resource', 'field_name', 'role'], {
    unique: true,
    name: 'unique_field_permission',
  });

  await queryInterface.addIndex('field_permissions', ['resource']);
  await queryInterface.addIndex('field_permissions', ['role']);
  await queryInterface.addIndex('field_permissions', ['resource', 'role']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('field_permissions');
}
