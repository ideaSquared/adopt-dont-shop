import { Request, Response } from 'express'
import {
  addPetImages,
  fetchPetImages,
  removePetImage,
} from '../services/petImageService'

export const createPetImages = async (req: Request, res: Response) => {
  const { petId } = req.params

  if (!req.files || !(req.files instanceof Array)) {
    return res.status(400).json({ message: 'No images provided' })
  }

  try {
    const images = req.files.map((file) => ({
      image_url: `/uploads/${file.filename}`,
    }))

    const savedImages = await addPetImages(petId, images)
    res
      .status(201)
      .json({ message: 'Images uploaded successfully', savedImages })
  } catch (error) {
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
    const deleted = await removePetImage(petId, imageId)
    if (!deleted) {
      return res.status(404).json({ message: 'Image not found' })
    }
    res.status(200).json({ message: 'Image deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete image', error })
  }
}
