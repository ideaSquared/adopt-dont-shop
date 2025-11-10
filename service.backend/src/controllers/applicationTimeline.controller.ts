import { Request, Response } from 'express';
import ApplicationTimelineService from '../services/applicationTimeline.service';
import { TimelineEventType } from '../models/ApplicationTimeline';
import { logger } from '../utils/logger';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    [key: string]: unknown;
  };
}

export class ApplicationTimelineController {
  /**
   * Get timeline for an application
   */
  static async getApplicationTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { application_id } = req.params;
      const { limit, offset, event_types } = req.query;

      const options = {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        event_types: event_types
          ? ((event_types as string).split(',') as TimelineEventType[])
          : undefined,
      };

      const timeline = await ApplicationTimelineService.getApplicationTimeline(
        application_id,
        options
      );

      res.json({
        success: true,
        data: timeline,
        pagination: {
          limit: options.limit || timeline.length,
          offset: options.offset || 0,
          total: timeline.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching application timeline:', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch application timeline',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get timeline statistics for an application
   */
  static async getTimelineStats(req: Request, res: Response): Promise<void> {
    try {
      const { application_id } = req.params;

      const stats = await ApplicationTimelineService.getTimelineStats(application_id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching timeline stats:', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch timeline statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a manual timeline event (for notes, manual stage changes, etc.)
   */
  static async createManualEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { application_id } = req.params;
      const { event_type, title, description, metadata } = req.body;

      // Get user ID from auth middleware (assuming it's available)
      const created_by = req.user?.userId;

      if (!created_by) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const event = await ApplicationTimelineService.createEvent({
        application_id,
        event_type,
        title,
        description,
        metadata,
        created_by,
        created_by_system: false,
      });

      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      logger.error('Error creating timeline event:', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create timeline event',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Add a note to the application timeline
   */
  static async addNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { application_id } = req.params;
      const { note_type, content } = req.body;

      const created_by = req.user?.userId;
      if (!created_by) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const event = await ApplicationTimelineService.createNoteAddedEvent(
        application_id,
        note_type || 'general',
        content,
        created_by
      );

      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      logger.error('Error adding note to timeline:', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to add note to timeline',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get bulk timeline statistics for multiple applications
   */
  static async getBulkTimelineStats(req: Request, res: Response): Promise<void> {
    try {
      const { applicationIds } = req.body;

      if (!applicationIds || !Array.isArray(applicationIds)) {
        res.status(400).json({
          success: false,
          error: 'applicationIds array is required',
        });
        return;
      }

      const stats = await ApplicationTimelineService.getBulkTimelineStats(applicationIds);

      res.json({
        success: true,
        summaries: stats,
      });
    } catch (error) {
      logger.error('Error fetching bulk timeline stats:', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bulk timeline statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default ApplicationTimelineController;
