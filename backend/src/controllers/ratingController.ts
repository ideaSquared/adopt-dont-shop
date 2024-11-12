import { Response } from 'express'
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
    const rating = await createRatingService(req.body)
    res.status(201).json(rating)
  } catch (error) {
    res.status(500).json({ message: 'Error creating rating', error })
  }
}

export const getAllRatingsController = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const ratings = await getAllRatingsService()
    res.status(200).json(ratings)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving ratings', error })
  }
}

export const getRatingByIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params
    const rating = await getRatingByIdService(id)
    if (rating) {
      res.status(200).json(rating)
    } else {
      res.status(404).json({ message: 'Rating not found' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving rating', error })
  }
}

export const getRatingsByUserIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { userId } = req.params
    const ratings = await getRatingsByUserIdService(userId)
    res.status(200).json(ratings)
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error retrieving ratings by user ID', error })
  }
}

export const getRatingsByPetIdController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { petId } = req.params
    const ratings = await getRatingsByPetIdService(petId)
    res.status(200).json(ratings)
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error retrieving ratings by pet ID', error })
  }
}

export const updateRatingController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params
    const updatedRating = await updateRatingService(id, req.body)
    if (updatedRating) {
      res.status(200).json(updatedRating)
    } else {
      res.status(404).json({ message: 'Rating not found' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating rating', error })
  }
}

export const deleteRatingController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params
    const deleted = await deleteRatingService(id)
    if (deleted) {
      res.status(204).end()
    } else {
      res.status(404).json({ message: 'Rating not found' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting rating', error })
  }
}
