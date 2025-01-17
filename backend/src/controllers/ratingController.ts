import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import {
  createRatingService,
  deleteRatingService,
  getAllRatingsService,
  getRatingByIdService,
  getRatingsByPetIdService,
  getRatingsByUserIdService,
  updateRatingService,
} from '../services/ratingService'
import { AuthenticatedRequest } from '../types'

export const createRatingController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'RatingController',
      'Attempting to create new rating',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    const rating = await createRatingService(req.body)

    AuditLogger.logAction(
      'RatingController',
      `Successfully created rating: ${rating.rating_id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    res.status(201).json(rating)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RatingController',
      `Failed to create rating: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error creating rating', error })
  }
}

export const getAllRatingsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    AuditLogger.logAction(
      'RatingController',
      'Attempting to fetch all ratings',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    const ratings = await getAllRatingsService()

    AuditLogger.logAction(
      'RatingController',
      `Successfully fetched ${ratings.length} ratings`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    res.status(200).json(ratings)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RatingController',
      `Failed to fetch ratings: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error retrieving ratings', error })
  }
}

export const getRatingByIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { id } = req.params

  try {
    AuditLogger.logAction(
      'RatingController',
      `Attempting to fetch rating: ${id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    const rating = await getRatingByIdService(id)

    if (rating) {
      AuditLogger.logAction(
        'RatingController',
        `Successfully fetched rating: ${id}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
      )
      res.status(200).json(rating)
    } else {
      AuditLogger.logAction(
        'RatingController',
        `Rating not found: ${id}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Rating not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RatingController',
      `Failed to fetch rating ${id}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error retrieving rating', error })
  }
}

export const getRatingsByUserIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { userId } = req.params

  try {
    AuditLogger.logAction(
      'RatingController',
      `Attempting to fetch ratings for user: ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    const ratings = await getRatingsByUserIdService(userId)

    AuditLogger.logAction(
      'RatingController',
      `Successfully fetched ${ratings.length} ratings for user: ${userId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    res.status(200).json(ratings)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RatingController',
      `Failed to fetch ratings for user ${userId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )
    res
      .status(500)
      .json({ message: 'Error retrieving ratings by user ID', error })
  }
}

export const getRatingsByPetIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { petId } = req.params

  try {
    AuditLogger.logAction(
      'RatingController',
      `Attempting to fetch ratings for pet: ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    const ratings = await getRatingsByPetIdService(petId)

    AuditLogger.logAction(
      'RatingController',
      `Successfully fetched ${ratings.length} ratings for pet: ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    res.status(200).json(ratings)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RatingController',
      `Failed to fetch ratings for pet ${petId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )
    res
      .status(500)
      .json({ message: 'Error retrieving ratings by pet ID', error })
  }
}

export const updateRatingController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { id } = req.params

  try {
    AuditLogger.logAction(
      'RatingController',
      `Attempting to update rating: ${id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    const updatedRating = await updateRatingService(id, req.body)

    if (updatedRating) {
      AuditLogger.logAction(
        'RatingController',
        `Successfully updated rating: ${id}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
      )
      res.status(200).json(updatedRating)
    } else {
      AuditLogger.logAction(
        'RatingController',
        `Rating not found for update: ${id}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Rating not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RatingController',
      `Failed to update rating ${id}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error updating rating', error })
  }
}

export const deleteRatingController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { id } = req.params

  try {
    AuditLogger.logAction(
      'RatingController',
      `Attempting to delete rating: ${id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )

    const deleted = await deleteRatingService(id)

    if (deleted) {
      AuditLogger.logAction(
        'RatingController',
        `Successfully deleted rating: ${id}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
      )
      res.status(204).end()
    } else {
      AuditLogger.logAction(
        'RatingController',
        `Rating not found for deletion: ${id}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
      )
      res.status(404).json({ message: 'Rating not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'RatingController',
      `Failed to delete rating ${id}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'RATING_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Error deleting rating', error })
  }
}
