import express from 'express'
import multer from 'multer'
import path from 'path'
import {
  createPetImages,
  deletePetImage,
  getPetImagesByPetId,
} from '../controllers/petImageController'

const router = express.Router()

// Define storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Replace with your desired upload directory
  },
  filename: function (req, file, cb) {
    // Generate a unique filename using timestamp and random number
    const timestamp = Date.now()
    const random = Math.round(Math.random() * 1e9)
    const uniqueSuffix = `${timestamp}-${random}`

    // Extract the original file extension
    const extension = path.extname(file.originalname).toLowerCase()

    // Combine to create the final filename
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`)
  },
})

// Initialize multer with the storage configuration
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Optional: Add file type validation if needed
    const filetypes = /jpeg|jpg|png/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    )

    if (mimetype && extname) {
      return cb(null, true)
    }
    cb(new Error('Only image files are allowed!'))
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: Limit file size to 5MB
})

// POST: Upload images for a pet
router.post('/:petId/images', upload.array('files'), createPetImages)

// GET: Retrieve all images for a pet
router.get('/:petId/images', getPetImagesByPetId)

// DELETE: Delete a specific pet image by petId and imageId
router.delete('/:petId/images/:imageId', deletePetImage)

export default router
