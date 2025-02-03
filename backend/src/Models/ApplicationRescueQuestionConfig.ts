import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../sequelize'
import ApplicationCoreQuestion from './ApplicationCoreQuestions'

interface ApplicationRescueQuestionConfigAttributes {
  config_id: string
  rescue_id: string
  question_key: string
  is_enabled: boolean
  is_required: boolean
  created_at?: Date
  updated_at?: Date
}

interface ApplicationRescueQuestionConfigCreationAttributes
  extends Optional<ApplicationRescueQuestionConfigAttributes, 'config_id'> {}

class ApplicationRescueQuestionConfig
  extends Model<
    ApplicationRescueQuestionConfigAttributes,
    ApplicationRescueQuestionConfigCreationAttributes
  >
  implements ApplicationRescueQuestionConfigAttributes
{
  public config_id!: string
  public rescue_id!: string
  public question_key!: string
  public is_enabled!: boolean
  public is_required!: boolean
  public created_at!: Date
  public updated_at!: Date
}

ApplicationRescueQuestionConfig.init(
  {
    config_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(
        `'cfg_' || left(md5(random()::text), 12)`,
      ),
    },
    rescue_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    question_key: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: ApplicationCoreQuestion,
        key: 'question_key',
      },
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
    tableName: 'application_rescue_question_configs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['rescue_id', 'question_key'],
      },
    ],
  },
)

// Set up associations
ApplicationRescueQuestionConfig.belongsTo(ApplicationCoreQuestion, {
  foreignKey: 'question_key',
  targetKey: 'question_key',
  as: 'rescueCoreQuestion',
})

ApplicationCoreQuestion.hasMany(ApplicationRescueQuestionConfig, {
  foreignKey: 'question_key',
  sourceKey: 'question_key',
  as: 'ApplicationRescueQuestionConfigs',
})

export default ApplicationRescueQuestionConfig
