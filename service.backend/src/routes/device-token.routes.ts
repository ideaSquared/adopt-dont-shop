import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import DeviceToken, { DevicePlatform, TokenStatus } from '../models/DeviceToken';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

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
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const { token, platform, appVersion, deviceInfo } = req.body;

      const [device] = await DeviceToken.findOrCreate({
        where: { user_id: req.user.userId, device_token: token },
        defaults: {
          user_id: req.user.userId,
          device_token: token,
          platform,
          app_version: appVersion ?? null,
          device_info: deviceInfo ?? {},
          status: TokenStatus.ACTIVE,
        },
      });

      device.markAsUsed();
      device.platform = platform;
      if (appVersion !== undefined) {
        device.app_version = appVersion;
      }
      if (deviceInfo !== undefined) {
        device.device_info = deviceInfo;
      }
      await device.save();

      return res.status(201).json({ data: { tokenId: device.token_id } });
    } catch (error) {
      logger.error('Failed to register device token', { error });
      return res.status(500).json({ error: 'Failed to register device token' });
    }
  }
);

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const tokens = await DeviceToken.findAll({
      where: { user_id: req.user.userId },
      order: [['last_used_at', 'DESC']],
    });
    return res.json({
      data: tokens.map(t => ({
        tokenId: t.token_id,
        platform: t.platform,
        appVersion: t.app_version,
        status: t.status,
        lastUsedAt: t.last_used_at,
        expiresAt: t.expires_at,
        createdAt: t.created_at,
      })),
    });
  } catch (error) {
    logger.error('Failed to list device tokens', { error });
    return res.status(500).json({ error: 'Failed to list device tokens' });
  }
});

router.delete(
  '/:tokenId',
  [param('tokenId').isUUID().withMessage('tokenId must be a UUID')],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const device = await DeviceToken.findOne({
        where: { token_id: req.params.tokenId, user_id: req.user.userId },
      });
      if (!device) {
        return res.status(404).json({ error: 'Device token not found' });
      }
      await device.destroy();
      return res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete device token', { error });
      return res.status(500).json({ error: 'Failed to delete device token' });
    }
  }
);

export default router;
