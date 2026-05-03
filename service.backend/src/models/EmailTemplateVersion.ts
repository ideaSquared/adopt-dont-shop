import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

// Plan 5.4 — EmailTemplate.versions[] JSONB extracted to a typed
// table. The legacy shape stored every historical version of a
// template inline as a JSONB array, which made "show me all templates
// modified last month" or "diff version 3 against 5" hard to query
// efficiently. With one row per (template, version) those queries are
// straightforward. EmailTemplate.hasMany(EmailTemplateVersion).

interface EmailTemplateVersionAttributes {
  template_version_id: string;
  template_id: string;
  // Sequential version number within the parent template — version 1
  // is the initial state, every addVersion() call increments. Pair
  // with template_id for uniqueness.
  version: number;
  subject: string;
  html_content: string;
  text_content: string | null;
  // Free-form note explaining why this version was created. Maps to
  // the legacy `changeNotes` field on the JSONB shape.
  change_notes: string | null;
  // The "author" of a version row is the audit `created_by` column
  // provided by auditColumns — same semantics, no need to duplicate.
  // The association in models/index.ts uses created_by as the FK.
  created_at?: Date;
  updated_at?: Date;
}

interface EmailTemplateVersionCreationAttributes extends Optional<
  EmailTemplateVersionAttributes,
  'template_version_id' | 'text_content' | 'change_notes' | 'created_at' | 'updated_at'
> {}

export class EmailTemplateVersion
  extends Model<EmailTemplateVersionAttributes, EmailTemplateVersionCreationAttributes>
  implements EmailTemplateVersionAttributes
{
  public template_version_id!: string;
  public template_id!: string;
  public version!: number;
  public subject!: string;
  public html_content!: string;
  public text_content!: string | null;
  public change_notes!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

EmailTemplateVersion.init(
  {
    template_version_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    template_id: {
      type: getUuidType(),
      allowNull: false,
      references: {
        model: 'email_templates',
        key: 'template_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },
    html_content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    text_content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    change_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'EmailTemplateVersion',
    tableName: 'email_template_versions',
    timestamps: true,
    underscored: true,
    indexes: [
      // Most reads load all versions of one template, ordered newest
      // first. Composite (template_id, version DESC) covers the
      // dominant query pattern.
      {
        fields: ['template_id', { name: 'version', order: 'DESC' }],
        name: 'email_template_versions_template_version_idx',
      },
      // One row per (template, version). Re-running the same version
      // would be a bug — the unique index makes it impossible.
      {
        fields: ['template_id', 'version'],
        name: 'email_template_versions_template_version_unique',
        unique: true,
      },
      // created_by index provided by auditIndexes (the column comes
      // from auditColumns).
      ...auditIndexes('email_template_versions'),
    ],
  })
);

export default EmailTemplateVersion;
