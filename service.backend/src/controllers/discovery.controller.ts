import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DiscoveryService } from '../services/discovery.service';
import { SwipeService } from '../services/swipe.service';
import { logger } from '../utils/logger';

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
  getDiscoveryQueue = async (req: Request, res: Response): Promise<Response | void> => {
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

    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.query.userId as string;

    try {
      const discoveryQueue = await this.discoveryService.getDiscoveryQueue(filters, limit, userId);

      res.status(200).json({
        success: true,
        message: 'Discovery queue retrieved successfully',
        data: discoveryQueue,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting discovery queue:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : '',
        filtersProvided: filters,
        userIdProvided: userId,
        limitProvided: limit,
      });

      // Return a more user-friendly error response
      res.status(500).json({
        success: false,
        message:
          'Failed to get discovery queue. This might be due to database connectivity issues.',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Load more pets for infinite scroll
   */
  loadMorePets = async (req: Request, res: Response): Promise<Response | void> => {
    try {
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
    } catch (error) {
      logger.error('Error loading more pets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load more pets',
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Record a swipe action
   */
  recordSwipeAction = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
      }

      const swipeAction = {
        action: req.body.action,
        petId: req.body.petId,
        sessionId: req.body.sessionId,
        timestamp: req.body.timestamp,
        userId: req.body.userId, // Optional
      };

      await this.swipeService.recordSwipeAction(swipeAction);

      res.status(200).json({
        success: true,
        message: 'Swipe action recorded successfully',
        data: null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error recording swipe action:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record swipe action',
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get user's swipe statistics
   */
  getSwipeStats = async (req: Request, res: Response): Promise<Response | void> => {
    try {
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

      const stats = await this.swipeService.getUserSwipeStats(userId);

      res.status(200).json({
        success: true,
        message: 'Swipe statistics retrieved successfully',
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting swipe stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get swipe statistics',
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get session statistics
   */
  getSessionStats = async (req: Request, res: Response): Promise<Response | void> => {
    try {
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
    } catch (error) {
      logger.error('Error getting session stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session statistics',
        timestamp: new Date().toISOString(),
      });
    }
  };
}
