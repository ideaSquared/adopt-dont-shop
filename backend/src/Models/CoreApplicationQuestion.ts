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

interface CoreApplicationQuestionAttributes {
  question_key: string
  category: QuestionCategory
  question_type: QuestionType
  question_text: string
  options?: string[]
  is_enabled: boolean
  is_required: boolean
  created_at?: Date
  updated_at?: Date
}

interface CoreApplicationQuestionCreationAttributes
  extends Optional<CoreApplicationQuestionAttributes, 'question_key'> {}

class CoreApplicationQuestion
  extends Model<
    CoreApplicationQuestionAttributes,
    CoreApplicationQuestionCreationAttributes
  >
  implements CoreApplicationQuestionAttributes
{
  public question_key!: string
  public category!: QuestionCategory
  public question_type!: QuestionType
  public question_text!: string
  public options?: string[]
  public is_enabled!: boolean
  public is_required!: boolean
  public created_at!: Date
  public updated_at!: Date
}

CoreApplicationQuestion.init(
  {
    question_key: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(`'q_' || left(md5(random()::text), 12)`),
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
    options: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'core_application_questions',
    timestamps: true,
    underscored: true,
  },
)

export default CoreApplicationQuestion
