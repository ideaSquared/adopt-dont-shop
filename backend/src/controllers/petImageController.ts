import { Response } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { AuditLogger } from '../services/auditLogService'
import {
  addPetImages,
  fetchPetImages,
  removePetImage,
} from '../services/petImageService'
import { AuthenticatedRequest } from '../types'

export const createPetImages = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { petId } = req.params

  // Check if files are uploaded
  if (!req.files || !Array.isArray(req.files)) {
    AuditLogger.logAction(
      'PetImageController',
      `Failed to upload images for pet ${petId}: No images provided`,
      'WARNING',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )
    return res.status(400).json({ message: 'No images provided' })
  }

  try {
    AuditLogger.logAction(
      'PetImageController',
      `Attempting to upload ${req.files.length} images for pet ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )

    // Map uploaded files to their respective URLs or paths
    const images = req.files.map((file: Express.Multer.File) => {
      // Assuming you serve uploaded files statically from '/uploads'
      const imageUrl = `${file.filename}`

      return {
        image_url: imageUrl,
      }
    })

    // Save image URLs to the database
    const savedImages = await addPetImages(petId, images)

    AuditLogger.logAction(
      'PetImageController',
      `Successfully uploaded ${savedImages.length} images for pet ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )

    res
      .status(201)
      .json({ message: 'Images uploaded successfully', savedImages })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetImageController',
      `Failed to upload images for pet ${petId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to upload images', error })
  }
}

export const getPetImagesByPetId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { petId } = req.params

  try {
    AuditLogger.logAction(
      'PetImageController',
      `Attempting to fetch images for pet ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )

    const images = await fetchPetImages(petId)

    AuditLogger.logAction(
      'PetImageController',
      `Successfully fetched ${images.length} images for pet ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )

    res.status(200).json(images)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetImageController',
      `Failed to fetch images for pet ${petId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )
    res.status(500).json({ message: 'Failed to fetch images', error })
  }
}

export const deletePetImage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { petId, imageId } = req.params

  try {
    AuditLogger.logAction(
      'PetImageController',
      `Attempting to delete image ${imageId} for pet ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )

    // Remove the image from the database
    const deleted = await removePetImage(petId, imageId)
    if (!deleted) {
      AuditLogger.logAction(
        'PetImageController',
        `Image not found: ${imageId} for pet ${petId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
      )
      return res.status(404).json({ message: 'Image not found' })
    }

    // Construct the file path
    const imagePath = path.join(__dirname, '../../uploads', imageId)

    // Check if the file exists before deleting
    try {
      await fs.access(imagePath)
      await fs.unlink(imagePath)

      AuditLogger.logAction(
        'PetImageController',
        `Successfully deleted image ${imageId} for pet ${petId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
      )

      res.status(200).json({ message: 'Image deleted successfully' })
    } catch (err) {
      if (err instanceof Error) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          AuditLogger.logAction(
            'PetImageController',
            `Image file not found at ${imagePath} for pet ${petId}`,
            'WARNING',
            req.user?.user_id || null,
            AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
          )
          return res.status(404).json({
            message: 'Image removed from database, but file not found.',
          })
        } else {
          AuditLogger.logAction(
            'PetImageController',
            `Failed to delete image file ${imageId} for pet ${petId}: ${err.message}`,
            'ERROR',
            req.user?.user_id || null,
            AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
          )
          return res.status(500).json({
            message: 'Image removed from database, but failed to delete file.',
            error: err.message,
          })
        }
      } else {
        AuditLogger.logAction(
          'PetImageController',
          `Unexpected error while deleting image file ${imageId} for pet ${petId}`,
          'ERROR',
          req.user?.user_id || null,
          AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
        )
        return res.status(500).json({
          message: 'Image removed from database, but failed to delete file.',
          error: 'Unexpected error occurred.',
        })
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetImageController',
      `Failed to delete image ${imageId} for pet ${petId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_IMAGE_MANAGEMENT'),
    )
    if (error instanceof Error) {
      res
        .status(500)
        .json({ message: 'Failed to delete image', error: error.message })
    } else {
      res.status(500).json({
        message: 'Failed to delete image',
        error: 'Unexpected error occurred.',
      })
    }
  }
}
