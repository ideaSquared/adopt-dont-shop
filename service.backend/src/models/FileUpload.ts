import { DataTypes, Model, Optional } from 'sequelize';
import { generateCryptoUuid } from '../utils/uuid-helpers';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { JsonObject } from '../types/common';

interface FileUploadAttributes {
  upload_id: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  url: string;
  thumbnail_url?: string;
  uploaded_by: string;
  entity_id?: string;
  entity_type?: string;
  purpose?: string;
  metadata: JsonObject;
  created_at?: Date;
  updated_at?: Date;
}

interface FileUploadCreationAttributes
  extends Optional<FileUploadAttributes, 'upload_id' | 'created_at' | 'updated_at'> {}

class FileUpload
  extends Model<FileUploadAttributes, FileUploadCreationAttributes>
  implements FileUploadAttributes
{
  public upload_id!: string;
  public original_filename!: string;
  public stored_filename!: string;
  public file_path!: string;
  public mime_type!: string;
  public file_size!: number;
  public url!: string;
  public thumbnail_url?: string;
  public uploaded_by!: string;
  public entity_id?: string;
  public entity_type?: string;
  public purpose?: string;
  public metadata!: JsonObject;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

FileUpload.init(
  {
    upload_id: {
      type: getUuidType(),
      defaultValue: () => generateCryptoUuid(),
      primaryKey: true,
    },
    original_filename: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },
    stored_filename: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },
    file_path: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000],
      },
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 0,
        max: 100 * 1024 * 1024, // 100MB max
      },
    },
    url: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000],
      },
    },
    thumbnail_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    uploaded_by: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    entity_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [0, 255],
      },
    },
    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
        isIn: [['chat', 'message', 'application', 'pet', 'user', 'rescue']],
      },
    },
    purpose: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
        isIn: [['attachment', 'avatar', 'document', 'image', 'video', 'audio', 'chat_attachment']],
      },
    },
    metadata: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidMetadata(value: unknown) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('Metadata must be a valid JSON object');
          }
        },
      },
    },
  },
  {
    sequelize,
    tableName: 'file_uploads',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['uploaded_by'],
      },
      {
        fields: ['entity_id', 'entity_type'],
      },
      {
        fields: ['purpose'],
      },
      {
        fields: ['mime_type'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['stored_filename'],
        unique: true,
      },
    ],
  }
);

export default FileUpload;
