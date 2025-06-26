import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';

export class FeatureFlag extends Model {
  public flag_id!: string;
  public name!: string;
  public description!: string;
  public enabled!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
}

FeatureFlag.init(
  {
    flag_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: 'feature_flags',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default FeatureFlag;
