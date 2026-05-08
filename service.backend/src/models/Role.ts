import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import type Permission from './Permission';

interface RoleAttributes {
  roleId: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, 'roleId'> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public roleId!: number;
  public name!: string;
  public description!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Sequelize association — populated by Role.belongsToMany(Permission)
  // declared in src/models/index.ts. Declared here so callers reading
  // role.Permissions[i].permissionName don't need cast escapes.
  public Permissions?: Permission[];
}

Role.init(
  {
    roleId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'role_id', // Map to database column
    },
    name: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      field: 'role_name', // Map to database column
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description',
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
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    // Reference data — see Permission.ts for rationale.
    paranoid: false,
  }
);

export default Role;
