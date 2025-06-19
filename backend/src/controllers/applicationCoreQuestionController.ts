import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import * as CoreApplicationQuestionService from '../services/applicationCoreQuestionService'
import { AuthenticatedRequest } from '../types'

export const getAllCoreQuestions = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      'Attempting to fetch all core questions',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const questions = await CoreApplicationQuestionService.getAllCoreQuestions()

    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Successfully fetched ${questions.length} core questions`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(questions)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Failed to fetch core questions: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching core questions', error })
  }
}

export const getCoreQuestionByKey = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { questionKey } = req.params

  try {
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Attempting to fetch core question: ${questionKey}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const question =
      await CoreApplicationQuestionService.getCoreQuestionByKey(questionKey)

    if (question) {
      AuditLogger.logAction(
        'CoreApplicationQuestionController',
        `Successfully fetched core question: ${questionKey}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json(question)
    } else {
      AuditLogger.logAction(
        'CoreApplicationQuestionController',
        `Core question not found: ${questionKey}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Core question not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Failed to fetch core question ${questionKey}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching core question', error })
  }
}

export const createCoreQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      'Attempting to create new core question',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const question = await CoreApplicationQuestionService.createCoreQuestion(
      req.body,
    )

    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Successfully created core question with key: ${question.question_key}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(201).json(question)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Failed to create core question: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error creating core question', error })
  }
}

export const updateCoreQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { questionKey } = req.params

  try {
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Attempting to update core question: ${questionKey}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const question = await CoreApplicationQuestionService.updateCoreQuestion(
      questionKey,
      req.body,
    )

    if (question) {
      AuditLogger.logAction(
        'CoreApplicationQuestionController',
        `Successfully updated core question: ${questionKey}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json(question)
    } else {
      AuditLogger.logAction(
        'CoreApplicationQuestionController',
        `Core question not found: ${questionKey}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Core question not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Failed to update core question ${questionKey}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error updating core question', error })
  }
}

export const deleteCoreQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { questionKey } = req.params

  try {
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Attempting to delete core question: ${questionKey}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const deleted =
      await CoreApplicationQuestionService.deleteCoreQuestion(questionKey)

    if (deleted) {
      AuditLogger.logAction(
        'CoreApplicationQuestionController',
        `Successfully deleted core question: ${questionKey}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(200).json({ message: 'Core question deleted successfully' })
    } else {
      AuditLogger.logAction(
        'CoreApplicationQuestionController',
        `Core question not found: ${questionKey}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Core question not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Failed to delete core question ${questionKey}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    if (errorMessage.includes('in use by rescues')) {
      res.status(400).json({
        message: 'Cannot delete question that is in use by rescues',
        error,
      })
    } else {
      res.status(500).json({ message: 'Error deleting core question', error })
    }
  }
}

export const getCoreQuestionUsage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { questionKey } = req.params

  try {
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Attempting to fetch usage stats for core question: ${questionKey}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    const usage =
      await CoreApplicationQuestionService.getCoreQuestionUsage(questionKey)

    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Successfully fetched usage stats for core question: ${questionKey}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )

    res.status(200).json(usage)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'CoreApplicationQuestionController',
      `Failed to fetch usage stats for core question ${questionKey}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'APPLICATION_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error fetching question usage', error })
  }
}
