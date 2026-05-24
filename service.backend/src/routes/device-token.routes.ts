import { Router } from 'express';
import { body, param } from 'express-validator';
import { DevicePlatform } from '../models/DeviceToken';
import { authenticateToken } from '../middleware/auth';
import { DeviceTokenController } from '../controllers/device-token.controller';

const router = Router();

router.use(authenticateToken);

const validatePlatform = body('platform')
  .isIn(Object.values(DevicePlatform))
  .withMessage('platform must be one of: ios, android, web');

router.post(
  '/',
  [
    body('token').isString().isLength({ min: 10, max: 500 }).withMessage('token required'),
    validatePlatform,
    body('appVersion').optional().isString().isLength({ max: 50 }),
    body('deviceInfo').optional().isObject(),
  ],
  DeviceTokenController.registerToken
);

router.get('/', DeviceTokenController.listTokens);

router.delete(
  '/:tokenId',
  [param('tokenId').isUUID().withMessage('tokenId must be a UUID')],
  DeviceTokenController.deleteToken
);

export default router;
