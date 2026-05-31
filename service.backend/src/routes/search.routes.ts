/**
 * Search Routes
 * API routes for message search functionality
 * Part of Phase 3 - Message Search Implementation
 */

import { Router } from 'express';
import { z } from 'zod';
import { SearchController } from '../controllers/search.controller';
import { authenticateToken } from '../middleware/auth';
import { searchLimiter } from '../middleware/rate-limiter';
import { validateQuery } from '../middleware/zod-validate';
import { LARGE_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination';

const router = Router();

// ADS-784: bound + coerce pagination and enum-validate sort options so bad
// input is a clean 422 rather than a 500 (NaN offset / invalid order clause).
const MessageSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query parameter is required').max(200),
  conversationId: z.string().optional(),
  senderId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  messageType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Clamp (don't reject) an over-cap limit to preserve the endpoint's existing
  // silent-cap behaviour while still bounding the value.
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(LARGE_PAGE_SIZE)
    .transform(value => Math.min(value, MAX_PAGE_SIZE)),
  sortBy: z.enum(['relevance', 'date', 'sender']).default('relevance'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

// Apply authentication to all search routes
router.use(authenticateToken);

// ADS-517: search is computationally expensive — full-text scans plus
// pagination. The general apiLimiter (100/15m) was too permissive;
// `searchLimiter` is 30/15m so abusive scrapers trip earlier without
// also throttling unrelated authenticated traffic from the same IP.
router.use(searchLimiter);

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
router.get('/messages', validateQuery(MessageSearchQuerySchema), SearchController.searchMessages);

/**
 * @route GET /api/v1/search/suggestions
 * @desc Get search suggestions based on query
 * @access Private
 * @param {string} q - Partial search query (required)
 */
router.get('/suggestions', SearchController.getSearchSuggestions);

export default router;
