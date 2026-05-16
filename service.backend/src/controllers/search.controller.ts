/**
 * Search Controller
 * Handles search-related API endpoints
 * Part of Phase 3 - Message Search Implementation
 */

import { Response } from 'express';
import { LARGE_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination';
import { MessageSearchService } from '../services/messageSearch.service';
import { AuthenticatedRequest } from '../types/auth';

export class SearchController {
  /**
   * Search messages
   */
  static async searchMessages(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    const {
      q: query,
      conversationId,
      senderId,
      startDate,
      endDate,
      messageType,
      page = 1,
      limit = LARGE_PAGE_SIZE,
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
      limit: Math.min(parseInt(limit as string, 10), MAX_PAGE_SIZE),
      sortBy: sortBy as 'relevance' | 'date' | 'sender',
      sortOrder: sortOrder as 'ASC' | 'DESC',
    };

    const results = await MessageSearchService.searchMessages(searchOptions);

    res.json({
      success: true,
      ...results,
    });
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(req: AuthenticatedRequest, res: Response) {
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
  }
}
