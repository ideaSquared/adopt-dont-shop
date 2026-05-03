import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

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
  /** Managed by Sequelize paranoid; null when the row is live. */
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StaffMemberCreationAttributes extends Optional<
  StaffMemberAttributes,
  'staffMemberId' | 'verifiedAt' | 'verifiedBy' | 'deletedAt' | 'createdAt' | 'updatedAt'
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
  public deletedAt?: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public user?: any; // Sequelize association - will be User at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public rescue?: any; // Sequelize association - will be Rescue at runtime
}

StaffMember.init(
  {
    staffMemberId: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
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
      onDelete: 'SET NULL',
    },
    userId: {
      type: getUuidType(),
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
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
      type: getUuidType(),
      allowNull: true,
      field: 'verified_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at',
    },
    addedBy: {
      type: getUuidType(),
      allowNull: false,
      field: 'added_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'added_at',
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
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'staff_members',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['rescue_id'],
        name: 'staff_members_rescue_id_idx',
      },
      {
        fields: ['user_id'],
        name: 'staff_members_user_id_idx',
      },
      {
        fields: ['verified_by'],
        name: 'staff_members_verified_by_idx',
      },
      {
        fields: ['added_by'],
        name: 'staff_members_added_by_idx',
      },
      { fields: ['deleted_at'], name: 'staff_members_deleted_at_idx' },
      ...auditIndexes('staff_members'),
    ],
    // Soft-delete via Sequelize paranoid (plan 3.5). `destroy()`
    // sets deletedAt; the default scope hides deleted rows.
    paranoid: true,
    deletedAt: 'deletedAt',
  })
);

export default StaffMember;
