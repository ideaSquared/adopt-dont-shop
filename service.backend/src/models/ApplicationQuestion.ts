import { DataTypes, Model, Op, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { JsonObject } from '../types/common';

export enum QuestionCategory {
  PERSONAL_INFORMATION = 'personal_information',
  HOUSEHOLD_INFORMATION = 'household_information',
  PET_OWNERSHIP_EXPERIENCE = 'pet_ownership_experience',
  LIFESTYLE_COMPATIBILITY = 'lifestyle_compatibility',
  PET_CARE_COMMITMENT = 'pet_care_commitment',
  REFERENCES_VERIFICATION = 'references_verification',
  FINAL_ACKNOWLEDGMENTS = 'final_acknowledgments',
}

export enum QuestionType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  ADDRESS = 'address',
  DATE = 'date',
  FILE = 'file',
}

export enum QuestionScope {
  CORE = 'core', // Available to all rescues
  RESCUE_SPECIFIC = 'rescue_specific', // Specific to one rescue
}

interface ApplicationQuestionAttributes {
  question_id: string;
  rescue_id?: string | null; // null for core questions, specific ID for rescue questions
  question_key: string; // Unique identifier for the question
  scope: QuestionScope;
  category: QuestionCategory;
  question_type: QuestionType;
  question_text: string;
  help_text?: string | null;
  placeholder?: string | null;
  options?: string[] | null; // For select/multi-select questions
  validation_rules?: JsonObject | null; // Custom validation rules
  display_order: number;
  is_enabled: boolean;
  is_required: boolean;
  conditional_logic?: JsonObject | null; // Show/hide based on other answers
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface ApplicationQuestionCreationAttributes
  extends Optional<
    ApplicationQuestionAttributes,
    | 'question_id'
    | 'display_order'
    | 'is_enabled'
    | 'is_required'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
  > {}

class ApplicationQuestion
  extends Model<ApplicationQuestionAttributes, ApplicationQuestionCreationAttributes>
  implements ApplicationQuestionAttributes
{
  public question_id!: string;
  public rescue_id!: string | null;
  public question_key!: string;
  public scope!: QuestionScope;
  public category!: QuestionCategory;
  public question_type!: QuestionType;
  public question_text!: string;
  public help_text!: string | null;
  public placeholder!: string | null;
  public options!: string[] | null;
  public validation_rules!: JsonObject | null;
  public display_order!: number;
  public is_enabled!: boolean;
  public is_required!: boolean;
  public conditional_logic!: JsonObject | null;
  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at!: Date | null;

  // Instance methods
  public isCoreQuestion(): boolean {
    return this.scope === QuestionScope.CORE && this.rescue_id === null;
  }

  public isRescueSpecific(): boolean {
    return this.scope === QuestionScope.RESCUE_SPECIFIC && this.rescue_id !== null;
  }

  public isSelectType(): boolean {
    return [QuestionType.SELECT, QuestionType.MULTI_SELECT].includes(this.question_type);
  }

  public requiresOptions(): boolean {
    return this.isSelectType();
  }

  public validateAnswer(answer: any): { isValid: boolean; error?: string } {
    // Basic validation
    if (this.is_required && (answer === null || answer === undefined || answer === '')) {
      return { isValid: false, error: 'This question is required' };
    }

    // Type-specific validation
    switch (this.question_type) {
      case QuestionType.EMAIL:
        if (answer && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) {
          return { isValid: false, error: 'Please enter a valid email address' };
        }
        break;
      case QuestionType.PHONE:
        if (answer && !/^\+?[1-9]\d{1,14}$/.test(answer.replace(/\s|-|\(|\)/g, ''))) {
          return { isValid: false, error: 'Please enter a valid phone number' };
        }
        break;
      case QuestionType.NUMBER:
        if (answer && isNaN(Number(answer))) {
          return { isValid: false, error: 'Please enter a valid number' };
        }
        break;
      case QuestionType.SELECT:
        if (answer && this.options && !this.options.includes(answer)) {
          return { isValid: false, error: 'Please select a valid option' };
        }
        break;
      case QuestionType.MULTI_SELECT:
        if (answer && Array.isArray(answer) && this.options) {
          const invalidOptions = answer.filter(opt => !this.options!.includes(opt));
          if (invalidOptions.length > 0) {
            return { isValid: false, error: 'Some selected options are invalid' };
          }
        }
        break;
    }

    // Custom validation rules
    if (this.validation_rules) {
      // Implement custom validation logic here
      // This could include min/max length, regex patterns, etc.
    }

    return { isValid: true };
  }

  // Static methods
  public static async getCoreQuestions(
    category?: QuestionCategory
  ): Promise<ApplicationQuestion[]> {
    const where: any = { scope: QuestionScope.CORE, is_enabled: true };
    if (category) {
      where.category = category;
    }

    return this.findAll({
      where,
      order: [
        ['category', 'ASC'],
        ['display_order', 'ASC'],
      ],
    });
  }

  public static async getRescueQuestions(
    rescueId: string,
    category?: QuestionCategory
  ): Promise<ApplicationQuestion[]> {
    const where: any = {
      rescue_id: rescueId,
      scope: QuestionScope.RESCUE_SPECIFIC,
      is_enabled: true,
    };
    if (category) {
      where.category = category;
    }

    return this.findAll({
      where,
      order: [
        ['category', 'ASC'],
        ['display_order', 'ASC'],
      ],
    });
  }

  public static async getAllQuestionsForRescue(rescueId: string): Promise<ApplicationQuestion[]> {
    return this.findAll({
      where: {
        [Op.or]: [
          { scope: QuestionScope.CORE, is_enabled: true },
          { rescue_id: rescueId, scope: QuestionScope.RESCUE_SPECIFIC, is_enabled: true },
        ],
      },
      order: [
        ['category', 'ASC'],
        ['display_order', 'ASC'],
      ],
    });
  }
}

ApplicationQuestion.init(
  {
    question_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: sequelize.literal(`'question_' || left(md5(random()::text), 12)`),
    },
    rescue_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rescues',
        key: 'rescue_id',
      },
      onDelete: 'CASCADE',
    },
    question_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    scope: {
      type: DataTypes.ENUM(...Object.values(QuestionScope)),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(QuestionCategory)),
      allowNull: false,
    },
    question_type: {
      type: DataTypes.ENUM(...Object.values(QuestionType)),
      allowNull: false,
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 1000],
      },
    },
    help_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    placeholder: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    options: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      validate: {
        isValidOptions(value: string[] | null) {
          const question = this as any;
          if (
            question.question_type &&
            ['select', 'multi_select'].includes(question.question_type) &&
            (!value || value.length === 0)
          ) {
            throw new Error('Select questions must have options');
          }
          if (value && value.some((option: string) => !option.trim())) {
            throw new Error('Options cannot be empty');
          }
        },
      },
    },
    validation_rules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 9999,
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
    conditional_logic: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'application_questions',
    modelName: 'ApplicationQuestion',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['rescue_id'],
        name: 'application_questions_rescue_id_idx',
      },
      {
        fields: ['scope'],
        name: 'application_questions_scope_idx',
      },
      {
        fields: ['category'],
        name: 'application_questions_category_idx',
      },
      {
        fields: ['question_type'],
        name: 'application_questions_type_idx',
      },
      {
        fields: ['is_enabled'],
        name: 'application_questions_enabled_idx',
      },
      {
        fields: ['display_order'],
        name: 'application_questions_order_idx',
      },
      {
        fields: ['question_key', 'rescue_id'],
        unique: true,
        name: 'application_questions_key_rescue_unique',
        where: {
          deleted_at: null,
        },
      },
      {
        fields: ['question_key'],
        unique: true,
        name: 'application_questions_core_key_unique',
        where: {
          scope: QuestionScope.CORE,
          deleted_at: null,
        },
      },
    ],
    hooks: {
      beforeValidate: (question: ApplicationQuestion) => {
        // Ensure core questions have no rescue_id
        if (question.scope === QuestionScope.CORE) {
          question.rescue_id = null;
        }

        // Ensure rescue-specific questions have a rescue_id
        if (question.scope === QuestionScope.RESCUE_SPECIFIC && !question.rescue_id) {
          throw new Error('Rescue-specific questions must have a rescue_id');
        }
      },
      beforeSave: (question: ApplicationQuestion) => {
        // Auto-set display_order if not provided
        if (question.display_order === 0 && question.isNewRecord) {
          // This would typically be set by a service layer
          // to ensure proper ordering within category
        }
      },
    },
    scopes: {
      enabled: {
        where: { is_enabled: true },
      },
      core: {
        where: { scope: QuestionScope.CORE },
      },
      rescueSpecific: {
        where: { scope: QuestionScope.RESCUE_SPECIFIC },
      },
      byCategory: (category: QuestionCategory) => ({
        where: { category },
      }),
      byType: (type: QuestionType) => ({
        where: { question_type: type },
      }),
      required: {
        where: { is_required: true },
      },
    },
  }
);

export default ApplicationQuestion;
