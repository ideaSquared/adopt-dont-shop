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
      const imageUrl = `/uploads/${file.filename}`

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

    // Construct the file path to delete
    const imagePath = path.join(__dirname, '../uploads', imageId)

    // Delete the image file from the container
    try {
      await fs.unlink(imagePath)
      console.log(`File deleted: ${imagePath}`)
    } catch (err) {
      console.error(`Failed to delete file: ${imagePath}. Error:`, err)
      return res.status(500).json({
        message: 'Image removed from database, but failed to delete file.',
        error: err,
      })
    }

    res.status(200).json({ message: 'Image deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete image', error })
  }
}
