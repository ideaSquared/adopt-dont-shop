import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import Role from './Role';
import User from './User';

class UserRole extends Model {
  public userId!: string;
  public roleId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

UserRole.init(
  {
    userId: {
      type: DataTypes.STRING,
      references: {
        model: User,
        key: 'user_id',
      },
      primaryKey: true,
      field: 'user_id', // Map to database column
    },
    roleId: {
      type: DataTypes.INTEGER,
      references: {
        model: Role,
        key: 'role_id',
      },
      primaryKey: true,
      field: 'role_id', // Map to database column
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'user_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false, // Use camelCase in the model
  }
);

export default UserRole;
