/**
 * Search Controller
 * Handles search-related API endpoints
 * Part of Phase 3 - Message Search Implementation
 */

import { Response } from 'express';
import { MessageSearchService } from '../services/messageSearch.service';
import { AuthenticatedRequest } from '../types/auth';

export class SearchController {
  /**
   * Search messages
   */
  static async searchMessages(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.userId;
    // Query is validated + coerced by validateQuery(MessageSearchQuerySchema):
    // `q` is a non-empty string, `page`/`limit` are bounded numbers,
    // `startDate`/`endDate` are Dates, and the sort options are valid enums.
    const {
      q: query,
      conversationId,
      senderId,
      startDate,
      endDate,
      messageType,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const searchOptions = {
      query: query as string,
      userId,
      conversationId: conversationId as string,
      senderId: senderId as string,
      startDate: startDate as Date | undefined,
      endDate: endDate as Date | undefined,
      messageType: messageType as string,
      page: Number(page),
      limit: Number(limit),
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
