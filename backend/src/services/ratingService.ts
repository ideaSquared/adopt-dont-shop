import Rating from '../Models/Rating'
import { AuditLogger } from './auditLogService'

export const createRatingService = async (data: any) => {
  await AuditLogger.logAction(
    'RatingService',
    `Creating a new rating with data: ${JSON.stringify(data)}`,
    'INFO',
  )
  try {
    const rating = await Rating.create(data)
    await AuditLogger.logAction(
      'RatingService',
      `Successfully created a new rating with ID: ${rating.rating_id}`,
      'INFO',
    )
    return rating
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RatingService',
        `Error creating a new rating - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to create rating: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RatingService',
      'Unknown error while creating a new rating',
      'ERROR',
    )
    throw new Error('An unknown error occurred while creating the rating')
  }
}

export const getAllRatingsService = async () => {
  await AuditLogger.logAction('RatingService', 'Fetching all ratings', 'INFO')
  try {
    const ratings = await Rating.findAll()
    await AuditLogger.logAction(
      'RatingService',
      'Successfully fetched all ratings',
      'INFO',
    )
    return ratings
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RatingService',
        `Error fetching all ratings - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch ratings: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RatingService',
      'Unknown error while fetching all ratings',
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching ratings')
  }
}

export const getRatingByIdService = async (ratingId: string) => {
  await AuditLogger.logAction(
    'RatingService',
    `Fetching rating by ID: ${ratingId}`,
    'INFO',
  )
  try {
    const rating = await Rating.findByPk(ratingId)
    if (!rating) {
      await AuditLogger.logAction(
        'RatingService',
        `Rating with ID: ${ratingId} not found`,
        'WARNING',
      )
      return null
    }
    await AuditLogger.logAction(
      'RatingService',
      `Successfully fetched rating with ID: ${ratingId}`,
      'INFO',
    )
    return rating
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RatingService',
        `Error fetching rating by ID: ${ratingId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch rating: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RatingService',
      `Unknown error while fetching rating by ID: ${ratingId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching the rating')
  }
}

export const getRatingsByUserIdService = async (userId: string) => {
  await AuditLogger.logAction(
    'RatingService',
    `Fetching ratings for user ID: ${userId}`,
    'INFO',
  )
  try {
    const ratings = await Rating.findAll({ where: { user_id: userId } })
    await AuditLogger.logAction(
      'RatingService',
      `Successfully fetched ratings for user ID: ${userId}`,
      'INFO',
    )
    return ratings
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RatingService',
        `Error fetching ratings for user ID: ${userId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch ratings: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RatingService',
      `Unknown error while fetching ratings for user ID: ${userId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching ratings')
  }
}

export const getRatingsByPetIdService = async (petId: string) => {
  await AuditLogger.logAction(
    'RatingService',
    `Fetching ratings for pet ID: ${petId}`,
    'INFO',
  )
  try {
    const ratings = await Rating.findAll({ where: { pet_id: petId } })
    await AuditLogger.logAction(
      'RatingService',
      `Successfully fetched ratings for pet ID: ${petId}`,
      'INFO',
    )
    return ratings
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RatingService',
        `Error fetching ratings for pet ID: ${petId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch ratings: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RatingService',
      `Unknown error while fetching ratings for pet ID: ${petId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching ratings')
  }
}

export const updateRatingService = async (ratingId: string, data: any) => {
  await AuditLogger.logAction(
    'RatingService',
    `Updating rating with ID: ${ratingId}`,
    'INFO',
  )
  try {
    const rating = await Rating.findByPk(ratingId)
    if (!rating) {
      await AuditLogger.logAction(
        'RatingService',
        `Rating with ID: ${ratingId} not found for update`,
        'WARNING',
      )
      return null
    }
    await rating.update(data)
    await AuditLogger.logAction(
      'RatingService',
      `Successfully updated rating with ID: ${ratingId}`,
      'INFO',
    )
    return rating
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RatingService',
        `Error updating rating with ID: ${ratingId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to update rating: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RatingService',
      `Unknown error while updating rating with ID: ${ratingId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while updating the rating')
  }
}

export const deleteRatingService = async (ratingId: string) => {
  await AuditLogger.logAction(
    'RatingService',
    `Deleting rating with ID: ${ratingId}`,
    'INFO',
  )
  try {
    const rating = await Rating.findByPk(ratingId)
    if (!rating) {
      await AuditLogger.logAction(
        'RatingService',
        `Rating with ID: ${ratingId} not found for deletion`,
        'WARNING',
      )
      return false
    }
    await rating.destroy()
    await AuditLogger.logAction(
      'RatingService',
      `Successfully deleted rating with ID: ${ratingId}`,
      'INFO',
    )
    return true
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RatingService',
        `Error deleting rating with ID: ${ratingId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to delete rating: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RatingService',
      `Unknown error while deleting rating with ID: ${ratingId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while deleting the rating')
  }
}
