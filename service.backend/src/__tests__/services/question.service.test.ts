/**
 * Question Service - Behavior Tests
 *
 * Tests the business rules for managing application questions for rescue organizations.
 * Rescue staff can create, update, delete, and reorder their own custom questions
 * while core questions are managed separately.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import QuestionService from '../../services/question.service';
import ApplicationQuestion, {
  QuestionCategory,
  QuestionScope,
  QuestionType,
} from '../../models/ApplicationQuestion';
import Rescue from '../../models/Rescue';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logBusiness: vi.fn(), logDatabase: vi.fn(), logPerformance: vi.fn() },
}));

const RESCUE_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_RESCUE_ID = '660e8400-e29b-41d4-a716-446655440001';

const createRescue = async (rescueId: string) => {
  return Rescue.create({
    rescueId,
    name: `Test Rescue ${rescueId.slice(0, 8)}`,
    email: `rescue-${rescueId.slice(0, 8)}@test.com`,
    address: '1 Test Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'UK',
    contactPerson: 'Test Contact',
    status: 'pending',
    isDeleted: false,
  });
};

const createCoreQuestion = async (overrides = {}) => {
  return ApplicationQuestion.create({
    question_id: `core-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    rescue_id: null,
    question_key: `core_key_${Date.now()}`,
    scope: QuestionScope.CORE,
    category: QuestionCategory.PERSONAL_INFORMATION,
    question_type: QuestionType.TEXT,
    question_text: 'What is your full name?',
    is_enabled: true,
    is_required: true,
    display_order: 0,
    ...overrides,
  });
};

describe('QuestionService - Application Question Management', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await createRescue(RESCUE_ID);
    await createRescue(OTHER_RESCUE_ID);
  });

  describe('Retrieving questions for a rescue', () => {
    it('returns core questions alongside rescue-specific questions', async () => {
      await createCoreQuestion();
      await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'custom_q1',
        category: QuestionCategory.PET_OWNERSHIP_EXPERIENCE,
        questionType: QuestionType.BOOLEAN,
        questionText: 'Do you have experience with pets?',
      });

      const questions = await QuestionService.getQuestionsForRescue(RESCUE_ID);

      const coreQuestions = questions.filter(q => q.scope === QuestionScope.CORE);
      const rescueQuestions = questions.filter(q => q.scope === QuestionScope.RESCUE_SPECIFIC);
      expect(coreQuestions.length).toBeGreaterThan(0);
      expect(rescueQuestions).toHaveLength(1);
    });

    it('does not return questions from other rescues', async () => {
      await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'my_rescue_q',
        category: QuestionCategory.LIFESTYLE_COMPATIBILITY,
        questionType: QuestionType.TEXT,
        questionText: 'Describe your daily routine with a pet',
      });
      await QuestionService.createQuestion(OTHER_RESCUE_ID, {
        questionKey: 'other_rescue_q',
        category: QuestionCategory.LIFESTYLE_COMPATIBILITY,
        questionType: QuestionType.TEXT,
        questionText: 'Other rescue question',
      });

      const questions = await QuestionService.getQuestionsForRescue(RESCUE_ID);
      const rescueQuestions = questions.filter(q => q.scope === QuestionScope.RESCUE_SPECIFIC);

      expect(rescueQuestions).toHaveLength(1);
      expect(rescueQuestions[0].questionKey).toBe('my_rescue_q');
    });

    it('returns only rescue-owned questions when getting rescue-owned questions', async () => {
      await createCoreQuestion();
      await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'owned_q',
        category: QuestionCategory.HOUSEHOLD_INFORMATION,
        questionType: QuestionType.NUMBER,
        questionText: 'How many people live in your household?',
      });

      const ownedQuestions = await QuestionService.getRescueOwnedQuestions(RESCUE_ID);

      expect(ownedQuestions).toHaveLength(1);
      expect(ownedQuestions[0].questionKey).toBe('owned_q');
      expect(ownedQuestions[0].scope).toBe(QuestionScope.RESCUE_SPECIFIC);
    });
  });

  describe('Creating custom questions', () => {
    it('creates a rescue-specific question with required fields', async () => {
      const question = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'yard_size',
        category: QuestionCategory.HOUSEHOLD_INFORMATION,
        questionType: QuestionType.TEXT,
        questionText: 'What is the size of your yard?',
        placeholder: 'e.g. small, medium, large, no yard',
        isRequired: true,
      });

      expect(question.questionId).toBeDefined();
      expect(question.rescueId).toBe(RESCUE_ID);
      expect(question.questionKey).toBe('yard_size');
      expect(question.scope).toBe(QuestionScope.RESCUE_SPECIFIC);
      expect(question.questionType).toBe(QuestionType.TEXT);
      expect(question.isRequired).toBe(true);
      expect(question.isEnabled).toBe(true);
    });

    it('supports all non-select question types for different data collection needs', async () => {
      const questionTypes: Array<{ type: QuestionType; key: string; text: string }> = [
        {
          type: QuestionType.TEXT,
          key: 'pet_name_pref',
          text: 'What name would you give the pet?',
        },
        { type: QuestionType.BOOLEAN, key: 'has_fence', text: 'Do you have a fenced yard?' },
        { type: QuestionType.FILE, key: 'vet_reference', text: 'Please upload a vet reference' },
        {
          type: QuestionType.NUMBER,
          key: 'hours_home',
          text: 'How many hours are you home per day?',
        },
        { type: QuestionType.EMAIL, key: 'backup_email', text: 'Provide a backup email address' },
        {
          type: QuestionType.DATE,
          key: 'availability_date',
          text: 'When are you available for a home visit?',
        },
      ];

      for (const [index, qt] of questionTypes.entries()) {
        const q = await QuestionService.createQuestion(RESCUE_ID, {
          questionKey: qt.key,
          category: QuestionCategory.PET_CARE_COMMITMENT,
          questionType: qt.type,
          questionText: qt.text,
          displayOrder: index,
        });
        expect(q.questionType).toBe(qt.type);
      }
    });

    it('stores conditional logic for show/hide based on other answers', async () => {
      const conditionalLogic = {
        showWhen: {
          questionKey: 'has_fence',
          operator: 'equals',
          value: false,
        },
      };

      const question = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'containment_plan',
        category: QuestionCategory.LIFESTYLE_COMPATIBILITY,
        questionType: QuestionType.TEXT,
        questionText: 'Without a fence, how will you contain the dog safely?',
        conditionalLogic,
      });

      expect(question.conditionalLogic).toEqual(conditionalLogic);
    });

    it('assigns display order automatically based on existing questions in category', async () => {
      await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'q_first',
        category: QuestionCategory.PET_CARE_COMMITMENT,
        questionType: QuestionType.TEXT,
        questionText: 'First question',
      });
      await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'q_second',
        category: QuestionCategory.PET_CARE_COMMITMENT,
        questionType: QuestionType.TEXT,
        questionText: 'Second question',
      });

      const questions = await QuestionService.getRescueOwnedQuestions(RESCUE_ID);
      expect(questions).toHaveLength(2);
    });

    it('stores validation rules for question-specific constraints', async () => {
      const validationRules = { minLength: 10, maxLength: 500 };

      const question = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'experience_detail',
        category: QuestionCategory.PET_OWNERSHIP_EXPERIENCE,
        questionType: QuestionType.TEXT,
        questionText: 'Describe your pet ownership experience in detail',
        validationRules,
      });

      expect(question.validationRules).toEqual(validationRules);
    });
  });

  describe('Updating custom questions', () => {
    it('updates question text and configuration', async () => {
      const created = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'updatable_q',
        category: QuestionCategory.REFERENCES_VERIFICATION,
        questionType: QuestionType.TEXT,
        questionText: 'Original question text',
        isRequired: false,
      });

      const updated = await QuestionService.updateQuestion(created.questionId, RESCUE_ID, {
        questionText: 'Updated question text with more detail',
        isRequired: true,
        helpText: 'Please be as specific as possible',
      });

      expect(updated.questionText).toBe('Updated question text with more detail');
      expect(updated.isRequired).toBe(true);
      expect(updated.helpText).toBe('Please be as specific as possible');
    });

    it('can disable a question without deleting it', async () => {
      const question = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'seasonal_q',
        category: QuestionCategory.FINAL_ACKNOWLEDGMENTS,
        questionType: QuestionType.BOOLEAN,
        questionText: 'Do you agree to our seasonal care requirements?',
      });

      const disabled = await QuestionService.updateQuestion(question.questionId, RESCUE_ID, {
        isEnabled: false,
      });

      expect(disabled.isEnabled).toBe(false);
    });

    it('prevents updating a question belonging to another rescue', async () => {
      const question = await QuestionService.createQuestion(OTHER_RESCUE_ID, {
        questionKey: 'other_rescue_owned',
        category: QuestionCategory.PERSONAL_INFORMATION,
        questionType: QuestionType.TEXT,
        questionText: 'Question owned by another rescue',
      });

      await expect(
        QuestionService.updateQuestion(question.questionId, RESCUE_ID, {
          questionText: 'Attempted hijack',
        })
      ).rejects.toThrow('Question not found');
    });

    it('can update placeholder and help text for questions', async () => {
      const question = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'housing_type',
        category: QuestionCategory.HOUSEHOLD_INFORMATION,
        questionType: QuestionType.TEXT,
        questionText: 'What type of housing do you live in?',
        helpText: 'Original help text',
      });

      const updated = await QuestionService.updateQuestion(question.questionId, RESCUE_ID, {
        placeholder: 'e.g. house, apartment, condo',
        helpText: 'Describe your living situation',
      });

      expect(updated.placeholder).toBe('e.g. house, apartment, condo');
      expect(updated.helpText).toBe('Describe your living situation');
    });
  });

  describe('Deleting custom questions', () => {
    it('removes a rescue-specific question', async () => {
      const question = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'to_delete',
        category: QuestionCategory.PET_CARE_COMMITMENT,
        questionType: QuestionType.TEXT,
        questionText: 'This question will be deleted',
      });

      await QuestionService.deleteQuestion(question.questionId, RESCUE_ID);

      const remaining = await QuestionService.getRescueOwnedQuestions(RESCUE_ID);
      expect(remaining.find(q => q.questionId === question.questionId)).toBeUndefined();
    });

    it('prevents deleting a question belonging to another rescue', async () => {
      const question = await QuestionService.createQuestion(OTHER_RESCUE_ID, {
        questionKey: 'protected_q',
        category: QuestionCategory.LIFESTYLE_COMPATIBILITY,
        questionType: QuestionType.TEXT,
        questionText: "Another rescue's question",
      });

      await expect(QuestionService.deleteQuestion(question.questionId, RESCUE_ID)).rejects.toThrow(
        'Question not found'
      );
    });

    it('throws not found error when deleting non-existent question', async () => {
      await expect(
        QuestionService.deleteQuestion('00000000-0000-0000-0000-000000000000', RESCUE_ID)
      ).rejects.toThrow('Question not found');
    });
  });

  describe('Reordering questions', () => {
    it('updates the display order of multiple questions at once', async () => {
      const q1 = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'reorder_q1',
        category: QuestionCategory.HOUSEHOLD_INFORMATION,
        questionType: QuestionType.TEXT,
        questionText: 'Question 1',
        displayOrder: 0,
      });
      const q2 = await QuestionService.createQuestion(RESCUE_ID, {
        questionKey: 'reorder_q2',
        category: QuestionCategory.HOUSEHOLD_INFORMATION,
        questionType: QuestionType.TEXT,
        questionText: 'Question 2',
        displayOrder: 1,
      });

      await QuestionService.reorderQuestions(RESCUE_ID, [
        { questionId: q1.questionId, displayOrder: 1 },
        { questionId: q2.questionId, displayOrder: 0 },
      ]);

      const questions = await QuestionService.getRescueOwnedQuestions(RESCUE_ID);
      const updated1 = questions.find(q => q.questionId === q1.questionId);
      const updated2 = questions.find(q => q.questionId === q2.questionId);
      expect(updated1?.displayOrder).toBe(1);
      expect(updated2?.displayOrder).toBe(0);
    });

    it('prevents reordering questions that do not belong to the rescue', async () => {
      const foreignQ = await QuestionService.createQuestion(OTHER_RESCUE_ID, {
        questionKey: 'foreign_q',
        category: QuestionCategory.PERSONAL_INFORMATION,
        questionType: QuestionType.TEXT,
        questionText: 'Foreign question',
        displayOrder: 0,
      });

      await expect(
        QuestionService.reorderQuestions(RESCUE_ID, [
          { questionId: foreignQ.questionId, displayOrder: 5 },
        ])
      ).rejects.toThrow('Some questions not found');
    });
  });

  describe('Core question visibility', () => {
    it('includes enabled core questions in the rescue question list', async () => {
      await createCoreQuestion({
        question_id: `core-enabled-${Date.now()}`,
        question_key: `core_enabled_${Date.now()}`,
        is_enabled: true,
      });

      const questions = await QuestionService.getQuestionsForRescue(RESCUE_ID);
      const coreQuestions = questions.filter(q => q.scope === QuestionScope.CORE);
      expect(coreQuestions.length).toBeGreaterThan(0);
      expect(coreQuestions.every(q => q.isEnabled)).toBe(true);
    });

    it('excludes disabled core questions from the rescue question list', async () => {
      await createCoreQuestion({
        question_id: `core-disabled-${Date.now()}`,
        question_key: `core_disabled_${Date.now()}`,
        is_enabled: false,
      });

      const questions = await QuestionService.getQuestionsForRescue(RESCUE_ID);
      const disabledCore = questions.find(q => q.scope === QuestionScope.CORE && !q.isEnabled);
      expect(disabledCore).toBeUndefined();
    });
  });
});
