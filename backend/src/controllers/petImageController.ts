import { Request, Response } from 'express'
import fs from 'fs/promises'
import path from 'path'
import {
  addPetImages,
  fetchPetImages,
  removePetImage,
} from '../services/petImageService'

export const createPetImages = async (req: Request, res: Response) => {
  const { petId } = req.params

  // Check if files are uploaded
  if (!req.files || !Array.isArray(req.files)) {
    return res.status(400).json({ message: 'No images provided' })
  }

  try {
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

    res
      .status(201)
      .json({ message: 'Images uploaded successfully', savedImages })
  } catch (error) {
    console.error('Error while uploading images:', error)
    res.status(500).json({ message: 'Failed to upload images', error })
  }
}

export const getPetImagesByPetId = async (req: Request, res: Response) => {
  const { petId } = req.params

  try {
    const images = await fetchPetImages(petId)
    res.status(200).json(images)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch images', error })
  }
}

export const deletePetImage = async (req: Request, res: Response) => {
  const { petId, imageId } = req.params

  try {
    // Remove the image from the database
    const deleted = await removePetImage(petId, imageId)
    if (!deleted) {
      return res.status(404).json({ message: 'Image not found' })
    }

    // Construct the file path
    const imagePath = path.join(__dirname, '../../uploads', imageId)
    console.log(`Attempting to delete file at path: ${imagePath}`)

    // Check if the file exists before deleting
    try {
      await fs.access(imagePath)
      await fs.unlink(imagePath)
      console.log(`File deleted: ${imagePath}`)
    } catch (err) {
      if (err instanceof Error) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          console.warn(`File not found: ${imagePath}`)
          return res.status(404).json({
            message: 'Image removed from database, but file not found.',
          })
        } else {
          console.error(`Failed to delete file: ${imagePath}. Error:`, err)
          return res.status(500).json({
            message: 'Image removed from database, but failed to delete file.',
            error: err.message,
          })
        }
      } else {
        console.error(`Unexpected error while deleting file:`, err)
        return res.status(500).json({
          message: 'Image removed from database, but failed to delete file.',
          error: 'Unexpected error occurred.',
        })
      }
    }

    res.status(200).json({ message: 'Image deleted successfully' })
  } catch (error) {
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
