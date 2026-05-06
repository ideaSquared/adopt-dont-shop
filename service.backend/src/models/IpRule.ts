import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';

export enum IpRuleType {
  ALLOW = 'allow',
  BLOCK = 'block',
}

interface IpRuleAttributes {
  ip_rule_id: string;
  type: IpRuleType;
  cidr: string;
  label: string | null;
  is_active: boolean;
  expires_at: Date | null;
  created_by: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface IpRuleCreationAttributes extends Optional<
  IpRuleAttributes,
  'ip_rule_id' | 'label' | 'is_active' | 'expires_at' | 'created_by' | 'created_at' | 'updated_at'
> {}

class IpRule extends Model<IpRuleAttributes, IpRuleCreationAttributes> implements IpRuleAttributes {
  public ip_rule_id!: string;
  public type!: IpRuleType;
  public cidr!: string;
  public label!: string | null;
  public is_active!: boolean;
  public expires_at!: Date | null;
  public created_by!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  public isExpired(at: Date = new Date()): boolean {
    return this.expires_at !== null && at >= this.expires_at;
  }
}

IpRule.init(
  {
    ip_rule_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(IpRuleType)),
      allowNull: false,
    },
    cidr: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: getUuidType(),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'ip_rules',
    modelName: 'IpRule',
    timestamps: true,
    underscored: true,
    paranoid: false,
  }
);

export default IpRule;
