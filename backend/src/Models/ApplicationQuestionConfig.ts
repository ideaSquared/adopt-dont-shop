import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'

export type QuestionCategory =
  | 'PERSONAL_INFORMATION'
  | 'HOUSEHOLD_INFORMATION'
  | 'PET_OWNERSHIP_EXPERIENCE'
  | 'LIFESTYLE_COMPATIBILITY'
  | 'PET_CARE_COMMITMENT'
  | 'REFERENCES_VERIFICATION'
  | 'FINAL_ACKNOWLEDGMENTS'

export type QuestionType =
  | 'TEXT'
  | 'EMAIL'
  | 'PHONE'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'ADDRESS'

interface ApplicationQuestionConfigAttributes {
  config_id: string
  rescue_id: string
  question_key: string
  category: QuestionCategory
  question_type: QuestionType
  question_text: string
  is_enabled: boolean
  is_required: boolean
  options?: string[] // For SELECT and MULTI_SELECT types
  created_at?: Date
  updated_at?: Date
}

interface ApplicationQuestionConfigCreationAttributes
  extends Optional<ApplicationQuestionConfigAttributes, 'config_id'> {}

class ApplicationQuestionConfig
  extends Model<
    ApplicationQuestionConfigAttributes,
    ApplicationQuestionConfigCreationAttributes
  >
  implements ApplicationQuestionConfigAttributes
{
  public config_id!: string
  public rescue_id!: string
  public question_key!: string
  public category!: QuestionCategory
  public question_type!: QuestionType
  public question_text!: string
  public is_enabled!: boolean
  public is_required!: boolean
  public options?: string[]
  public created_at!: Date
  public updated_at!: Date
}

ApplicationQuestionConfig.init(
  {
    config_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'config_' || left(md5(random()::text), 12)`,
      ),
    },
    rescue_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    question_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(
        'PERSONAL_INFORMATION',
        'HOUSEHOLD_INFORMATION',
        'PET_OWNERSHIP_EXPERIENCE',
        'LIFESTYLE_COMPATIBILITY',
        'PET_CARE_COMMITMENT',
        'REFERENCES_VERIFICATION',
        'FINAL_ACKNOWLEDGMENTS',
      ),
      allowNull: false,
    },
    question_type: {
      type: DataTypes.ENUM(
        'TEXT',
        'EMAIL',
        'PHONE',
        'NUMBER',
        'BOOLEAN',
        'SELECT',
        'MULTI_SELECT',
        'ADDRESS',
      ),
      allowNull: false,
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    options: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'application_question_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
)

export default ApplicationQuestionConfig
