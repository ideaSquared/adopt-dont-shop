import { Response } from 'express';
import ApplicationTimelineService from '../services/applicationTimeline.service';
import { TimelineEventType } from '../models/ApplicationTimeline';
import { AuthenticatedRequest } from '../types/auth';

export class ApplicationTimelineController {
  /**
   * Get timeline for an application
   */
  static async getApplicationTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  /**
   * Get timeline statistics for an application
   */
  static async getTimelineStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { application_id } = req.params;

    const stats = await ApplicationTimelineService.getTimelineStats(application_id);

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * Create a manual timeline event (for notes, manual stage changes, etc.)
   */
  static async createManualEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  /**
   * Add a note to the application timeline
   */
  static async addNote(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }

  /**
   * Get bulk timeline statistics for multiple applications
   */
  static async getBulkTimelineStats(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  }
}

export default ApplicationTimelineController;
