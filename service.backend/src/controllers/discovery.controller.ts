import { Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination';
import { DiscoveryService, DiscoveryFilters } from '../services/discovery.service';
import { SwipeService } from '../services/swipe.service';
import { logger } from '../utils/logger';
import { parsePaginationLimit } from '../utils/pagination';
import { AuthenticatedRequest } from '../types/auth';
import { UserType } from '../models/User';

export class DiscoveryController {
  private discoveryService: DiscoveryService;
  private swipeService: SwipeService;

  constructor() {
    this.discoveryService = new DiscoveryService();
    this.swipeService = new SwipeService();
  }

  // Validation rules
  static validateDiscoveryQuery = [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('userId').optional().isUUID().withMessage('Invalid user ID format'),
    query('type').optional().isIn(['dog', 'cat']).withMessage('Type must be dog or cat'),
    query('ageGroup')
      .optional()
      .isIn(['puppy', 'young', 'adult', 'senior'])
      .withMessage('Invalid age group'),
    query('size')
      .optional()
      .isIn(['small', 'medium', 'large', 'extra_large'])
      .withMessage('Invalid size'),
    query('gender').optional().isIn(['male', 'female']).withMessage('Invalid gender'),
    query('breed').optional().isString().withMessage('Breed must be a string'),
    query('maxDistance')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Max distance must be positive'),
  ];

  static validateLoadMorePets = [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('lastPetId').notEmpty().withMessage('Last pet ID is required'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20'),
  ];

  static validateAddToQueue = [
    body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
  ];

  static validateSwipeAction = [
    body('action').isIn(['like', 'pass', 'super_like', 'info']).withMessage('Invalid action'),
    body('petId').notEmpty().withMessage('Pet ID is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('timestamp').isISO8601().withMessage('Invalid timestamp format'),
  ];

  static validateUserId = [param('userId').isUUID().withMessage('Invalid user ID format')];

  static validateSessionId = [param('sessionId').notEmpty().withMessage('Session ID is required')];

  /**
   * Get discovery queue of pets based on filters and user preferences
   */
  getDiscoveryQueue = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response | void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }

    const filters = {
      type: req.query.type as string,
      breed: req.query.breed as string,
      ageGroup: req.query.ageGroup as string,
      size: req.query.size as string,
      gender: req.query.gender as string,
      maxDistance: req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined,
    };

    const limit = parsePaginationLimit(req.query.limit as string | undefined, {
      default: DEFAULT_PAGE_SIZE,
      max: MAX_PAGE_SIZE,
    });
    // Always bind to the authenticated user — never trust a client-supplied
    // userId. Allowing `?userId=` to override would let an attacker probe a
    // victim's personalised re-ranking as a preference oracle.
    const userId = req.user?.userId;

    const discoveryQueue = await this.discoveryService.getDiscoveryQueue(filters, limit, userId);

    res.status(200).json({
      success: true,
      message: 'Discovery queue retrieved successfully',
      data: discoveryQueue,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Load more pets for infinite scroll
   */
  loadMorePets = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }

    const { sessionId, lastPetId, limit = 10 } = req.body;

    const pets = await this.discoveryService.loadMorePets(sessionId, lastPetId, limit);

    res.status(200).json({
      success: true,
      message: 'More pets loaded successfully',
      data: { pets },
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Record a swipe action
   */
  recordSwipeAction = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response | void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }

    // SECURITY: derive userId exclusively from the authenticated session. A
    // body-supplied userId would let an unauthenticated caller attribute
    // swipes to any victim, polluting their like/pass history and
    // recommendation signals. Anonymous swipes record userId=null.
    const swipeAction = {
      action: req.body.action,
      petId: req.body.petId,
      sessionId: req.body.sessionId,
      timestamp: req.body.timestamp,
      userId: req.user?.userId ?? null,
    };

    await this.swipeService.recordSwipeAction(swipeAction);

    res.status(200).json({
      success: true,
      message: 'Swipe action recorded successfully',
      data: null,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Get user's swipe statistics
   */
  getSwipeStats = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }

    const { userId } = req.params;

    // ADS: prevent IDOR — only the owner (or an admin) may read swipe stats,
    // which expose identifiable preference data.
    const callerId = req.user?.userId;
    const callerType = req.user?.userType;
    const isAdmin = callerType === UserType.ADMIN || callerType === UserType.SUPER_ADMIN;
    if (callerId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        timestamp: new Date().toISOString(),
      });
    }

    const stats = await this.swipeService.getUserSwipeStats(userId);

    res.status(200).json({
      success: true,
      message: 'Swipe statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Get session statistics
   */
  getSessionStats = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }

    const { sessionId } = req.params;

    const stats = await this.swipeService.getSessionStats(sessionId);

    res.status(200).json({
      success: true,
      message: 'Session statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Get discovery queue via POST (filters passed in request body)
   */
  addToQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { filters = {}, limit = 20 } = req.body as {
      filters?: DiscoveryFilters;
      limit?: number;
    };

    // Always bind to the authenticated user — never trust a client-supplied
    // userId. Allowing the body to override would let an attacker probe a
    // victim's personalised re-ranking as a preference oracle.
    const userId = req.user?.userId;

    logger.info('Discovery queue request received', {
      service: 'discovery',
      type: 'queue_request',
      data: { filters, limit, userId },
      ip: req.ip,
    });

    const discoveryQueue = await this.discoveryService.getDiscoveryQueue(filters, limit, userId);

    res.status(200).json({
      pets: discoveryQueue.pets,
      currentIndex: 0,
      hasMore: discoveryQueue.hasMore,
      nextBatchSize: limit,
    });
  };
}
