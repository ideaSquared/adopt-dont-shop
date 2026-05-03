import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum EvidenceType {
  SCREENSHOT = 'screenshot',
  URL = 'url',
  TEXT = 'text',
  FILE = 'file',
}

export enum EvidenceParentType {
  REPORT = 'report',
  MODERATOR_ACTION = 'moderator_action',
}

/**
 * Evidence attached to a Report or a ModeratorAction (plan 2.1 — typed
 * table replacing the JSONB `evidence[]` arrays on both parents).
 *
 * Polymorphic via (parent_type, parent_id). FK is not enforced at the
 * DB level (no single referenced table), but the parent_type ENUM
 * constrains the discriminator and a composite index covers the
 * "evidence for parent X" lookup. Application code is the only writer
 * — direct INSERTs without a valid parent are caught by code review,
 * not the schema.
 */
interface ModerationEvidenceAttributes {
  evidence_id: string;
  parent_type: EvidenceParentType;
  parent_id: string;
  type: EvidenceType;
  content: string;
  description: string | null;
  uploaded_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface ModerationEvidenceCreationAttributes extends Optional<
  ModerationEvidenceAttributes,
  'evidence_id' | 'description' | 'uploaded_at' | 'created_at' | 'updated_at'
> {}

class ModerationEvidence
  extends Model<ModerationEvidenceAttributes, ModerationEvidenceCreationAttributes>
  implements ModerationEvidenceAttributes
{
  public evidence_id!: string;
  public parent_type!: EvidenceParentType;
  public parent_id!: string;
  public type!: EvidenceType;
  public content!: string;
  public description!: string | null;
  public uploaded_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ModerationEvidence.init(
  {
    evidence_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    parent_type: {
      type: DataTypes.ENUM(...Object.values(EvidenceParentType)),
      allowNull: false,
    },
    parent_id: {
      type: getUuidType(),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(EvidenceType)),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'moderation_evidence',
    modelName: 'ModerationEvidence',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        fields: ['parent_type', 'parent_id'],
        name: 'moderation_evidence_parent_idx',
      },
      ...auditIndexes('moderation_evidence'),
    ],
  })
);

export default ModerationEvidence;
