import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

export class AnalyticsController {
  /**
   * Record a pageview
   */
  async recordPageview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { path, url, timestamp, sessionId, referrer, userAgent } = req.body;
      const userId = req.user?.userId;

      // Use either path or url, prefer path
      const pagePath = path || url || req.url || 'unknown';

      // For now, just log the pageview data
      // In the future, this could be stored in a database or sent to an analytics service
      logger.info('Pageview recorded', {
        service: 'analytics',
        type: 'pageview',
        data: {
          path: pagePath,
          timestamp: timestamp || new Date().toISOString(),
          userId,
          sessionId,
          referrer,
          userAgent,
          ip: req.ip,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Pageview recorded',
      });
    } catch (error) {
      logger.error('Failed to record pageview', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to record pageview',
      });
    }
  }

  /**
   * Record multiple analytics events in a batch
   */
  async recordEventsBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { events } = req.body;
      const userId = req.user?.userId;

      if (!Array.isArray(events)) {
        res.status(400).json({
          success: false,
          message: 'Events must be an array',
        });
        return;
      }

      // For now, just log the events
      // In the future, this could be stored in a database or sent to an analytics service
      logger.info('Batch events recorded', {
        service: 'analytics',
        type: 'batch_events',
        count: events.length,
        userId,
        ip: req.ip,
        events: events.map(event => ({
          event: event.event || event.name || event.type || 'unknown',
          timestamp: event.timestamp || new Date().toISOString(),
          properties: event.properties || {},
        })),
      });

      res.status(201).json({
        success: true,
        message: 'Events recorded',
        processed: events.length,
      });
    } catch (error) {
      logger.error('Failed to record batch events', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to record events',
      });
    }
  }

  /**
   * Record a single analytics event
   */
  async recordEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { event, name, type, timestamp, properties, sessionId } = req.body;
      const userId = req.user?.userId;

      // Use event, name, or type - prefer event
      const eventName = event || name || type || 'unknown';

      // For now, just log the event data
      // In the future, this could be stored in a database or sent to an analytics service
      logger.info('Analytics event recorded', {
        service: 'analytics',
        type: 'single_event',
        data: {
          event: eventName,
          timestamp: timestamp || new Date().toISOString(),
          properties: properties || {},
          userId,
          sessionId,
          ip: req.ip,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Event recorded',
      });
    } catch (error) {
      logger.error('Failed to record event', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to record event',
      });
    }
  }

  /**
   * Validation middleware for pageview data
   */
  static validatePageview = [
    body('path').optional().isString().withMessage('Path must be a string'),
    body('url').optional().isString().withMessage('URL must be a string'),
    body('timestamp').optional().isISO8601().withMessage('Valid timestamp required'),
    body('sessionId').optional().isString(),
    body('referrer').optional().isString(),
    body('userAgent').optional().isString(),
  ];

  /**
   * Validation middleware for events batch
   */
  static validateEventsBatch = [
    body('events').isArray({ min: 1 }).withMessage('Events array is required'),
    body('events.*.event').optional().isString().withMessage('Event name must be a string'),
    body('events.*.name').optional().isString().withMessage('Event name must be a string'),
    body('events.*.type').optional().isString().withMessage('Event type must be a string'),
    body('events.*.timestamp').optional().isISO8601().withMessage('Valid timestamp required'),
    body('events.*.properties').optional().isObject(),
    body('events.*.sessionId').optional().isString(),
  ];

  /**
   * Validation middleware for single event
   */
  static validateEvent = [
    body('event').optional().isString().withMessage('Event name must be a string'),
    body('name').optional().isString().withMessage('Event name must be a string'),
    body('type').optional().isString().withMessage('Event type must be a string'),
    body('timestamp').optional().isISO8601().withMessage('Valid timestamp required'),
    body('properties').optional().isObject(),
    body('sessionId').optional().isString(),
  ];
}
