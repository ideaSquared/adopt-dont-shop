import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';
import { JsonObject } from '../types/common';

interface SavedReportAttributes {
  saved_report_id: string;
  user_id: string;
  rescue_id: string | null;
  template_id: string | null;
  name: string;
  description: string | null;
  config: JsonObject;
  is_archived: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface SavedReportCreationAttributes
  extends Optional<
    SavedReportAttributes,
    | 'saved_report_id'
    | 'rescue_id'
    | 'template_id'
    | 'description'
    | 'is_archived'
    | 'created_by'
    | 'updated_by'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
  > {}

class SavedReport
  extends Model<SavedReportAttributes, SavedReportCreationAttributes>
  implements SavedReportAttributes
{
  public saved_report_id!: string;
  public user_id!: string;
  public rescue_id!: string | null;
  public template_id!: string | null;
  public name!: string;
  public description!: string | null;
  public config!: JsonObject;
  public is_archived!: boolean;
  public created_by!: string | null;
  public updated_by!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;
}

SavedReport.init(
  {
    saved_report_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rescue_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'saved_reports',
    modelName: 'SavedReport',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['rescue_id', 'user_id'], name: 'saved_reports_rescue_user_idx' },
      { fields: ['template_id'], name: 'saved_reports_template_idx' },
      { fields: ['is_archived'], name: 'saved_reports_archived_idx' },
      ...auditIndexes('saved_reports'),
    ],
  })
);

export default SavedReport;
