import { DataTypes, Model } from 'sequelize';
import sequelize, { getJsonType } from '../sequelize';
import { JsonObject } from '../types/common';

export class AuditLog extends Model {
  public id!: number;
  public service!: string;
  public user!: string | null;
  public user_email_snapshot!: string | null;
  public action!: string;
  public level!: 'INFO' | 'WARNING' | 'ERROR';
  public status!: 'success' | 'failure' | null;
  public timestamp!: Date;
  public metadata!: JsonObject | null;
  public category!: string;
  public ip_address!: string | null;
  public user_agent!: string | null;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    service: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    /**
     * Snapshot of the user's email at the moment the log was written.
     * AuditLog.user is a soft reference (no FK enforcement) — the user
     * may be deleted before the log is read, at which point the live
     * lookup returns null. The snapshot keeps the audit trail readable
     * forever ("admin@x.test deleted Pet 12345" instead of
     * "[deleted user]"). Plan 2.2 / 4.5.
     */
    user_email_snapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    level: {
      type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('success', 'failure'),
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: getJsonType(),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'GENERAL',
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['timestamp'],
      },
      {
        fields: ['service'],
      },
      {
        fields: ['level'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['category'],
      },
      {
        name: 'audit_logs_user_idx',
        fields: ['user'],
      },
    ],
  }
);

export default AuditLog;
