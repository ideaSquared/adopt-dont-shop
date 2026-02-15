import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

/**
 * Sequelize requires enums for DataTypes.ENUM(). These values MUST match
 * the canonical types in @adopt-dont-shop/lib.permissions (FieldAccessLevel
 * and FieldPermissionResource). lib.permissions is the source of truth for
 * field permission types; these enums exist solely for the ORM layer.
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
  fieldPermissionId: number;
  resource: FieldPermissionResource;
  fieldName: string;
  role: string;
  accessLevel: FieldAccessLevel;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FieldPermissionCreationAttributes
  extends Optional<FieldPermissionAttributes, 'fieldPermissionId'> {}

class FieldPermission
  extends Model<FieldPermissionAttributes, FieldPermissionCreationAttributes>
  implements FieldPermissionAttributes
{
  public fieldPermissionId!: number;
  public resource!: FieldPermissionResource;
  public fieldName!: string;
  public role!: string;
  public accessLevel!: FieldAccessLevel;
  public createdAt!: Date;
  public updatedAt!: Date;
}

FieldPermission.init(
  {
    fieldPermissionId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'field_permission_id',
    },
    resource: {
      type: DataTypes.ENUM(...Object.values(FieldPermissionResource)),
      allowNull: false,
    },
    fieldName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'field_name',
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    accessLevel: {
      type: DataTypes.ENUM(...Object.values(FieldAccessLevel)),
      allowNull: false,
      field: 'access_level',
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
    tableName: 'field_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false,
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
