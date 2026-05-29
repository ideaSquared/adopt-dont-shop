import { fn, col, type Transaction, type WhereAttributeHash } from 'sequelize';
import ApplicationTimeline, { TimelineEventType } from '../models/ApplicationTimeline';
import User from '../models/User';
import { ApplicationStage } from '../models/Application';

/** Default page size when a caller omits `limit`. */
const DEFAULT_TIMELINE_LIMIT = 50;
/** Hard upper bound on how many timeline rows a single query may return. */
const MAX_TIMELINE_LIMIT = 200;

const clampLimit = (limit?: number): number => {
  if (limit === undefined || Number.isNaN(limit) || limit < 1) {
    return DEFAULT_TIMELINE_LIMIT;
  }
  return Math.min(limit, MAX_TIMELINE_LIMIT);
};

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
  /**
   * When provided, the event row (and the actor lookup) join the caller's
   * transaction so the timeline write commits/rolls back atomically with
   * the surrounding status change.
   */
  transaction?: Transaction;
}

export class ApplicationTimelineService {
  /**
   * Create a new timeline event
   */
  static async createEvent(data: CreateTimelineEventData): Promise<ApplicationTimeline> {
    // Snapshot the actor's email so the timeline stays readable if
    // the user is later deleted (plan 4.5). The lookup is best-effort
    // — if the user can't be resolved (e.g. test fixtures with mocked
    // user IDs that don't exist in the DB), the snapshot stays null
    // and the timeline degrades gracefully on display.
    const { transaction, ...eventData } = data;

    let created_by_email_snapshot: string | null = null;
    if (eventData.created_by) {
      try {
        const actor = await User.findByPk(eventData.created_by, {
          attributes: ['email'],
          transaction,
        });
        created_by_email_snapshot = actor?.email ?? null;
      } catch {
        // Soft-fail — the snapshot is a display hint, not a guarantee.
      }
    }

    return ApplicationTimeline.create(
      {
        timeline_id: undefined, // Will be auto-generated
        ...eventData,
        created_by_email_snapshot,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );
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
  ): Promise<{ events: ApplicationTimeline[]; total: number }> {
    const whereClause: WhereAttributeHash = { application_id };

    if (options?.event_types && options.event_types.length > 0) {
      whereClause.event_type = options.event_types;
    }

    // Enforce a default + hard-capped limit so an unbounded query can't be
    // triggered by omitting `limit` (or passing an absurdly large value).
    const limit = clampLimit(options?.limit);
    const offset = options?.offset && options.offset > 0 ? options.offset : 0;

    const { rows, count } = await ApplicationTimeline.findAndCountAll({
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
      limit,
      offset,
    });

    return { events: rows, total: count };
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
    const description = reason || `Application ${decision}`;

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
      [ApplicationStage.VISITING]: 'Home visit scheduled',
      [ApplicationStage.DECIDING]: 'Application moved to final decision',
      [ApplicationStage.RESOLVED]: 'Application completed',
      [ApplicationStage.WITHDRAWN]: 'Application withdrawn',
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
    // Aggregate in SQL rather than loading every row into memory. Three
    // cheap grouped/aggregate queries replace a full table scan + JS reduce.
    const [byTypeRows, byStaffRows, boundsRows] = await Promise.all([
      ApplicationTimeline.findAll({
        attributes: ['event_type', [fn('COUNT', col('event_type')), 'count']],
        where: { application_id },
        group: ['event_type'],
        raw: true,
      }) as unknown as Promise<Array<{ event_type: TimelineEventType; count: number | string }>>,
      ApplicationTimeline.findAll({
        attributes: ['created_by', [fn('COUNT', col('created_by')), 'count']],
        where: { application_id },
        group: ['created_by'],
        raw: true,
      }) as unknown as Promise<Array<{ created_by: string | null; count: number | string }>>,
      ApplicationTimeline.findAll({
        attributes: [
          [fn('MIN', col('created_at')), 'first_event'],
          [fn('MAX', col('created_at')), 'last_event'],
          [fn('COUNT', col('timeline_id')), 'total_events'],
        ],
        where: { application_id },
        raw: true,
      }) as unknown as Promise<
        Array<{
          first_event: Date | string | null;
          last_event: Date | string | null;
          total_events: number | string;
        }>
      >,
    ]);

    const events_by_type = {} as Record<TimelineEventType, number>;
    for (const row of byTypeRows) {
      events_by_type[row.event_type] = Number(row.count);
    }

    const staff_activity: Record<string, number> = {};
    for (const row of byStaffRows) {
      if (row.created_by) {
        staff_activity[row.created_by] = Number(row.count);
      }
    }

    const bounds = boundsRows[0];
    const toDate = (value: Date | string | null | undefined): Date | null => {
      if (!value) {
        return null;
      }
      return value instanceof Date ? value : new Date(value);
    };

    return {
      total_events: Number(bounds?.total_events ?? 0),
      events_by_type,
      first_event: toDate(bounds?.first_event),
      last_event: toDate(bounds?.last_event),
      staff_activity,
    };
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
