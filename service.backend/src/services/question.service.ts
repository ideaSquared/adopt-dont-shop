import ApplicationQuestion, {
  QuestionCategory,
  QuestionScope,
  QuestionType,
} from '../models/ApplicationQuestion';
import { generateCryptoUuid as uuidv4 } from '../utils/uuid-helpers';
import { logger } from '../utils/logger';
import { JsonObject } from '../types/common';

export type CreateQuestionData = {
  questionKey: string;
  category: QuestionCategory;
  questionType: QuestionType;
  questionText: string;
  helpText?: string | null;
  placeholder?: string | null;
  options?: string[] | null;
  validationRules?: JsonObject | null;
  displayOrder?: number;
  isRequired?: boolean;
  conditionalLogic?: JsonObject | null;
};

export type UpdateQuestionData = Partial<CreateQuestionData> & {
  isEnabled?: boolean;
};

export type QuestionData = {
  questionId: string;
  rescueId: string | null;
  questionKey: string;
  scope: QuestionScope;
  category: QuestionCategory;
  questionType: QuestionType;
  questionText: string;
  helpText: string | null;
  placeholder: string | null;
  options: string[] | null;
  validationRules: JsonObject | null;
  displayOrder: number;
  isEnabled: boolean;
  isRequired: boolean;
  conditionalLogic: JsonObject | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReorderEntry = {
  questionId: string;
  displayOrder: number;
};

const mapToQuestionData = (q: ApplicationQuestion): QuestionData => ({
  questionId: q.question_id,
  rescueId: q.rescue_id,
  questionKey: q.question_key,
  scope: q.scope,
  category: q.category,
  questionType: q.question_type,
  questionText: q.question_text,
  helpText: q.help_text,
  placeholder: q.placeholder,
  options: q.options,
  validationRules: q.validation_rules,
  displayOrder: q.display_order,
  isEnabled: q.is_enabled,
  isRequired: q.is_required,
  conditionalLogic: q.conditional_logic,
  createdAt: q.created_at,
  updatedAt: q.updated_at,
});

export class QuestionService {
  static async getQuestionsForRescue(rescueId: string): Promise<QuestionData[]> {
    try {
      const questions = await ApplicationQuestion.getAllQuestionsForRescue(rescueId);
      return questions.map(mapToQuestionData);
    } catch (error) {
      logger.error('Failed to get questions for rescue:', { rescueId, error });
      throw new Error('Failed to retrieve questions');
    }
  }

  static async getRescueOwnedQuestions(rescueId: string): Promise<QuestionData[]> {
    try {
      const questions = await ApplicationQuestion.getRescueQuestions(rescueId);
      return questions.map(mapToQuestionData);
    } catch (error) {
      logger.error('Failed to get rescue-owned questions:', { rescueId, error });
      throw new Error('Failed to retrieve rescue questions');
    }
  }

  static async getCoreQuestions(): Promise<QuestionData[]> {
    try {
      const questions = await ApplicationQuestion.getCoreQuestions();
      return questions.map(mapToQuestionData);
    } catch (error) {
      logger.error('Failed to get core questions:', { error });
      throw new Error('Failed to retrieve core questions');
    }
  }

  static async createQuestion(rescueId: string, data: CreateQuestionData): Promise<QuestionData> {
    try {
      const existingCount = await ApplicationQuestion.count({
        where: {
          rescue_id: rescueId,
          category: data.category,
          scope: QuestionScope.RESCUE_SPECIFIC,
        },
      });

      const displayOrder = data.displayOrder ?? existingCount;

      const question = await ApplicationQuestion.create({
        question_id: uuidv4(),
        rescue_id: rescueId,
        question_key: data.questionKey,
        scope: QuestionScope.RESCUE_SPECIFIC,
        category: data.category,
        question_type: data.questionType,
        question_text: data.questionText,
        help_text: data.helpText ?? null,
        placeholder: data.placeholder ?? null,
        options: data.options ?? null,
        validation_rules: data.validationRules ?? null,
        display_order: displayOrder,
        is_enabled: true,
        is_required: data.isRequired ?? false,
        conditional_logic: data.conditionalLogic ?? null,
      });

      logger.info('Question created', { questionId: question.question_id, rescueId });
      return mapToQuestionData(question);
    } catch (error) {
      logger.error('Failed to create question:', { rescueId, error });
      throw error;
    }
  }

  static async updateQuestion(
    questionId: string,
    rescueId: string,
    data: UpdateQuestionData
  ): Promise<QuestionData> {
    try {
      const question = await ApplicationQuestion.findOne({
        where: { question_id: questionId, rescue_id: rescueId },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      const updates: Partial<ApplicationQuestion> = {};
      if (data.questionText !== undefined) {
        updates.question_text = data.questionText;
      }
      if (data.helpText !== undefined) {
        updates.help_text = data.helpText ?? null;
      }
      if (data.placeholder !== undefined) {
        updates.placeholder = data.placeholder ?? null;
      }
      if (data.options !== undefined) {
        updates.options = data.options ?? null;
      }
      if (data.validationRules !== undefined) {
        updates.validation_rules = data.validationRules ?? null;
      }
      if (data.displayOrder !== undefined) {
        updates.display_order = data.displayOrder;
      }
      if (data.isEnabled !== undefined) {
        updates.is_enabled = data.isEnabled;
      }
      if (data.isRequired !== undefined) {
        updates.is_required = data.isRequired;
      }
      if (data.conditionalLogic !== undefined) {
        updates.conditional_logic = data.conditionalLogic ?? null;
      }
      if (data.category !== undefined) {
        updates.category = data.category;
      }
      if (data.questionType !== undefined) {
        updates.question_type = data.questionType;
      }

      await question.update(updates);
      await question.reload();

      logger.info('Question updated', { questionId, rescueId });
      return mapToQuestionData(question);
    } catch (error) {
      logger.error('Failed to update question:', { questionId, rescueId, error });
      throw error;
    }
  }

  static async deleteQuestion(questionId: string, rescueId: string): Promise<void> {
    try {
      const question = await ApplicationQuestion.findOne({
        where: { question_id: questionId, rescue_id: rescueId },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      await question.destroy();
      logger.info('Question deleted', { questionId, rescueId });
    } catch (error) {
      logger.error('Failed to delete question:', { questionId, rescueId, error });
      throw error;
    }
  }

  static async reorderQuestions(rescueId: string, reorderEntries: ReorderEntry[]): Promise<void> {
    try {
      const questionIds = reorderEntries.map(e => e.questionId);
      const questions = await ApplicationQuestion.findAll({
        where: {
          question_id: questionIds,
          rescue_id: rescueId,
        },
      });

      if (questions.length !== reorderEntries.length) {
        throw new Error('Some questions not found or do not belong to this rescue');
      }

      await Promise.all(
        reorderEntries.map(entry => {
          const question = questions.find(q => q.question_id === entry.questionId);
          return question?.update({ display_order: entry.displayOrder });
        })
      );

      logger.info('Questions reordered', { rescueId, count: reorderEntries.length });
    } catch (error) {
      logger.error('Failed to reorder questions:', { rescueId, error });
      throw error;
    }
  }
}

export default QuestionService;
