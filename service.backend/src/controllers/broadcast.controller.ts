import { Response } from 'express';
import { validationResult } from 'express-validator';
import {
  BROADCAST_AUDIENCES,
  BroadcastAudience,
  BroadcastService,
} from '../services/broadcast.service';
import { RichTextProcessingService } from '../services/rich-text-processing.service';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

export class BroadcastController {
  /**
   * POST /api/v1/notifications/broadcast — fan a system-wide message
   * out to a coarse audience cohort. Admin-gated upstream; the
   * controller only validates input and translates service errors to
   * HTTP. Idempotency is handled by the shared Idempotency-Key
   * middleware on the route, so a retry with the same key returns the
   * cached response inside 24h.
   */
  broadcast = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const audience = req.body.audience as BroadcastAudience;
      const title = req.body.title as string;
      const body =
        typeof req.body.body === 'string'
          ? RichTextProcessingService.sanitize(req.body.body)
          : req.body.body;
      const channels = req.body.channels;

      const result = await BroadcastService.broadcast({
        audience,
        title,
        body,
        channels,
        initiatedBy: req.user!.userId,
      });

      res.status(201).json({
        success: true,
        message: `Broadcast queued for ${result.targetCount} user(s)`,
        data: result,
      });
    } catch (error) {
      logger.error('Broadcast failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send broadcast',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * GET /api/v1/notifications/broadcast/preview?audience=... — cheap
   * count of recipients so the admin UI can render a confirm modal
   * before sending.
   */
  previewAudience = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const audience = req.query.audience;
      if (
        typeof audience !== 'string' ||
        !BROADCAST_AUDIENCES.includes(audience as BroadcastAudience)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid audience',
        });
      }

      const count = await BroadcastService.previewAudienceCount(audience as BroadcastAudience);
      res.status(200).json({
        success: true,
        data: { audience, count },
      });
    } catch (error) {
      logger.error('Broadcast preview failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to preview audience',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
