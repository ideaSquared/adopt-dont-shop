import express from 'express'
import multer from 'multer'
import {
  createPetImages,
  deletePetImage,
  getPetImagesByPetId,
} from '../controllers/petImageController'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

// POST: Upload images for a pet
router.post('/:petId/images', upload.array('files'), createPetImages)

// GET: Retrieve all images for a pet
router.get('/:petId/images', getPetImagesByPetId)

// DELETE: Delete a specific pet image by ID
router.delete('/images/:imageId', deletePetImage)

export default router
