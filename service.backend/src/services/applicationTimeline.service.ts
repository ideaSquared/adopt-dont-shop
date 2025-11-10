import ApplicationTimeline, { TimelineEventType } from '../models/ApplicationTimeline';
import User from '../models/User';
import { ApplicationStage } from '../models/Application';

export interface CreateTimelineEventData {
  application_id: string;
  event_type: TimelineEventType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
  created_by_system?: boolean;
  previous_stage?: string;
  new_stage?: string;
  previous_status?: string;
  new_status?: string;
}

export class ApplicationTimelineService {
  /**
   * Create a new timeline event
   */
  static async createEvent(data: CreateTimelineEventData): Promise<ApplicationTimeline> {
    return ApplicationTimeline.create({
      timeline_id: undefined, // Will be auto-generated
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get timeline events for an application
   */
  static async getApplicationTimeline(
    application_id: string,
    options?: {
      limit?: number;
      offset?: number;
      event_types?: TimelineEventType[];
    }
  ): Promise<ApplicationTimeline[]> {
    const whereClause: Record<string, unknown> = { application_id };

    if (options?.event_types && options.event_types.length > 0) {
      whereClause.event_type = options.event_types;
    }

    return ApplicationTimeline.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'CreatedBy',
          attributes: ['userId', 'firstName', 'lastName', 'email'],
          required: false, // LEFT JOIN to include system events without users
        },
      ],
      order: [['created_at', 'DESC']],
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  /**
   * Create stage change event
   */
  static async createStageChangeEvent(
    application_id: string,
    previous_stage: ApplicationStage | null,
    new_stage: ApplicationStage,
    created_by?: string,
    metadata?: Record<string, unknown>
  ): Promise<ApplicationTimeline> {
    const title = `Stage changed from ${previous_stage || 'None'} to ${new_stage}`;
    const description = this.getStageChangeDescription(previous_stage, new_stage);

    return this.createEvent({
      application_id,
      event_type: TimelineEventType.STAGE_CHANGE,
      title,
      description,
      metadata: {
        ...metadata,
        automated: !created_by,
      },
      created_by,
      created_by_system: !created_by,
      previous_stage: previous_stage || undefined,
      new_stage,
    });
  }

  /**
   * Create home visit scheduled event
   */
  static async createHomeVisitScheduledEvent(
    application_id: string,
    visit_date: Date,
    staff_member_id: string,
    metadata?: Record<string, unknown>
  ): Promise<ApplicationTimeline> {
    return this.createEvent({
      application_id,
      event_type: TimelineEventType.HOME_VISIT_SCHEDULED,
      title: 'Home visit scheduled',
      description: `Home visit scheduled for ${visit_date.toLocaleDateString()}`,
      metadata: {
        visit_date: visit_date.toISOString(),
        staff_member_id,
        ...metadata,
      },
      created_by: staff_member_id,
    });
  }

  /**
   * Create home visit completed event
   */
  static async createHomeVisitCompletedEvent(
    application_id: string,
    outcome: 'positive' | 'negative',
    staff_member_id: string,
    notes?: string,
    metadata?: Record<string, unknown>
  ): Promise<ApplicationTimeline> {
    const title = `Home visit completed - ${outcome}`;
    const description = notes || `Home visit completed with ${outcome} outcome`;

    return this.createEvent({
      application_id,
      event_type: TimelineEventType.HOME_VISIT_COMPLETED,
      title,
      description,
      metadata: {
        outcome,
        notes,
        ...metadata,
      },
      created_by: staff_member_id,
    });
  }

  /**
   * Create reference contacted event
   */
  static async createReferenceContactedEvent(
    application_id: string,
    reference_name: string,
    contact_method: string,
    staff_member_id: string,
    metadata?: Record<string, unknown>
  ): Promise<ApplicationTimeline> {
    return this.createEvent({
      application_id,
      event_type: TimelineEventType.REFERENCE_CONTACTED,
      title: `Reference contacted: ${reference_name}`,
      description: `Contacted ${reference_name} via ${contact_method}`,
      metadata: {
        reference_name,
        contact_method,
        ...metadata,
      },
      created_by: staff_member_id,
    });
  }

  /**
   * Create decision made event
   */
  static async createDecisionMadeEvent(
    application_id: string,
    decision: 'approved' | 'conditional' | 'rejected',
    staff_member_id: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<ApplicationTimeline> {
    const title = `Application ${decision}`;
    const description = reason || `Application has been ${decision}`;

    return this.createEvent({
      application_id,
      event_type: TimelineEventType.DECISION_MADE,
      title,
      description,
      metadata: {
        decision,
        reason,
        ...metadata,
      },
      created_by: staff_member_id,
    });
  }

  /**
   * Create note added event
   */
  static async createNoteAddedEvent(
    application_id: string,
    note_type: 'general' | 'interview' | 'home_visit' | 'reference',
    note_content: string,
    staff_member_id: string,
    metadata?: Record<string, unknown>
  ): Promise<ApplicationTimeline> {
    const title = `${note_type.charAt(0).toUpperCase() + note_type.slice(1)} note added`;

    return this.createEvent({
      application_id,
      event_type: TimelineEventType.NOTE_ADDED,
      title,
      description:
        note_content.length > 100 ? `${note_content.substring(0, 100)}...` : note_content,
      metadata: {
        note_type,
        full_content: note_content,
        ...metadata,
      },
      created_by: staff_member_id,
    });
  }

  /**
   * Create automatic progression event
   */
  static async createAutoProgressionEvent(
    application_id: string,
    trigger: string,
    previous_stage: ApplicationStage,
    new_stage: ApplicationStage,
    metadata?: Record<string, unknown>
  ): Promise<ApplicationTimeline> {
    return this.createEvent({
      application_id,
      event_type: TimelineEventType.SYSTEM_AUTO_PROGRESSION,
      title: 'Automatic stage progression',
      description: `System automatically moved application from ${previous_stage} to ${new_stage} due to: ${trigger}`,
      metadata: {
        trigger,
        automated: true,
        ...metadata,
      },
      created_by_system: true,
      previous_stage,
      new_stage,
    });
  }

  /**
   * Get stage change description
   */
  private static getStageChangeDescription(
    previous_stage: ApplicationStage | null,
    new_stage: ApplicationStage
  ): string {
    const descriptions: Record<ApplicationStage, string> = {
      [ApplicationStage.PENDING]: 'Application is now pending initial review',
      [ApplicationStage.REVIEWING]: 'Application is under active review',
      [ApplicationStage.VISITING]: 'Home visit has been scheduled',
      [ApplicationStage.DECIDING]: 'Application is in final decision phase',
      [ApplicationStage.RESOLVED]: 'Application has been completed',
      [ApplicationStage.WITHDRAWN]: 'Application has been withdrawn',
    };

    return descriptions[new_stage] || `Application moved to ${new_stage} stage`;
  }

  /**
   * Get timeline statistics
   */
  static async getTimelineStats(application_id: string): Promise<{
    total_events: number;
    events_by_type: Record<TimelineEventType, number>;
    first_event: Date | null;
    last_event: Date | null;
    staff_activity: Record<string, number>;
  }> {
    const events = await ApplicationTimeline.findAll({
      where: { application_id },
      order: [['created_at', 'ASC']],
    });

    const stats = {
      total_events: events.length,
      events_by_type: {} as Record<TimelineEventType, number>,
      first_event: events.length > 0 ? events[0].created_at || null : null,
      last_event: events.length > 0 ? events[events.length - 1].created_at || null : null,
      staff_activity: {} as Record<string, number>,
    };

    // Count events by type
    events.forEach(event => {
      stats.events_by_type[event.event_type] = (stats.events_by_type[event.event_type] || 0) + 1;

      // Count staff activity
      if (event.created_by) {
        stats.staff_activity[event.created_by] = (stats.staff_activity[event.created_by] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Get bulk timeline statistics for multiple applications
   */
  static async getBulkTimelineStats(applicationIds: string[]): Promise<
    Record<
      string,
      {
        totalEvents: number;
        lastActivity: Date | null;
        eventTypeCounts: Record<string, number>;
      }
    >
  > {
    if (applicationIds.length === 0) {
      return {};
    }

    const events = await ApplicationTimeline.findAll({
      where: {
        application_id: applicationIds,
      },
      order: [['created_at', 'DESC']],
    });

    const stats: Record<
      string,
      {
        totalEvents: number;
        lastActivity: Date | null;
        eventTypeCounts: Record<string, number>;
      }
    > = {};

    // Initialize stats for all applications
    applicationIds.forEach(appId => {
      stats[appId] = {
        totalEvents: 0,
        lastActivity: null,
        eventTypeCounts: {},
      };
    });

    // Process events
    events.forEach(event => {
      const appId = event.application_id;

      if (stats[appId]) {
        stats[appId].totalEvents += 1;

        // Update last activity if this event is more recent
        const eventDate = event.created_at;
        if (eventDate && (!stats[appId].lastActivity || eventDate > stats[appId].lastActivity)) {
          stats[appId].lastActivity = eventDate;
        }

        // Count events by type
        const eventType = event.event_type;
        stats[appId].eventTypeCounts[eventType] =
          (stats[appId].eventTypeCounts[eventType] || 0) + 1;
      }
    });

    return stats;
  }
}

export default ApplicationTimelineService;
