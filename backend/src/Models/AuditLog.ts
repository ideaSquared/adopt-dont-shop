import { DataTypes, Model } from 'sequelize'
import sequelize from '../sequelize'

export class AuditLog extends Model {
  public id!: number
  public service!: string
  public user!: string | null
  public action!: string
  public level!: 'INFO' | 'WARNING' | 'ERROR'
  public timestamp!: Date
  public metadata!: Record<string, any> | null
  public category!: string
  public ip_address!: string | null
  public user_agent!: string | null
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
    action: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    level: {
      type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR'),
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: DataTypes.JSONB,
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
        fields: ['category'],
      },
      {
        fields: ['user'],
      },
    ],
  },
)
