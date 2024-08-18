// src/models/Permission.ts
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

interface PermissionAttributes {
  permission_id: number
  permission_name: string
  created_at?: Date
  updated_at?: Date
}

interface PermissionCreationAttributes
  extends Optional<PermissionAttributes, 'permission_id'> {}

class Permission
  extends Model<PermissionAttributes, PermissionCreationAttributes>
  implements PermissionAttributes
{
  public permission_id!: number
  public permission_name!: string
  public created_at!: Date
  public updated_at!: Date
}

Permission.init(
  {
    permission_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    permission_name: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
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
    tableName: 'permissions',
    timestamps: false,
  },
)

export default Permission
