import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn('audit_logs', 'user', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn('audit_logs', 'user', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },
};
