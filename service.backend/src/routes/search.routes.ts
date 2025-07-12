/**
 * Search Routes
 * API routes for message search functionality
 * Part of Phase 3 - Message Search Implementation
 */

import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter } from '../middleware/rate-limiter';

const router = Router();

// Apply authentication to all search routes
router.use(authenticateToken);

// Apply rate limiting (use existing API limiter)
router.use(apiLimiter);

/**
 * @route GET /api/v1/search/messages
 * @desc Search messages with full-text search
 * @access Private
 * @param {string} q - Search query (required)
 * @param {string} conversationId - Filter by conversation ID (optional)
 * @param {string} senderId - Filter by sender ID (optional)
 * @param {string} startDate - Filter messages after this date (optional)
 * @param {string} endDate - Filter messages before this date (optional)
 * @param {string} messageType - Filter by message type (optional)
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Results per page (default: 50, max: 100)
 * @param {string} sortBy - Sort by 'relevance', 'date', or 'sender' (default: 'relevance')
 * @param {string} sortOrder - 'ASC' or 'DESC' (default: 'DESC')
 */
router.get('/messages', SearchController.searchMessages);

/**
 * @route GET /api/v1/search/suggestions
 * @desc Get search suggestions based on query
 * @access Private
 * @param {string} q - Partial search query (required)
 */
router.get('/suggestions', SearchController.getSearchSuggestions);

export default router;
