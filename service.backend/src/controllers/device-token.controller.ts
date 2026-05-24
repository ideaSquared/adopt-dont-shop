import { Response } from 'express';
import { validationResult } from 'express-validator';
import DeviceToken, { TokenStatus } from '../models/DeviceToken';
import { ApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

export class DeviceTokenController {
  static async registerToken(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { token, platform, appVersion, deviceInfo } = req.body;

      const [device] = await DeviceToken.findOrCreate({
        where: { user_id: req.user!.userId, device_token: token },
        defaults: {
          user_id: req.user!.userId,
          device_token: token,
          platform,
          app_version: appVersion ?? null,
          device_info: deviceInfo ?? {},
          status: TokenStatus.ACTIVE,
        },
      });

      device.markAsUsed();
      await device.save();

      return res.status(201).json({ data: { tokenId: device.token_id } });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Failed to register device token', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async listTokens(req: AuthenticatedRequest, res: Response) {
    try {
      const tokens = await DeviceToken.findAll({
        where: { user_id: req.user!.userId },
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
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Failed to list device tokens', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteToken(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const device = await DeviceToken.findOne({
        where: { token_id: req.params.tokenId, user_id: req.user!.userId },
      });
      if (!device) {
        return res.status(404).json({ error: 'Device token not found' });
      }
      await device.destroy();
      return res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Failed to delete device token', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
