/**
 * Search Controller
 * Handles search-related API endpoints
 * Part of Phase 3 - Message Search Implementation
 */

import { Request, Response } from 'express';
import { MessageSearchService } from '../services/messageSearch.service';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    userType: string;
  };
}

export class SearchController {
  /**
   * Search messages
   */
  static async searchMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const {
        q: query,
        conversationId,
        senderId,
        startDate,
        endDate,
        messageType,
        page = 1,
        limit = 50,
        sortBy = 'relevance',
        sortOrder = 'DESC',
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Query parameter is required',
        });
      }

      const searchOptions = {
        query,
        userId,
        conversationId: conversationId as string,
        senderId: senderId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        messageType: messageType as string,
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100), // Max 100 results per page
        sortBy: sortBy as 'relevance' | 'date' | 'sender',
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      const results = await MessageSearchService.searchMessages(searchOptions);

      res.json({
        success: true,
        ...results,
      });
    } catch (error) {
      logger.error('Message search failed:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.userId,
        query: req.query.q,
      });

      res.status(500).json({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { q: query } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Query parameter is required',
        });
      }

      const suggestions = await MessageSearchService.getSearchSuggestions(query, userId);

      res.json({
        success: true,
        suggestions,
      });
    } catch (error) {
      logger.error('Failed to get search suggestions:', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.userId,
        query: req.query.q,
      });

      res.status(500).json({
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
