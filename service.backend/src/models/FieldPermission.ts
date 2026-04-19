import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

/**
 * Sequelize requires enums for DataTypes.ENUM(). These values MUST match
 * the canonical types in @adopt-dont-shop/lib.types (FieldAccessLevel
 * and FieldPermissionResource). lib.types is the source of truth for
 * field permission types — the backend imports from lib.types directly
 * and never from lib.permissions, which is frontend-only. These enums
 * exist solely for the ORM layer because Sequelize's DataTypes.ENUM
 * cannot accept a TypeScript string-literal union.
 */
export enum FieldAccessLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
}

export enum FieldPermissionResource {
  USERS = 'users',
  PETS = 'pets',
  APPLICATIONS = 'applications',
  RESCUES = 'rescues',
}

interface FieldPermissionAttributes {
  field_permission_id: number;
  resource: FieldPermissionResource;
  field_name: string;
  role: string;
  access_level: FieldAccessLevel;
  created_at?: Date;
  updated_at?: Date;
}

interface FieldPermissionCreationAttributes
  extends Optional<FieldPermissionAttributes, 'field_permission_id'> {}

class FieldPermission
  extends Model<FieldPermissionAttributes, FieldPermissionCreationAttributes>
  implements FieldPermissionAttributes
{
  public field_permission_id!: number;
  public resource!: FieldPermissionResource;
  public field_name!: string;
  public role!: string;
  public access_level!: FieldAccessLevel;
  public created_at!: Date;
  public updated_at!: Date;
}

FieldPermission.init(
  {
    field_permission_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    resource: {
      type: DataTypes.ENUM(...Object.values(FieldPermissionResource)),
      allowNull: false,
    },
    field_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    access_level: {
      type: DataTypes.ENUM(...Object.values(FieldAccessLevel)),
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
    tableName: 'field_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['resource', 'field_name', 'role'],
        name: 'unique_field_permission',
      },
      {
        fields: ['resource'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['resource', 'role'],
      },
    ],
  }
);

export default FieldPermission;
