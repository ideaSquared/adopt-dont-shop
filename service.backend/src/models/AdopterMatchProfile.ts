import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

/**
 * Per-adopter matching preferences. 1:1 with User.
 *
 * Rows are created lazily on first read by MatchService. Explicit prefs
 * arrive via the onboarding wizard / PUT /api/v1/match/profile. Implicit
 * prefs (`inferred_prefs`) are a cached projection of the existing
 * `user_preferences` table maintained by swipe.service on each like/pass.
 */
export type AdopterLifestyle = {
  hours_alone_daily?: number;
  has_children?: boolean;
  has_other_pets?: boolean;
  yard?: boolean;
  housing_type?: 'apartment' | 'house' | 'condo' | 'other';
};

export type InferredPrefs = {
  liked_types?: Record<string, number>;
  liked_breeds?: Record<string, number>;
  liked_sizes?: Record<string, number>;
  liked_age_groups?: Record<string, number>;
  total_likes?: number;
  total_passes?: number;
};

interface AdopterMatchProfileAttributes {
  user_id: string;
  preferred_types: string[] | null;
  preferred_sizes: string[] | null;
  preferred_age_groups: string[] | null;
  preferred_energy: string[] | null;
  preferred_temperament: string[] | null;
  lifestyle: AdopterLifestyle;
  max_distance_km: number | null;
  open_to_special_needs: boolean;
  notify_new_matches: boolean;
  min_notification_score: number;
  last_notified_at: Date | null;
  inferred_prefs: InferredPrefs;
  prefs_updated_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface AdopterMatchProfileCreationAttributes extends Optional<
  AdopterMatchProfileAttributes,
  | 'preferred_types'
  | 'preferred_sizes'
  | 'preferred_age_groups'
  | 'preferred_energy'
  | 'preferred_temperament'
  | 'lifestyle'
  | 'max_distance_km'
  | 'open_to_special_needs'
  | 'notify_new_matches'
  | 'min_notification_score'
  | 'last_notified_at'
  | 'inferred_prefs'
  | 'prefs_updated_at'
  | 'created_at'
  | 'updated_at'
> {}

class AdopterMatchProfile
  extends Model<AdopterMatchProfileAttributes, AdopterMatchProfileCreationAttributes>
  implements AdopterMatchProfileAttributes
{
  public user_id!: string;
  public preferred_types!: string[] | null;
  public preferred_sizes!: string[] | null;
  public preferred_age_groups!: string[] | null;
  public preferred_energy!: string[] | null;
  public preferred_temperament!: string[] | null;
  public lifestyle!: AdopterLifestyle;
  public max_distance_km!: number | null;
  public open_to_special_needs!: boolean;
  public notify_new_matches!: boolean;
  public min_notification_score!: number;
  public last_notified_at!: Date | null;
  public inferred_prefs!: InferredPrefs;
  public prefs_updated_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AdopterMatchProfile.init(
  {
    user_id: {
      type: getUuidType(),
      primaryKey: true,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'CASCADE',
    },
    preferred_types: { type: DataTypes.JSONB, allowNull: true },
    preferred_sizes: { type: DataTypes.JSONB, allowNull: true },
    preferred_age_groups: { type: DataTypes.JSONB, allowNull: true },
    preferred_energy: { type: DataTypes.JSONB, allowNull: true },
    preferred_temperament: { type: DataTypes.JSONB, allowNull: true },
    lifestyle: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    max_distance_km: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 50000 },
    },
    open_to_special_needs: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    notify_new_matches: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    min_notification_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 75,
      validate: { min: 0, max: 100 },
    },
    last_notified_at: { type: DataTypes.DATE, allowNull: true },
    inferred_prefs: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    prefs_updated_at: { type: DataTypes.DATE, allowNull: true },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'adopter_match_profile',
    modelName: 'AdopterMatchProfile',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      { fields: ['notify_new_matches'], name: 'adopter_match_profile_notify_idx' },
      ...auditIndexes('adopter_match_profile'),
    ],
  })
);

export default AdopterMatchProfile;
