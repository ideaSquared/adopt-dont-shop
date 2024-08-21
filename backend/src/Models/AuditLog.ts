import { DataTypes, Model } from 'sequelize'
import sequelize from '../sequelize'

export class AuditLog extends Model {
  public id!: number
  public service!: string
  public user!: string | null
  public action!: string
  public level!: 'INFO' | 'WARNING' | 'ERROR'
  public timestamp!: Date
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
      type: DataTypes.STRING,
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
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false,
  },
)
