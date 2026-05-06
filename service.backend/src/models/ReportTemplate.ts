import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';
import { JsonObject } from '../types/common';

export enum ReportTemplateCategory {
  ADOPTION = 'adoption',
  ENGAGEMENT = 'engagement',
  OPERATIONS = 'operations',
  FUNDRAISING = 'fundraising',
  CUSTOM = 'custom',
}

interface ReportTemplateAttributes {
  template_id: string;
  name: string;
  description: string | null;
  category: ReportTemplateCategory;
  config: JsonObject;
  is_system: boolean;
  rescue_id: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface ReportTemplateCreationAttributes extends Optional<
  ReportTemplateAttributes,
  | 'template_id'
  | 'description'
  | 'is_system'
  | 'rescue_id'
  | 'created_by'
  | 'updated_by'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
> {}

class ReportTemplate
  extends Model<ReportTemplateAttributes, ReportTemplateCreationAttributes>
  implements ReportTemplateAttributes
{
  public template_id!: string;
  public name!: string;
  public description!: string | null;
  public category!: ReportTemplateCategory;
  public config!: JsonObject;
  public is_system!: boolean;
  public rescue_id!: string | null;
  public created_by!: string | null;
  public updated_by!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public deleted_at!: Date | null;
}

ReportTemplate.init(
  {
    template_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(ReportTemplateCategory)),
      allowNull: false,
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    rescue_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    tableName: 'report_templates',
    modelName: 'ReportTemplate',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['category'], name: 'report_templates_category_idx' },
      { fields: ['is_system'], name: 'report_templates_is_system_idx' },
      { fields: ['rescue_id'], name: 'report_templates_rescue_idx' },
      ...auditIndexes('report_templates'),
    ],
  })
);

export default ReportTemplate;
