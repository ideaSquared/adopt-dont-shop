import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDescription = await queryInterface.describeTable('users');

  if (!tableDescription['two_factor_enabled']) {
    await queryInterface.addColumn('users', 'two_factor_enabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }

  if (!tableDescription['two_factor_secret']) {
    await queryInterface.addColumn('users', 'two_factor_secret', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }

  if (!tableDescription['backup_codes']) {
    await queryInterface.addColumn('users', 'backup_codes', {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'two_factor_enabled');
  await queryInterface.removeColumn('users', 'two_factor_secret');
  await queryInterface.removeColumn('users', 'backup_codes');
}
