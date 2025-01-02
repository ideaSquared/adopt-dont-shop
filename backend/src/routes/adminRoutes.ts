import express from 'express'

import {
  addRoleToUserController,
  removeRoleFromUserController,
} from '../controllers/adminController'
import * as applicationController from '../controllers/applicationController'
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

router.get(
  'applications',
  authenticateJWT,
  checkUserRole('admin'),
  applicationController.getAllApplications,
)

export default router
