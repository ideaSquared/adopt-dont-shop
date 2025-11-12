import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType, getArrayType, getGeometryType } from '../sequelize';

interface StaffMemberAttributes {
  staffMemberId: string;
  rescueId: string;
  userId: string;
  title?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  addedBy: string;
  addedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StaffMemberCreationAttributes
  extends Optional<
    StaffMemberAttributes,
    | 'staffMemberId'
    | 'verifiedAt'
    | 'verifiedBy'
    | 'deletedAt'
    | 'deletedBy'
    | 'createdAt'
    | 'updatedAt'
  > {}

class StaffMember
  extends Model<StaffMemberAttributes, StaffMemberCreationAttributes>
  implements StaffMemberAttributes
{
  public staffMemberId!: string;
  public rescueId!: string;
  public userId!: string;
  public title?: string;
  public isVerified!: boolean;
  public verifiedBy?: string;
  public verifiedAt?: Date;
  public addedBy!: string;
  public addedAt!: Date;
  public isDeleted!: boolean;
  public deletedAt?: Date;
  public deletedBy?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public user?: unknown;
  public rescue?: unknown;
}

StaffMember.init(
  {
    staffMemberId: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      field: 'staff_member_id',
    },
    rescueId: {
      type: getUuidType(),
      allowNull: false,
      field: 'rescue_id',
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_verified',
    },
    verifiedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'verified_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at',
    },
    addedBy: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'added_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'added_at',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    deletedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'deleted_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'staff_members',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    defaultScope: {
      where: {
        isDeleted: false,
      },
    },
    scopes: {
      withDeleted: {
        where: {},
      },
      deleted: {
        where: {
          isDeleted: true,
        },
      },
    },
  }
);

export default StaffMember;
