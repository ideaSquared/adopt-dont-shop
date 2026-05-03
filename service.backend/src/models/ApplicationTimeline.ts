import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';

// Timeline Event Types
export enum TimelineEventType {
  STAGE_CHANGE = 'stage_change',
  STATUS_UPDATE = 'status_update',
  NOTE_ADDED = 'note_added',
  REFERENCE_CONTACTED = 'reference_contacted',
  REFERENCE_VERIFIED = 'reference_verified',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  HOME_VISIT_SCHEDULED = 'home_visit_scheduled',
  HOME_VISIT_COMPLETED = 'home_visit_completed',
  HOME_VISIT_RESCHEDULED = 'home_visit_rescheduled',
  HOME_VISIT_CANCELLED = 'home_visit_cancelled',
  SCORE_UPDATED = 'score_updated',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DECISION_MADE = 'decision_made',
  APPLICATION_APPROVED = 'application_approved',
  APPLICATION_REJECTED = 'application_rejected',
  APPLICATION_WITHDRAWN = 'application_withdrawn',
  APPLICATION_REOPENED = 'application_reopened',
  COMMUNICATION_SENT = 'communication_sent',
  COMMUNICATION_RECEIVED = 'communication_received',
  SYSTEM_AUTO_PROGRESSION = 'system_auto_progression',
  MANUAL_OVERRIDE = 'manual_override',
}

export interface ApplicationTimelineAttributes {
  timeline_id: string;
  application_id: string;
  event_type: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null; // user_id of staff member who triggered the event
  // Snapshot of the actor's email at the moment the timeline event
  // was written. created_by is a soft reference (no FK enforcement)
  // — the user may be deleted before the timeline is read, at which
  // point the live lookup returns null. Snapshot keeps the history
  // readable forever ("admin@x.test approved this application"
  // instead of "[deleted user] approved this application"). Mirrors
  // AuditLog.user_email_snapshot (plan 4.5).
  created_by_email_snapshot?: string | null;
  created_by_system?: boolean; // true for automated events
  created_at?: Date;
  updated_at?: Date;

  // Stage-specific fields
  previous_stage?: string | null;
  new_stage?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
}

interface ApplicationTimelineCreationAttributes extends Optional<
  ApplicationTimelineAttributes,
  'timeline_id' | 'created_at' | 'updated_at'
> {}

class ApplicationTimeline
  extends Model<ApplicationTimelineAttributes, ApplicationTimelineCreationAttributes>
  implements ApplicationTimelineAttributes
{
  public timeline_id!: string;
  public application_id!: string;
  public event_type!: TimelineEventType;
  public title!: string;
  public description?: string | null;
  public metadata?: Record<string, unknown> | null;
  public created_by?: string | null;
  public created_by_email_snapshot?: string | null;
  public created_by_system?: boolean;
  public created_at?: Date;
  public updated_at?: Date;

  public previous_stage?: string | null;
  public new_stage?: string | null;
  public previous_status?: string | null;
  public new_status?: string | null;
}

ApplicationTimeline.init(
  {
    timeline_id: {
      type: getUuidType(),
      defaultValue: () => generateUuidV7(),
      primaryKey: true,
    },
    application_id: {
      type: getUuidType(),
      allowNull: false,
      // FK relationship defined at association level with constraints: false
      // (see models/index.ts) so timeline events can be created in tests
      // without requiring the application row to exist.
    },
    event_type: {
      type: DataTypes.ENUM(...Object.values(TimelineEventType)),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: getJsonType(),
      allowNull: true,
    },
    created_by: {
      type: getUuidType(),
      allowNull: true,
      // FK relationship defined at association level with constraints: false
      // (see models/index.ts) so timeline events can be created in tests
      // without requiring the user row to exist.
    },
    // See the field comment on the attribute interface — display
    // safety-net for when the actor is later deleted. Plan 4.5.
    created_by_email_snapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_by_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    previous_stage: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    new_stage: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    previous_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'application_timeline',
    timestamps: true,
    underscored: true,
    // Append-only event log (timeline rows are immutable history). No
    // soft-delete — opts out of the global define.paranoid: true.
    paranoid: false,
    indexes: [
      {
        fields: ['application_id', 'created_at'],
        name: 'application_timeline_application_id_idx',
      },
      {
        fields: ['event_type'],
      },
      {
        fields: ['created_by'],
        name: 'application_timeline_created_by_idx',
      },
    ],
  }
);

export default ApplicationTimeline;
