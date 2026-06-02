import { Response } from 'express';
import { body, param } from 'express-validator';
import { sendValidationErrors } from '../middleware/validation';
import { QuestionCategory, QuestionType } from '../models/ApplicationQuestion';
import { AuthenticatedRequest } from '../types/api';
import QuestionService from '../services/question.service';

export class QuestionController {
  static validateRescueId = [param('rescueId').isUUID().withMessage('Invalid rescue ID format')];

  static validateQuestionId = [
    param('questionId').isUUID().withMessage('Invalid question ID format'),
  ];

  static validateCreateQuestion = [
    body('questionKey')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Question key must be 1-100 characters')
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Question key must contain only lowercase letters, numbers, and underscores'),
    body('category').isIn(Object.values(QuestionCategory)).withMessage('Invalid category'),
    body('questionType').isIn(Object.values(QuestionType)).withMessage('Invalid question type'),
    body('questionText')
      .trim()
      .isLength({ min: 5, max: 1000 })
      .withMessage('Question text must be 5-1000 characters'),
    body('helpText')
      .optional({ nullable: true })
      .isLength({ max: 500 })
      .withMessage('Help text must be max 500 characters'),
    body('placeholder')
      .optional({ nullable: true })
      .isLength({ max: 255 })
      .withMessage('Placeholder must be max 255 characters'),
    body('options').optional({ nullable: true }).isArray().withMessage('Options must be an array'),
    body('options.*')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Each option must be a non-empty string'),
    body('isRequired').optional().isBoolean().withMessage('isRequired must be a boolean'),
    body('displayOrder')
      .optional()
      .isInt({ min: 0, max: 9999 })
      .withMessage('Display order must be 0-9999'),
    body('conditionalLogic')
      .optional({ nullable: true })
      .isObject()
      .withMessage('Conditional logic must be an object'),
    body('validationRules')
      .optional({ nullable: true })
      .isObject()
      .withMessage('Validation rules must be an object'),
  ];

  static validateUpdateQuestion = [
    body('questionText')
      .optional()
      .trim()
      .isLength({ min: 5, max: 1000 })
      .withMessage('Question text must be 5-1000 characters'),
    body('helpText')
      .optional({ nullable: true })
      .isLength({ max: 500 })
      .withMessage('Help text must be max 500 characters'),
    body('placeholder')
      .optional({ nullable: true })
      .isLength({ max: 255 })
      .withMessage('Placeholder must be max 255 characters'),
    body('options').optional({ nullable: true }).isArray().withMessage('Options must be an array'),
    body('isRequired').optional().isBoolean().withMessage('isRequired must be a boolean'),
    body('isEnabled').optional().isBoolean().withMessage('isEnabled must be a boolean'),
    body('displayOrder')
      .optional()
      .isInt({ min: 0, max: 9999 })
      .withMessage('Display order must be 0-9999'),
    body('conditionalLogic')
      .optional({ nullable: true })
      .isObject()
      .withMessage('Conditional logic must be an object'),
    body('validationRules')
      .optional({ nullable: true })
      .isObject()
      .withMessage('Validation rules must be an object'),
    body('category')
      .optional()
      .isIn(Object.values(QuestionCategory))
      .withMessage('Invalid category'),
    body('questionType')
      .optional()
      .isIn(Object.values(QuestionType))
      .withMessage('Invalid question type'),
  ];

  static validateReorderQuestions = [
    body('questions').isArray({ min: 1 }).withMessage('Questions must be a non-empty array'),
    body('questions.*.questionId').isUUID().withMessage('Each question must have a valid UUID'),
    body('questions.*.displayOrder')
      .isInt({ min: 0, max: 9999 })
      .withMessage('Display order must be 0-9999'),
  ];

  // ADS-784: delegate to the shared helper so this controller emits the same
  // canonical 422 `details` envelope as every other validated endpoint.
  private static sendValidationError(res: Response, req: AuthenticatedRequest): boolean {
    return sendValidationErrors(req, res);
  }

  async getQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (QuestionController.sendValidationError(res, req)) {
      return;
    }

    const { rescueId } = req.params;

    const questions = await QuestionService.getQuestionsForRescue(rescueId);
    res.status(200).json({ success: true, questions });
  }

  async createQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (QuestionController.sendValidationError(res, req)) {
      return;
    }

    const { rescueId } = req.params;

    const question = await QuestionService.createQuestion(rescueId, req.body);
    res.status(201).json({ success: true, question });
  }

  async updateQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (QuestionController.sendValidationError(res, req)) {
      return;
    }

    const { rescueId, questionId } = req.params;

    const question = await QuestionService.updateQuestion(questionId, rescueId, req.body);
    res.status(200).json({ success: true, question });
  }

  async deleteQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (QuestionController.sendValidationError(res, req)) {
      return;
    }

    const { rescueId, questionId } = req.params;

    await QuestionService.deleteQuestion(questionId, rescueId);
    res.status(200).json({ success: true, message: 'Question deleted successfully' });
  }

  async reorderQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (QuestionController.sendValidationError(res, req)) {
      return;
    }

    const { rescueId } = req.params;

    await QuestionService.reorderQuestions(rescueId, req.body.questions);
    res.status(200).json({ success: true, message: 'Questions reordered successfully' });
  }
}

export default QuestionController;
