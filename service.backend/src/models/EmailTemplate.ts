import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType, getArrayType, getGeometryType } from '../sequelize';
import { JsonObject } from '../types/common';
import { generateReadableId, getReadableIdSqlLiteral } from '../utils/readable-id';

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

interface TemplateVersion {
  version: number;
  subject: string;
  htmlContent: string;
  textContent?: string;
  createdAt: Date;
  createdBy: string;
  changeNotes?: string;
}

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
  versions: TemplateVersion[];
  currentVersion: number;
  isDefault: boolean;
  priority: number;
  tags?: string[];
  createdBy: string;
  lastModifiedBy?: string;
  lastUsedAt?: Date;
  usageCount: number;
  testEmailsSent: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface EmailTemplateCreationAttributes
  extends Optional<EmailTemplateAttributes, 'templateId' | 'createdAt' | 'updatedAt'> {}

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
  public versions!: TemplateVersion[];
  public currentVersion!: number;
  public isDefault!: boolean;
  public priority!: number;
  public tags?: string[];
  public createdBy!: string;
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

  public addVersion(
    subject: string,
    htmlContent: string,
    textContent: string | undefined,
    updatedBy: string,
    changeNotes?: string
  ): void {
    const newVersion: TemplateVersion = {
      version: this.currentVersion + 1,
      subject,
      htmlContent,
      textContent,
      createdAt: new Date(),
      createdBy: updatedBy,
      changeNotes,
    };

    this.versions.push(newVersion);
    this.currentVersion = newVersion.version;
    this.subject = subject;
    this.htmlContent = htmlContent;
    this.textContent = textContent;
    this.lastModifiedBy = updatedBy;
  }

  public getVersion(version: number): TemplateVersion | undefined {
    return this.versions.find(v => v.version === version);
  }

  public getLatestVersion(): TemplateVersion | undefined {
    return this.versions.find(v => v.version === this.currentVersion);
  }

  public incrementUsage(): void {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
  }

  public incrementTestEmails(): void {
    this.testEmailsSent += 1;
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
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'template_id',
      defaultValue:
        process.env.NODE_ENV === 'test'
          ? () => generateReadableId('template')
          : sequelize.literal(getReadableIdSqlLiteral('template')),
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
      type: DataTypes.STRING,
      allowNull: true,
      field: 'parent_template_id',
      references: {
        model: 'email_templates',
        key: 'template_id',
      },
    },
    versions: {
      type: getJsonType(),
      allowNull: false,
    },
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
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    lastModifiedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_modified_by',
      references: {
        model: 'users',
        key: 'user_id',
      },
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
  },
  {
    sequelize,
    tableName: 'email_templates',
    timestamps: true,
    paranoid: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
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
      {
        fields: ['created_by'],
      },
      {
        fields: ['last_used_at'],
      },
      {
        fields: ['tags'],
        using: 'gin',
      },
    ],
  }
);

export default EmailTemplate;
