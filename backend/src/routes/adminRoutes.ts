import express from 'express'

import {
  addRoleToUserController,
  removeRoleFromUserController,
} from '../controllers/adminController'
import * as applicationController from '../controllers/applicationController'
import * as chatController from '../controllers/chatController'
import { getAllPets } from '../controllers/petController'
import { getAllRescuesController } from '../controllers/rescueController'
import { authRoleOwnershipMiddleware } from '../middleware/authRoleOwnershipMiddleware'

const router = express.Router()

router.post(
  '/users/:userId/add-role',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  addRoleToUserController,
)
router.delete(
  '/users/:userId/roles/:roleId',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  removeRoleFromUserController,
)

router.get(
  '/applications',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  applicationController.getAllApplications,
)

router.get(
  '/rescues',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAllRescuesController,
)

router.get(
  '/pets',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  getAllPets,
)

router.get(
  '/conversations',
  authRoleOwnershipMiddleware({ requiredRole: 'admin' }),
  chatController.getAllConversationsAdmin,
)

export default router
