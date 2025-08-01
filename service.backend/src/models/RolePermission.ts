import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import Permission from './Permission';
import Role from './Role';

interface RolePermissionAttributes {
  roleId: number;
  permissionId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class RolePermission extends Model<RolePermissionAttributes> implements RolePermissionAttributes {
  public roleId!: number;
  public permissionId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

RolePermission.init(
  {
    roleId: {
      type: DataTypes.INTEGER,
      references: {
        model: Role,
        key: 'role_id',
      },
      primaryKey: true,
      field: 'role_id',
    },
    permissionId: {
      type: DataTypes.INTEGER,
      references: {
        model: Permission,
        key: 'permission_id',
      },
      primaryKey: true,
      field: 'permission_id',
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
    tableName: 'role_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false,
  }
);

export default RolePermission;
