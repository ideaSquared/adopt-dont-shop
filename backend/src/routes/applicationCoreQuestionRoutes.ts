import express from 'express'
import {
  createCoreQuestion,
  deleteCoreQuestion,
  getAllCoreQuestions,
  getCoreQuestionByKey,
  getCoreQuestionUsage,
  updateCoreQuestion,
} from '../controllers/applicationCoreQuestionController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

// All routes require admin role
const adminMiddleware = authRoleOwnershipMiddleware({
  requiredRole: 'admin',
})

// Get all core questions
router.get('/', adminMiddleware, getAllCoreQuestions)

// Get a specific core question
router.get('/:questionKey', adminMiddleware, getCoreQuestionByKey)

// Create a new core question
router.post('/', adminMiddleware, createCoreQuestion)

// Update a core question
router.put('/:questionKey', adminMiddleware, updateCoreQuestion)

// Delete a core question
router.delete('/:questionKey', adminMiddleware, deleteCoreQuestion)

// Get usage statistics for a core question
router.get('/:questionKey/usage', adminMiddleware, getCoreQuestionUsage)

export default router
