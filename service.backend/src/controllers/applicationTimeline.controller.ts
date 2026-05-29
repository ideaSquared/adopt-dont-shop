import { Response } from 'express';
import ApplicationTimelineService from '../services/applicationTimeline.service';
import ApplicationService from '../services/application.service';
import { TimelineEventType } from '../models/ApplicationTimeline';
import { UserType } from '../models/User';
import { AuthenticatedRequest } from '../types/auth';

const MAX_BULK_TIMELINE_IDS = 100;

/**
 * Resolve the authenticated caller, or return null if no user is attached.
 */
const getCaller = (req: AuthenticatedRequest): { userId: string; userType: UserType } | null => {
  const userId = req.user?.userId;
  const userType = req.user?.userType as UserType | undefined;
  if (!userId || !userType) {
    return null;
  }
  return { userId, userType };
};

export class ApplicationTimelineController {
  /**
   * Get timeline for an application
   */
  static async getApplicationTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { application_id } = req.params;
    const caller = getCaller(req);
    if (!caller) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    await ApplicationService.assertApplicationAccess(
      application_id,
      caller.userId,
      caller.userType
    );

    const { limit, offset, event_types } = req.query;

    const options = {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      event_types: event_types
        ? ((event_types as string).split(',') as TimelineEventType[])
        : undefined,
    };

    const { events, total } = await ApplicationTimelineService.getApplicationTimeline(
      application_id,
      options
    );

    res.json({
      success: true,
      data: events,
      pagination: {
        limit: options.limit ?? events.length,
        offset: options.offset ?? 0,
        total,
      },
    });
  }

  /**
   * Get timeline statistics for an application
   */
  static async getTimelineStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { application_id } = req.params;
    const caller = getCaller(req);
    if (!caller) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    await ApplicationService.assertApplicationAccess(
      application_id,
      caller.userId,
      caller.userType
    );

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

    const caller = getCaller(req);
    if (!caller) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }
    await ApplicationService.assertApplicationAccess(
      application_id,
      caller.userId,
      caller.userType
    );

    const event = await ApplicationTimelineService.createEvent({
      application_id,
      event_type,
      title,
      description,
      metadata,
      created_by: caller.userId,
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

    const caller = getCaller(req);
    if (!caller) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }
    await ApplicationService.assertApplicationAccess(
      application_id,
      caller.userId,
      caller.userType
    );

    const event = await ApplicationTimelineService.createNoteAddedEvent(
      application_id,
      note_type || 'general',
      content,
      caller.userId
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
    const caller = getCaller(req);
    if (!caller) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { applicationIds } = req.body;

    if (!Array.isArray(applicationIds)) {
      res.status(400).json({
        success: false,
        error: 'applicationIds array is required',
      });
      return;
    }

    if (applicationIds.length > MAX_BULK_TIMELINE_IDS) {
      res.status(400).json({
        success: false,
        error: `applicationIds may contain at most ${MAX_BULK_TIMELINE_IDS} entries`,
      });
      return;
    }

    // Only return stats for applications the caller is allowed to see.
    // Each id is checked against the shared access boundary; unauthorized
    // or unknown ids are silently dropped so the endpoint can't be used to
    // probe the existence of other rescues' applications.
    const accessibleIds: string[] = [];
    for (const applicationId of applicationIds) {
      if (typeof applicationId !== 'string') {
        continue;
      }
      try {
        await ApplicationService.assertApplicationAccess(
          applicationId,
          caller.userId,
          caller.userType
        );
        accessibleIds.push(applicationId);
      } catch {
        // Drop ids the caller can't access (not found / forbidden).
      }
    }

    const stats = await ApplicationTimelineService.getBulkTimelineStats(accessibleIds);

    res.json({
      success: true,
      summaries: stats,
    });
  }
}

export default ApplicationTimelineController;
