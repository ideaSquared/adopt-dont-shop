import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum ReportShareType {
  USER = 'user',
  TOKEN = 'token',
}

export enum ReportSharePermission {
  VIEW = 'view',
  EDIT = 'edit',
}

interface ReportShareAttributes {
  share_id: string;
  saved_report_id: string;
  share_type: ReportShareType;
  shared_with_user_id: string | null;
  token_hash: string | null;
  permission: ReportSharePermission;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface ReportShareCreationAttributes extends Optional<
  ReportShareAttributes,
  | 'share_id'
  | 'shared_with_user_id'
  | 'token_hash'
  | 'permission'
  | 'expires_at'
  | 'revoked_at'
  | 'created_by'
  | 'updated_by'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
> {}

class ReportShare
  extends Model<ReportShareAttributes, ReportShareCreationAttributes>
  implements ReportShareAttributes
{
  public share_id!: string;
  public saved_report_id!: string;
  public share_type!: ReportShareType;
  public shared_with_user_id!: string | null;
  public token_hash!: string | null;
  public permission!: ReportSharePermission;
  public expires_at!: Date | null;
  public revoked_at!: Date | null;
  public created_by!: string | null;
  public updated_by!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;

  /** Active = not revoked AND not expired. */
  public isActive(at: Date = new Date()): boolean {
    if (this.revoked_at !== null) {
      return false;
    }
    if (this.expires_at !== null && at >= this.expires_at) {
      return false;
    }
    return true;
  }
}

ReportShare.init(
  {
    share_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    saved_report_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    share_type: {
      type: DataTypes.ENUM(...Object.values(ReportShareType)),
      allowNull: false,
    },
    shared_with_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    token_hash: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    permission: {
      type: DataTypes.ENUM(...Object.values(ReportSharePermission)),
      allowNull: false,
      defaultValue: ReportSharePermission.VIEW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'report_shares',
    modelName: 'ReportShare',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['saved_report_id'], name: 'report_shares_saved_report_idx' },
      { fields: ['token_hash'], name: 'report_shares_token_hash_idx' },
      ...auditIndexes('report_shares'),
    ],
  })
);

export default ReportShare;
