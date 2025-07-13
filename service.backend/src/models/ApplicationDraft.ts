import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { JsonObject } from '../types/common';

/**
 * Phase 1 - Enhanced Application Draft Model
 * Stores draft application data with auto-save and cross-device sync capabilities.
 * Enables users to save progress on adoption applications and resume later
 * across different devices with automatic expiration management.
 */

/**
 * Draft status enumeration for tracking draft lifecycle
 */
export enum DraftStatus {
  /** Draft is actively being worked on */
  ACTIVE = 'active',
  /** Draft was completed and submitted as application */
  COMPLETED = 'completed',
  /** Draft was abandoned by user */
  ABANDONED = 'abandoned',
  /** Draft has expired after inactivity period */
  EXPIRED = 'expired',
}

/**
 * Complete attributes interface for ApplicationDraft model
 */
interface ApplicationDraftAttributes {
  /** Unique identifier for the draft */
  draftId: string;
  /** ID of the user who owns this draft */
  userId: string;
  /** ID of the pet this application is for */
  petId: string;
  /** ID of the rescue organization */
  rescueId: string;
  /** Current status of the draft */
  status: DraftStatus;
  /** JSON object containing the draft application data */
  draftData: JsonObject;
  /** Percentage completion (0-100) */
  completionPercentage: number;
  /** Last step that was saved */
  lastSavedStep: number;
  /** Total number of steps in the application */
  totalSteps: number;
  /** Whether auto-save is enabled for this draft */
  autoSaveEnabled: boolean;
  /** When the draft expires and will be cleaned up */
  expiresAt: Date;
  /** Optional device information for tracking */
  deviceInfo?: JsonObject;
  /** When the draft was last accessed */
  lastAccessedAt: Date;
  /** When the draft was created */
  createdAt: Date;
  /** When the draft was last updated */
  updatedAt: Date;
  /** When the draft was soft-deleted (null if not deleted) */
  deletedAt?: Date | null;
}

/**
 * Creation attributes interface with optional fields for ApplicationDraft
 */
interface ApplicationDraftCreationAttributes
  extends Optional<
    ApplicationDraftAttributes,
    | 'draftId'
    | 'status'
    | 'completionPercentage'
    | 'autoSaveEnabled'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  > {}

/**
 * ApplicationDraft Model Class
 * Sequelize model for managing draft application data with built-in
 * methods for expiration checking and progress tracking.
 */
class ApplicationDraft
  extends Model<ApplicationDraftAttributes, ApplicationDraftCreationAttributes>
  implements ApplicationDraftAttributes
{
  public draftId!: string;
  public userId!: string;
  public petId!: string;
  public rescueId!: string;
  public status!: DraftStatus;
  public draftData!: JsonObject;
  public completionPercentage!: number;
  public lastSavedStep!: number;
  public totalSteps!: number;
  public autoSaveEnabled!: boolean;
  public expiresAt!: Date;
  public deviceInfo!: JsonObject;
  public lastAccessedAt!: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;

  // Instance methods
  /**
   * Check if the draft has expired and should be marked as expired
   * @returns True if current date is past the expiration date
   */
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Calculate completion percentage based on current step progress
   * @returns Completion percentage as integer (0-100)
   */
  public getCompletionPercentage(): number {
    return Math.round((this.lastSavedStep / this.totalSteps) * 100);
  }

  /**
   * Update the last accessed timestamp to current time
   * @returns Promise resolving to the updated draft instance
   */
  public updateLastAccessed(): Promise<ApplicationDraft> {
    return this.update({ lastAccessedAt: new Date() });
  }
}

ApplicationDraft.init(
  {
    draftId: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'draft_id',
      defaultValue:
        process.env.NODE_ENV === 'test'
          ? () => 'draft_' + Math.random().toString(36).substr(2, 12)
          : sequelize.literal(`'draft_' || left(md5(random()::text), 12)`),
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    petId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'pet_id',
      references: {
        model: 'pets',
        key: 'pet_id',
      },
    },
    rescueId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'rescue_id',
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(DraftStatus)),
      allowNull: false,
      defaultValue: DraftStatus.ACTIVE,
    },
    draftData: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'draft_data',
      defaultValue: {},
    },
    completionPercentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'completion_percentage',
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    lastSavedStep: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'last_saved_step',
      defaultValue: 1,
    },
    totalSteps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_steps',
      defaultValue: 5,
    },
    autoSaveEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'auto_save_enabled',
      defaultValue: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
      defaultValue: () => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now
        return expiryDate;
      },
    },
    deviceInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'device_info',
      defaultValue: null,
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'last_accessed_at',
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    modelName: 'ApplicationDraft',
    tableName: 'application_drafts',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['pet_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['expires_at'],
      },
      {
        fields: ['last_accessed_at'],
      },
      {
        unique: true,
        fields: ['user_id', 'pet_id'],
        where: {
          deleted_at: null,
          status: DraftStatus.ACTIVE,
        },
      },
    ],
  }
);

export default ApplicationDraft;
