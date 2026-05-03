import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

// Plan 2.1 — Pet.images[] / Pet.videos[] JSONB extracted to a typed
// table. One row per image or video; `type` discriminates. Photo-only
// fields (is_primary) and video-only fields (duration_seconds) live
// alongside in the same row — they're sparse but the row count is small
// (a handful per pet) and querying through a single relation is simpler
// than two parallel tables.

export enum PetMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

interface PetMediaAttributes {
  media_id: string;
  pet_id: string;
  type: PetMediaType;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  // Display order within the parent pet's gallery, lowest first. Held as
  // an integer rather than computed-at-read-time so the gallery order is
  // stable across reads regardless of insert order.
  order_index: number;
  // Image-only. Exactly one image per pet should be primary; uniqueness
  // is enforced via a partial index (see indexes below).
  is_primary: boolean;
  // Video-only. Null for images and for videos where duration is unknown
  // (e.g. external-host videos we haven't probed).
  duration_seconds: number | null;
  uploaded_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface PetMediaCreationAttributes
  extends Optional<
    PetMediaAttributes,
    | 'media_id'
    | 'thumbnail_url'
    | 'caption'
    | 'is_primary'
    | 'duration_seconds'
    | 'uploaded_at'
    | 'created_at'
    | 'updated_at'
  > {}

export class PetMedia
  extends Model<PetMediaAttributes, PetMediaCreationAttributes>
  implements PetMediaAttributes
{
  public media_id!: string;
  public pet_id!: string;
  public type!: PetMediaType;
  public url!: string;
  public thumbnail_url!: string | null;
  public caption!: string | null;
  public order_index!: number;
  public is_primary!: boolean;
  public duration_seconds!: number | null;
  public uploaded_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PetMedia.init(
  {
    media_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    pet_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'pets',
        key: 'pet_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM(...Object.values(PetMediaType)),
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'PetMedia',
    tableName: 'pet_media',
    timestamps: true,
    underscored: true,
    indexes: [
      // Most reads load all media for a single pet, ordered by position.
      // Composite (pet_id, order_index) supports both the where + order
      // in one lookup.
      {
        fields: ['pet_id', 'order_index'],
        name: 'pet_media_pet_order_idx',
      },
      {
        fields: ['pet_id', 'type'],
        name: 'pet_media_pet_type_idx',
      },
      // One primary image per pet. Partial index on is_primary so videos
      // and non-primary images don't conflict.
      {
        fields: ['pet_id'],
        name: 'pet_media_one_primary_per_pet',
        unique: true,
        where: { is_primary: true },
      },
      ...auditIndexes('pet_media'),
    ],
  })
);

export default PetMedia;
