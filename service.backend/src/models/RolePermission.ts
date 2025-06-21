import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import Permission from './Permission';
import Role from './Role';

interface RolePermissionAttributes {
  role_id: number;
  permission_id: number;
  created_at?: Date;
  updated_at?: Date;
}

class RolePermission extends Model<RolePermissionAttributes> implements RolePermissionAttributes {
  public role_id!: number;
  public permission_id!: number;
  public created_at!: Date;
  public updated_at!: Date;
}

RolePermission.init(
  {
    role_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Role,
        key: 'role_id',
      },
      primaryKey: true, // Set primaryKey here within the attribute definition
    },
    permission_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Permission,
        key: 'permission_id',
      },
      primaryKey: true, // Set primaryKey here within the attribute definition
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'role_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default RolePermission;
