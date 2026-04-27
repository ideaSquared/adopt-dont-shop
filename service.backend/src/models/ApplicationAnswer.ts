import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getJsonType, getUuidType } from '../sequelize';
import { JsonValue } from '../types/common';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';

// Plan 2.1 — Application.answers JSONB extracted to a typed table.
// One row per (application, question_key). The legacy JSONB shape
// stored every adopter response on the application row, which made
// per-question analytics and cross-application reporting impossible
// without scanning every JSONB blob. With a dedicated table the hot
// paths (gallery-style "all answers for this application", analytics
// like "how many adopters have a yard") are simple SQL keyed on
// indexes.
//
// `question_key` is the same identifier ApplicationQuestion uses, so
// downstream analytics can join on the key. There's no DB-level FK
// because ApplicationQuestion is rescue-scoped (and some legacy answer
// keys may not have a configured question), but the application code
// keeps the contract: one answer per question per application.

interface ApplicationAnswerAttributes {
  answer_id: string;
  application_id: string;
  question_key: string;
  answer_value: JsonValue;
  answered_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface ApplicationAnswerCreationAttributes
  extends Optional<
    ApplicationAnswerAttributes,
    'answer_id' | 'answered_at' | 'created_at' | 'updated_at'
  > {}

export class ApplicationAnswer
  extends Model<ApplicationAnswerAttributes, ApplicationAnswerCreationAttributes>
  implements ApplicationAnswerAttributes
{
  public answer_id!: string;
  public application_id!: string;
  public question_key!: string;
  public answer_value!: JsonValue;
  public answered_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ApplicationAnswer.init(
  {
    answer_id: {
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
    question_key: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    answer_value: {
      type: getJsonType(),
      allowNull: false,
    },
    answered_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'ApplicationAnswer',
    tableName: 'application_answers',
    timestamps: true,
    underscored: true,
    indexes: [
      // One answer per question per application. Replaces the implicit
      // single-key invariant of the JSONB shape.
      {
        fields: ['application_id', 'question_key'],
        name: 'application_answers_app_question_unique',
        unique: true,
      },
      // Gallery-style "all answers for this application" reads.
      {
        fields: ['application_id'],
        name: 'application_answers_app_idx',
      },
      // Analytics — "how many adopters have a yard" — scan by
      // question_key without touching the parent row.
      {
        fields: ['question_key'],
        name: 'application_answers_question_key_idx',
      },
      ...auditIndexes('application_answers'),
    ],
  })
);

export default ApplicationAnswer;
