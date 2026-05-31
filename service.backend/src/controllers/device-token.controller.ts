import { Response } from 'express';
import { sendValidationErrors } from '../middleware/validation';
import DeviceToken, { TokenStatus } from '../models/DeviceToken';
import { AuthenticatedRequest } from '../types/auth';

export class DeviceTokenController {
  static async registerToken(req: AuthenticatedRequest, res: Response) {
    if (sendValidationErrors(req, res)) {
      return;
    }

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
  }

  static async listTokens(req: AuthenticatedRequest, res: Response) {
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
  }

  static async deleteToken(req: AuthenticatedRequest, res: Response) {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const device = await DeviceToken.findOne({
      where: { token_id: req.params.tokenId, user_id: req.user!.userId },
    });
    if (!device) {
      return res.status(404).json({ error: 'Device token not found' });
    }
    await device.destroy();
    return res.status(204).send();
  }
}
