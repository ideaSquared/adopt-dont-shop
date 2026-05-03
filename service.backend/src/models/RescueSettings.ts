import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

/**
 * Per-rescue operational settings (plan 5.6 — typed preference table
 * complementing Rescue.settings JSONB).
 *
 * 1:1 with Rescue. Auto-created via Rescue.afterCreate so consumers
 * can always assume the row exists.
 *
 * Scope note: Rescue.settings.adoptionPolicies (the rich nested
 * AdoptionPolicy object — references count, fee range, requirements
 * list, etc.) stays in the JSONB column for now. Splitting that into
 * its own typed shape is a separate larger slice.
 */
interface RescueSettingsAttributes {
  rescue_id: string;
  auto_approve_applications: boolean;
  require_home_visit: boolean;
  require_references: boolean;
  min_adopter_age: number;
  allow_out_of_area_adoptions: boolean;
  application_expiry_days: number;
  created_at?: Date;
  updated_at?: Date;
}

interface RescueSettingsCreationAttributes extends Optional<
  RescueSettingsAttributes,
  | 'auto_approve_applications'
  | 'require_home_visit'
  | 'require_references'
  | 'min_adopter_age'
  | 'allow_out_of_area_adoptions'
  | 'application_expiry_days'
  | 'created_at'
  | 'updated_at'
> {}

class RescueSettings
  extends Model<RescueSettingsAttributes, RescueSettingsCreationAttributes>
  implements RescueSettingsAttributes
{
  public rescue_id!: string;
  public auto_approve_applications!: boolean;
  public require_home_visit!: boolean;
  public require_references!: boolean;
  public min_adopter_age!: number;
  public allow_out_of_area_adoptions!: boolean;
  public application_expiry_days!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

RescueSettings.init(
  {
    rescue_id: {
      type: getUuidType(),
      primaryKey: true,
      references: { model: 'rescues', key: 'rescue_id' },
      onDelete: 'CASCADE',
    },
    auto_approve_applications: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    require_home_visit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    require_references: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    min_adopter_age: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 18,
      validate: { min: 16, max: 99 },
    },
    allow_out_of_area_adoptions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    application_expiry_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      validate: { min: 1, max: 365 },
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'rescue_settings',
    modelName: 'RescueSettings',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [...auditIndexes('rescue_settings')],
  })
);

export default RescueSettings;
