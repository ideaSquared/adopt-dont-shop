import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

// Plan 2.1 — Application.references[] JSONB extracted to a typed table.
// One row per personal/veterinary reference attached to an application.
// Status moves through pending → contacted → verified | failed as the
// rescue follows up. The legacy "ref-N" id format used in the JSONB
// payload is preserved on a dedicated column (legacy_id) so the
// existing ID-based `updateReference` path keeps working without a data
// migration; new rows will set legacy_id to the same value as the row's
// PK by default.

export enum ApplicationReferenceStatus {
  PENDING = 'pending',
  CONTACTED = 'contacted',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

interface ApplicationReferenceAttributes {
  reference_id: string;
  application_id: string;
  // Legacy "ref-N" identifier from the JSONB shape — kept on the row so
  // existing API calls that pass `referenceId` continue to resolve to a
  // single row. Unique per application.
  legacy_id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  status: ApplicationReferenceStatus;
  contacted_at: Date | null;
  contacted_by: string | null;
  notes: string | null;
  // Display order within the parent application's reference list,
  // lowest first. Replaces the implicit array-index ordering of the
  // JSONB shape.
  order_index: number;
  created_at?: Date;
  updated_at?: Date;
}

interface ApplicationReferenceCreationAttributes
  extends Optional<
    ApplicationReferenceAttributes,
    | 'reference_id'
    | 'email'
    | 'status'
    | 'contacted_at'
    | 'contacted_by'
    | 'notes'
    | 'order_index'
    | 'created_at'
    | 'updated_at'
  > {}

export class ApplicationReference
  extends Model<ApplicationReferenceAttributes, ApplicationReferenceCreationAttributes>
  implements ApplicationReferenceAttributes
{
  public reference_id!: string;
  public application_id!: string;
  public legacy_id!: string;
  public name!: string;
  public relationship!: string;
  public phone!: string;
  public email!: string | null;
  public status!: ApplicationReferenceStatus;
  public contacted_at!: Date | null;
  public contacted_by!: string | null;
  public notes!: string | null;
  public order_index!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ApplicationReference.init(
  {
    reference_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    application_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'applications',
        key: 'application_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    legacy_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    relationship: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    phone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ApplicationReferenceStatus)),
      allowNull: false,
      defaultValue: ApplicationReferenceStatus.PENDING,
    },
    contacted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    contacted_by: {
      type: getUuidType(),
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id',
      },
      // Forensic — preserve the row even if the actor is removed. The
      // audit trail still records who handled the reference.
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    notes: {
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
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'ApplicationReference',
    tableName: 'application_references',
    timestamps: true,
    underscored: true,
    indexes: [
      // Most reads load all references for an application, ordered by
      // position. Composite (application_id, order_index) covers the
      // where + order in one lookup.
      {
        fields: ['application_id', 'order_index'],
        name: 'application_references_app_order_idx',
      },
      // Look up a reference by its caller-supplied legacy_id (e.g. the
      // "ref-0" string from the JSONB era).
      {
        fields: ['application_id', 'legacy_id'],
        name: 'application_references_app_legacy_unique',
        unique: true,
      },
      {
        fields: ['status'],
        name: 'application_references_status_idx',
      },
      {
        fields: ['contacted_by'],
        name: 'application_references_contacted_by_idx',
      },
      ...auditIndexes('application_references'),
    ],
  })
);

export default ApplicationReference;
