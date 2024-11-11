import express from 'express'

import {
  addRoleToUserController,
  removeRoleFromUserController,
} from '../controllers/adminController'
import { authenticateJWT } from '../middleware/authMiddleware'
import { checkUserRole } from '../middleware/roleCheckMiddleware'

const router = express.Router()

router.post(
  '/users/:userId/add-role',
  authenticateJWT,
  checkUserRole('admin'),
  addRoleToUserController,
)
router.delete(
  '/users/:userId/roles/:roleId',
  authenticateJWT,
  checkUserRole('admin'),
  removeRoleFromUserController,
)

export default router
