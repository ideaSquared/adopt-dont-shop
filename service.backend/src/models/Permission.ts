import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

interface PermissionAttributes {
  permissionId: number;
  permissionName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'permissionId'> {}

class Permission
  extends Model<PermissionAttributes, PermissionCreationAttributes>
  implements PermissionAttributes
{
  public permissionId!: number;
  public permissionName!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Permission.init(
  {
    permissionId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'permission_id',
    },
    permissionName: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      field: 'permission_name',
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
    tableName: 'permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false,
  }
);

export default Permission;
