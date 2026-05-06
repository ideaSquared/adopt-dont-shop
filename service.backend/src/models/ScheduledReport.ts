import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum ScheduledReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  INLINE_HTML = 'inline-html',
}

export enum ScheduledReportStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface ScheduledReportRecipient {
  email: string;
  userId?: string;
}

interface ScheduledReportAttributes {
  schedule_id: string;
  saved_report_id: string;
  cron: string;
  timezone: string;
  recipients: ScheduledReportRecipient[];
  format: ScheduledReportFormat;
  is_enabled: boolean;
  last_run_at: Date | null;
  next_run_at: Date | null;
  last_status: ScheduledReportStatus | null;
  last_error: string | null;
  repeat_job_key: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface ScheduledReportCreationAttributes
  extends Optional<
    ScheduledReportAttributes,
    | 'schedule_id'
    | 'timezone'
    | 'recipients'
    | 'format'
    | 'is_enabled'
    | 'last_run_at'
    | 'next_run_at'
    | 'last_status'
    | 'last_error'
    | 'repeat_job_key'
    | 'created_by'
    | 'updated_by'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
  > {}

class ScheduledReport
  extends Model<ScheduledReportAttributes, ScheduledReportCreationAttributes>
  implements ScheduledReportAttributes
{
  public schedule_id!: string;
  public saved_report_id!: string;
  public cron!: string;
  public timezone!: string;
  public recipients!: ScheduledReportRecipient[];
  public format!: ScheduledReportFormat;
  public is_enabled!: boolean;
  public last_run_at!: Date | null;
  public next_run_at!: Date | null;
  public last_status!: ScheduledReportStatus | null;
  public last_error!: string | null;
  public repeat_job_key!: string | null;
  public created_by!: string | null;
  public updated_by!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;
}

ScheduledReport.init(
  {
    schedule_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    saved_report_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    cron: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'UTC',
    },
    recipients: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    format: {
      type: DataTypes.ENUM(...Object.values(ScheduledReportFormat)),
      allowNull: false,
      defaultValue: ScheduledReportFormat.PDF,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    last_run_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    next_run_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_status: {
      type: DataTypes.ENUM(...Object.values(ScheduledReportStatus)),
      allowNull: true,
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    repeat_job_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'scheduled_reports',
    modelName: 'ScheduledReport',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['saved_report_id'], name: 'scheduled_reports_saved_report_idx' },
      { fields: ['is_enabled', 'next_run_at'], name: 'scheduled_reports_enabled_next_run_idx' },
      ...auditIndexes('scheduled_reports'),
    ],
  })
);

export default ScheduledReport;
