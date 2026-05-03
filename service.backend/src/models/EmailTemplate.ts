import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

export enum TemplateType {
  TRANSACTIONAL = 'transactional',
  NOTIFICATION = 'notification',
  MARKETING = 'marketing',
  SYSTEM = 'system',
  ADMINISTRATIVE = 'administrative',
}

export enum TemplateCategory {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  APPLICATION_UPDATE = 'application_update',
  ADOPTION_CONFIRMATION = 'adoption_confirmation',
  RESCUE_VERIFICATION = 'rescue_verification',
  STAFF_INVITATION = 'staff_invitation',
  NOTIFICATION_DIGEST = 'notification_digest',
  REMINDER = 'reminder',
  ANNOUNCEMENT = 'announcement',
  NEWSLETTER = 'newsletter',
  SYSTEM_ALERT = 'system_alert',
}

export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  description: string;
  required: boolean;
  defaultValue?: unknown;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

// EmailTemplate.versions[] moved to the email_template_versions table
// (plan 5.4) — see EmailTemplateVersion. EmailTemplate.hasMany.

interface EmailTemplateAttributes {
  templateId: string;
  name: string;
  description?: string;
  type: TemplateType;
  category: TemplateCategory;
  status: TemplateStatus;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: TemplateVariable[];
  metadata?: JsonObject;
  locale: string;
  parentTemplateId?: string; // For template inheritance
  // versions[] moved to email_template_versions (plan 5.4).
  currentVersion: number;
  isDefault: boolean;
  priority: number;
  tags?: string[];
  // createdBy removed — provided by auditColumns helper as `created_by`.
  lastModifiedBy?: string;
  lastUsedAt?: Date;
  usageCount: number;
  testEmailsSent: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface EmailTemplateCreationAttributes extends Optional<
  EmailTemplateAttributes,
  'templateId' | 'createdAt' | 'updatedAt'
> {}

class EmailTemplate
  extends Model<EmailTemplateAttributes, EmailTemplateCreationAttributes>
  implements EmailTemplateAttributes
{
  public templateId!: string;
  public name!: string;
  public description?: string;
  public type!: TemplateType;
  public category!: TemplateCategory;
  public status!: TemplateStatus;
  public subject!: string;
  public htmlContent!: string;
  public textContent?: string;
  public variables!: TemplateVariable[];
  public metadata?: JsonObject;
  public locale!: string;
  public parentTemplateId?: string;
  // versions[] moved to email_template_versions (plan 5.4).
  public currentVersion!: number;
  public isDefault!: boolean;
  public priority!: number;
  public tags?: string[];
  public lastModifiedBy?: string;
  public lastUsedAt?: Date;
  public usageCount!: number;
  public testEmailsSent!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;

  // Instance methods
  public isActive(): boolean {
    return this.status === TemplateStatus.ACTIVE;
  }

  public isDraft(): boolean {
    return this.status === TemplateStatus.DRAFT;
  }

  // Version history methods moved to EmailTemplateService (plan 5.4) —
  // they now create rows in email_template_versions instead of mutating
  // an in-memory array on the template instance.

  public async incrementUsage(): Promise<void> {
    // Atomic — parallel email sends can all use the same template. We have
    // to reload after .increment() because version: true on this model
    // means the in-memory `version` is stale once the increment hits the DB,
    // and the subsequent .save() would fail with a stale-instance error.
    await this.increment('usageCount');
    await this.reload();
    this.lastUsedAt = new Date();
    await this.save();
  }

  public async incrementTestEmails(): Promise<void> {
    await this.increment('testEmailsSent');
  }

  public hasVariable(variableName: string): boolean {
    return this.variables.some(v => v.name === variableName);
  }

  public getRequiredVariables(): TemplateVariable[] {
    return this.variables.filter(v => v.required);
  }

  public validateVariables(data: JsonObject): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required variables
    const requiredVars = this.getRequiredVariables();
    for (const variable of requiredVars) {
      if (
        !(variable.name in data) ||
        data[variable.name] === null ||
        data[variable.name] === undefined
      ) {
        errors.push(`Required variable '${variable.name}' is missing`);
      }
    }

    // Validate variable types and constraints
    for (const variable of this.variables) {
      const value = data[variable.name];
      if (value !== undefined && value !== null) {
        if (!this.validateVariableValue(variable, value)) {
          errors.push(`Variable '${variable.name}' validation failed`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateVariableValue(variable: TemplateVariable, value: unknown): boolean {
    // Type checking
    switch (variable.type) {
      case 'string':
        if (typeof value !== 'string') {
          return false;
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          return false;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return false;
        }
        break;
      case 'date':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return false;
        }
        break;
      case 'object':
        if (typeof value !== 'object') {
          return false;
        }
        break;
    }

    // Validation rules
    if (variable.validation) {
      const validation = variable.validation;

      if (typeof value === 'string') {
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          return false;
        }
        if (validation.minLength && value.length < validation.minLength) {
          return false;
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          return false;
        }
      }

      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          return false;
        }
        if (validation.max !== undefined && value > validation.max) {
          return false;
        }
      }
    }

    return true;
  }
}

EmailTemplate.init(
  {
    templateId: {
      type: getUuidType(),
      primaryKey: true,
      field: 'template_id',
      defaultValue: () => generateUuidV7(),
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TemplateType)),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(TemplateCategory)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TemplateStatus)),
      allowNull: false,
      defaultValue: TemplateStatus.DRAFT,
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },
    htmlContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'html_content',
      validate: {
        notEmpty: true,
      },
    },
    textContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'text_content',
    },
    variables: {
      type: getJsonType(),
      allowNull: false,
      validate: {
        isValidVariables(value: TemplateVariable[]) {
          if (!Array.isArray(value)) {
            throw new Error('Variables must be an array');
          }
          for (const variable of value) {
            if (!variable.name || !variable.type || typeof variable.required !== 'boolean') {
              throw new Error('Invalid variable format');
            }
          }
        },
      },
    },
    metadata: {
      type: getJsonType(),
      allowNull: false,
      defaultValue: {},
    },
    locale: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'en',
      validate: {
        isIn: [['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko']],
      },
    },
    parentTemplateId: {
      type: getUuidType(),
      allowNull: true,
      field: 'parent_template_id',
      references: {
        model: 'email_templates',
        key: 'template_id',
      },
      onDelete: 'SET NULL',
    },
    // versions[] moved to email_template_versions (plan 5.4).
    currentVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'current_version',
      validate: {
        min: 1,
      },
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    tags: {
      type: getArrayType(DataTypes.STRING),
      allowNull: false,
      defaultValue: process.env.NODE_ENV === 'test' ? '[]' : [],
      get() {
        const rawValue = this.getDataValue('tags');
        // In SQLite, arrays are stored as JSON strings
        if (typeof rawValue === 'string') {
          try {
            return JSON.parse(rawValue);
          } catch {
            return [];
          }
        }
        return rawValue || [];
      },
      set(value: string[]) {
        // In SQLite, store as JSON string
        if (process.env.NODE_ENV === 'test') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.setDataValue('tags', JSON.stringify(value || []) as any);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.setDataValue('tags', value || ([] as any));
        }
      },
    },
    // createdBy column dropped — superseded by auditColumns.created_by.
    // lastModifiedBy is a distinct column (last_modified_by) used by the
    // template version history — kept separate from updated_by which tracks
    // any row mutation.
    lastModifiedBy: {
      type: getUuidType(),
      allowNull: true,
      field: 'last_modified_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at',
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'usage_count',
      validate: {
        min: 0,
      },
    },
    testEmailsSent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'test_emails_sent',
      validate: {
        min: 0,
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'email_templates',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['name'],
        unique: true,
      },
      {
        fields: ['type'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['locale'],
      },
      {
        fields: ['is_default'],
      },
      // created_by index now provided by auditIndexes('email_templates').
      {
        name: 'email_templates_last_modified_by_idx',
        fields: ['last_modified_by'],
      },
      {
        name: 'email_templates_parent_template_id_idx',
        fields: ['parent_template_id'],
      },
      {
        fields: ['last_used_at'],
      },
      {
        fields: ['tags'],
        using: 'gin',
      },
      { fields: ['deleted_at'], name: 'email_templates_deleted_at_idx' },
      ...auditIndexes('email_templates'),
    ],
  })
);

export default EmailTemplate;
