import { Request, Response } from 'express';
import { z } from 'zod';
import {
  getInboxItems,
  assignInboxItem,
  InboxFiltersSchema,
  type InboxSource,
} from '../services/inbox.service';
import { AuthenticatedRequest } from '../types/api';
import { logger } from '../utils/logger';

const AssignBodySchema = z.object({
  itemId: z.string(),
  source: z.enum(['moderation', 'support', 'message']),
  assignedTo: z.string().uuid(),
});

export class InboxController {
  static async getItems(req: Request, res: Response) {
    try {
      const filters = InboxFiltersSchema.parse(req.query);
      const result = await getInboxItems(filters);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid filters', details: error.issues });
      }
      logger.error('Failed to fetch inbox items', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async assign(req: AuthenticatedRequest, res: Response) {
    try {
      const body = AssignBodySchema.parse(req.body);
      await assignInboxItem(body.itemId, body.source, body.assignedTo);
      return res.status(200).json({ message: 'Item assigned successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request body', details: error.issues });
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      logger.error('Failed to assign inbox item', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
