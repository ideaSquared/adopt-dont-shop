import { DataTypes, QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface) {
  await queryInterface.changeColumn('audit_logs', 'action', {
    type: DataTypes.TEXT,
    allowNull: false,
  })
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.changeColumn('audit_logs', 'action', {
    type: DataTypes.STRING(255),
    allowNull: false,
  })
}
