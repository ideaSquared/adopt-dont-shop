import { DataTypes, Model } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
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
      type: getUuidType(),
      references: {
        model: User,
        key: 'user_id',
      },
      onDelete: 'CASCADE',
      primaryKey: true,
      field: 'user_id',
    },
    roleId: {
      type: DataTypes.INTEGER,
      references: {
        model: Role,
        key: 'role_id',
      },
      onDelete: 'CASCADE',
      primaryKey: true,
      field: 'role_id',
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
    underscored: true,
    // Junction table; revoke = remove the row (CASCADE handles parent
    // deletes). No soft-delete.
    paranoid: false,
  }
);

export default UserRole;
