import { apiService } from './libraryServices';
import type {
  ApplicationListItem,
  ApplicationFilter,
  ApplicationSort,
  ReferenceCheck,
  HomeVisit,
  ApplicationTimeline,
  ApplicationStats,
  BulkAction,
  RawApplication,
  RawReferencesBlob,
  RawTimelineItem,
} from '../types/applications';
import type { ApplicationStage } from '../types/applicationStages';
import type { ApplicationPriority } from '@adopt-dont-shop/lib.applications';

/**
 * Envelope returned by the list endpoint when the backend wraps results.
 * The transformer tolerates `applications`, `data`, or a bare array.
 */
type RawApplicationsListResponse = {
  applications?: RawApplication[];
  data?: RawApplication[];
  total?: number;
  count?: number;
  page?: number;
  currentPage?: number;
  totalPages?: number;
  limit?: number;
  // ADS-1190: the gateway nests paging metadata under `pagination`
  // ({ success, data, pagination }). Reading page/total/totalPages off the
  // top level left the UI stuck on page 1.
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
};

/**
 * Envelope returned by single-application endpoints where the payload may
 * be wrapped under `data`.
 */
type RawApplicationEnvelope = RawApplication & { data?: RawApplication };

/**
 * Envelope returned by the timeline list endpoint.
 */
type RawTimelineResponse = {
  timeline?: RawTimelineItem[];
  data?: RawTimelineItem[];
};

/**
 * Shape of the timeline statistics endpoint response.
 */
type TimelineStatsResponse = {
  totalEvents?: number;
  lastActivity?: string;
  eventTypeCounts?: Record<string, number>;
};

/**
 * Legacy snake_case fields the backend may still emit on the application
 * payload — only consulted by the home-visit fallback path below when the
 * dedicated home-visits endpoint isn't available.
 */
type LegacyApplicationFields = {
  home_visit_notes?: string;
  submitted_at?: string;
  actioned_by?: string;
  decision_at?: string;
  reviewed_at?: string;
};

/**
 * ADS-642: translate a StageAction (e.g. START_REVIEW, REJECT) into the
 * `updates` payload accepted by the bulk-update endpoint. Single-row
 * stage transitions reuse the same backend route as bulk transitions —
 * there is no dedicated stage-transition route.
 */
const buildSingleStageTransitionUpdates = (
  stageAction: string,
  nextStage: string | undefined,
  notes: string | undefined,
  data?: Record<string, unknown>
): Record<string, unknown> => {
  if (stageAction === 'REJECT') {
    return {
      status: 'rejected',
      stage: 'resolved',
      finalOutcome: 'rejected',
      rejectionReason: notes,
    };
  }
  if (stageAction === 'WITHDRAW') {
    return {
      status: 'withdrawn',
      stage: 'withdrawn',
      finalOutcome: 'withdrawn',
      withdrawalReason: notes,
    };
  }
  // ADS-1189: MAKE_DECISION resolves the application. The bulk-update route
  // routes a terminal `status` through approve/reject, so the caller must
  // supply the approve-vs-reject choice (data.status) — a bare stage move
  // (e.g. `resolved`) has no matching command and the route rejects it.
  if (stageAction === 'MAKE_DECISION') {
    const decision = data?.status;
    if (decision === 'approved') {
      return { status: 'approved', stage: 'resolved', finalOutcome: 'approved', notes };
    }
    if (decision === 'rejected') {
      return {
        status: 'rejected',
        stage: 'resolved',
        finalOutcome: 'rejected',
        rejectionReason: notes,
      };
    }
    throw new Error('MAKE_DECISION requires a decision of "approved" or "rejected"');
  }
  if (!nextStage) {
    throw new Error(`Stage action ${stageAction} requires a nextStage`);
  }
  const stage = nextStage.toLowerCase();
  // ADS-1189: the bulk-update route dispatches stage `visiting` through
  // ScheduleHomeVisit (needs scheduledAt) and stage `deciding` through
  // CompleteHomeVisit (needs outcome). Sending a bare `{ stage }` made the
  // route reject the item while still returning HTTP 200, so include the
  // required field or fail fast before the request is sent.
  if (stageAction === 'SCHEDULE_VISIT') {
    const scheduledAt = data?.scheduledAt;
    if (typeof scheduledAt !== 'string' || scheduledAt === '') {
      throw new Error('SCHEDULE_VISIT requires a scheduledAt timestamp');
    }
    return notes ? { stage, scheduledAt, notes } : { stage, scheduledAt };
  }
  if (stageAction === 'COMPLETE_VISIT') {
    const outcome = data?.outcome;
    if (typeof outcome !== 'string' || outcome === '') {
      throw new Error('COMPLETE_VISIT requires a visit outcome');
    }
    return notes ? { stage, outcome, notes } : { stage, outcome };
  }
  return { stage };
};

/**
 * Combine the schedule form's date (YYYY-MM-DD) and time (HH:mm) into a
 * single ISO instant for the ScheduleHomeVisit request, which takes one
 * `scheduledAt` timestamp rather than separate fields. Falls back to the
 * raw date when the combined value can't be parsed.
 */
const combineDateTime = (date: string, time: string): string => {
  const parsed = new Date(`${date}T${time || '00:00'}`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toISOString();
};

/**
 * ADS-1199: build the rescue UI's ReferenceCheck list from the references the
 * applicant submitted in the answers blob (application.data.references),
 * shaped { veterinarian?, personal?[] }. The applications view never returns
 * a flat top-level `references` array, so reading `application.references`
 * always yielded an empty list. Mirrors components/applications/extractReferences.
 */
const buildReferenceChecks = (
  applicationId: string,
  references: RawReferencesBlob | undefined
): ReferenceCheck[] => {
  if (!references) {
    return [];
  }
  const checks: ReferenceCheck[] = [];
  const vet = references.veterinarian;
  if (vet?.name && vet.name !== 'To be determined') {
    checks.push({
      id: `ref-${checks.length}`,
      applicationId,
      type: 'veterinarian',
      contactName: vet.name,
      contactInfo: `${vet.phone || 'No phone'} - ${vet.clinicName || 'Veterinarian'}`,
      status: vet.status || 'pending',
      notes: vet.notes || '',
      completedAt: vet.contactedAt,
      completedBy: vet.contactedBy,
    });
  }
  for (const ref of references.personal ?? []) {
    if (!ref.name) {
      continue;
    }
    checks.push({
      id: `ref-${checks.length}`,
      applicationId,
      type: 'personal',
      contactName: ref.name,
      contactInfo: `${ref.phone || 'No phone'} - ${ref.relationship || 'Personal Reference'}`,
      status: ref.status || 'pending',
      notes: ref.notes || '',
      completedAt: ref.contactedAt,
      completedBy: ref.contactedBy,
    });
  }
  return checks;
};

/**
 * Application Service for Rescue App
 * Uses the configured API service with authentication
 */
export class RescueApplicationService {
  private apiService: typeof apiService;

  constructor(customApiService?: typeof apiService) {
    this.apiService = customApiService || apiService;
  }

  /**
   * Get applications with filtering and sorting for rescue dashboard
   */
  async getApplications(
    filter?: ApplicationFilter,
    sort?: ApplicationSort,
    page = 1,
    limit = 25
  ): Promise<{
    applications: ApplicationListItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const params = new URLSearchParams();

      if (filter?.status?.length) {
        params.append('status', filter.status.join(','));
      }
      if (filter?.petId) {
        params.append('pet_id', filter.petId);
      }
      // ADS-575: petType / petBreed are now backend-supported filters
      // (case-insensitive match against the eager-loaded Pet record).
      // referencesStatus / homeVisitStatus are still unwired — the
      // ApplicationList comment block documents why and tracks the
      // follow-up.
      if (filter?.petType) {
        params.append('petType', filter.petType);
      }
      if (filter?.petBreed) {
        params.append('petBreed', filter.petBreed);
      }
      if (filter?.priority?.length) {
        params.append('priority', filter.priority.join(','));
      }
      if (filter?.searchQuery) {
        params.append('search', filter.searchQuery);
      }
      if (filter?.dateRange) {
        // ADS-575: backend search service filters by submittedAt window.
        // The legacy startDate/endDate params were never read server-side.
        params.append('submittedFrom', filter.dateRange.start.toISOString());
        params.append('submittedTo', filter.dateRange.end.toISOString());
      }
      if (sort) {
        // Backend validates sortBy as camelCase (see application.controller.ts
        // isIn check: createdAt, updatedAt, submittedAt, status, priority, score).
        // Pass the field name through as-is.
        params.append('sortBy', sort.field);
        params.append('sortOrder', sort.direction.toUpperCase());
      }

      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 100).toString()); // Backend max is 100
      params.append('_cacheBust', Date.now().toString()); // Force fresh data, no cache

      const response = await this.apiService.get<RawApplication[] | RawApplicationsListResponse>(
        `/api/v1/applications?${params}`
      );

      // Handle different response structures
      let applicationsArray: RawApplication[] = [];
      let envelope: RawApplicationsListResponse = {};
      if (Array.isArray(response)) {
        // Direct array response
        applicationsArray = response;
      } else if (response && Array.isArray(response.applications)) {
        // Wrapped in applications property
        applicationsArray = response.applications;
        envelope = response;
      } else if (response && Array.isArray(response.data)) {
        // Wrapped in data property
        applicationsArray = response.data;
        envelope = response;
      }

      // ADS-1190: prefer the nested `pagination` envelope the gateway
      // returns; fall back to the legacy top-level fields for older shapes.
      const paging = envelope.pagination;
      const total = paging?.total ?? envelope.total ?? envelope.count ?? applicationsArray.length;
      const pageSize = paging?.limit ?? envelope.limit ?? 25;
      return {
        applications: applicationsArray.map(this.transformApplicationForList) || [],
        total,
        page: paging?.page ?? envelope.page ?? envelope.currentPage ?? 1,
        totalPages: paging?.totalPages ?? envelope.totalPages ?? Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      throw new Error('Failed to fetch applications from server');
    }
  }

  /**
   * Get detailed application information for review
   */
  async getApplicationById(id: string) {
    try {
      const response = await this.apiService.get<RawApplicationEnvelope>(
        `/api/v1/applications/${id}`
      );
      return response.data || response; // Extract data field from API response wrapper
    } catch (error) {
      console.error(`Failed to fetch application ${id}:`, error);
      throw new Error(`Failed to fetch application details from server`);
    }
  }

  /**
   * Normalize status values to the format expected by the backend
   */
  private normalizeStatusForBackend(status: string): string {
    if (!status) {
      return status;
    }
    const key = status.trim().toUpperCase();
    const map: Record<string, string> = {
      // Simple status mappings for small charities (aligned with simplified backend)
      SUBMIT: 'submitted',
      SUBMITTED: 'submitted',
      APPROVE: 'approved',
      APPROVED: 'approved',
      REJECT: 'rejected',
      REJECTED: 'rejected',
      WITHDRAW: 'withdrawn',
      WITHDRAWN: 'withdrawn',
    };
    return map[key] || status.toLowerCase();
  }

  /**
   * Map application status to appropriate stage for display
   */
  private mapStatusToStage(status: string): ApplicationStage {
    if (!status) {
      return 'PENDING';
    }

    const normalizedStatus = status.toLowerCase();

    // Terminal statuses map to RESOLVED stage
    const terminalStatuses = ['approved', 'rejected', 'withdrawn'];
    if (terminalStatuses.includes(normalizedStatus)) {
      return 'RESOLVED';
    }

    // All non-terminal statuses are PENDING - rescue staff use stages to track progress
    return 'PENDING';
  }

  /**
   * Check if a status transition is valid based on backend business rules
   */
  private isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
    const from = fromStatus?.toLowerCase();
    const to = toStatus?.toLowerCase();

    // No-op transitions (same status to same status) are invalid
    if (from === to) {
      return false;
    }

    // Terminal statuses cannot transition to anything
    const terminalStatuses = ['approved', 'rejected', 'withdrawn'];
    if (terminalStatuses.includes(from)) {
      return false;
    }

    // Simple validation for small charities - only submitted can transition
    const validTransitions: Record<string, string[]> = {
      submitted: ['approved', 'rejected', 'withdrawn'],
      approved: [], // Terminal state
      rejected: [], // Terminal state
      withdrawn: [], // Terminal state
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(id: string, status: string, notes?: string) {
    try {
      const normalizedStatus = this.normalizeStatusForBackend(status);

      // Get current application to check transition validity
      let currentApp;
      try {
        currentApp = await this.getApplicationById(id);
      } catch (error) {
        console.warn(`Could not fetch current application ${id} for transition check:`, error);
        // Continue anyway - let backend validate
      }

      // Check if transition is valid
      if (currentApp?.status) {
        const currentStatus = currentApp.status.toLowerCase();
        const targetStatus = normalizedStatus.toLowerCase();

        // Check for redundant transition
        if (currentStatus === targetStatus) {
          return { success: true, message: `Application is already ${currentApp.status}` };
        }

        const isValid = this.isValidStatusTransition(currentApp.status, normalizedStatus);
        if (!isValid) {
          const terminalStatuses = ['approved', 'rejected', 'withdrawn'];
          if (terminalStatuses.includes(currentStatus)) {
            throw new Error(
              `Cannot transition from ${currentApp.status} to ${normalizedStatus}. This application is closed and may need to be reopened first.`
            );
          } else {
            throw new Error(
              `Cannot transition from ${currentApp.status} to ${normalizedStatus}. Invalid status transition.`
            );
          }
        }
      }

      const response = await this.apiService.patch<RawApplicationEnvelope>(
        `/api/v1/applications/${id}/status`,
        {
          status: normalizedStatus,
          notes,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data || response; // Extract data field from API response wrapper
    } catch (error) {
      console.error(`Failed to update application status for ${id}:`, error);
      throw error; // Re-throw to preserve the specific error message
    }
  }

  /**
   * Transition application to a new stage using the 5-stage workflow system.
   *
   * ADS-642: single-row transitions go through the bulk-update endpoint
   * (there is no dedicated stage-transition route on the backend). We
   * translate the StageAction's nextStage / terminal outcome into the same
   * `updates` shape `performBulkUpdates` builds, then dispatch a one-item
   * batch.
   */
  async transitionStage(
    id: string,
    stageAction: string,
    nextStage?: string,
    notes?: string,
    data?: Record<string, unknown>
  ) {
    const updates = buildSingleStageTransitionUpdates(stageAction, nextStage, notes, data);
    try {
      const response = await this.apiService.patch<{
        data?: {
          successCount?: number;
          failureCount?: number;
          failures?: Array<{ applicationId: string; error: string }>;
        };
        successCount?: number;
        failureCount?: number;
        failures?: Array<{ applicationId: string; error: string }>;
      }>('/api/v1/applications/bulk-update', {
        applicationIds: [id],
        updates,
      });
      // ADS-1189: the bulk-update route returns HTTP 200 even when it rejects
      // the item, reporting per-row outcomes in the body. Surface a failed
      // transition instead of letting the modal report phantom success.
      const payload = response.data ?? response;
      if ((payload.failureCount ?? 0) > 0) {
        throw new Error(payload.failures?.[0]?.error ?? 'Stage transition failed');
      }
      return payload;
    } catch (error) {
      console.error(`Failed to transition stage for application ${id}:`, error);
      throw error; // Re-throw to preserve the specific error message
    }
  }

  /**
   * Get application statistics for dashboard
   */
  async getApplicationStats(): Promise<ApplicationStats> {
    try {
      // ADS-1204: the endpoint is /stats (not /statistics, which 404s) and
      // the gateway wraps the payload in a `{ data }` envelope.
      const response = await this.apiService.get<{ data: ApplicationStats }>(
        '/api/v1/applications/stats'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch application stats:', error);
      throw new Error('Failed to fetch application statistics from server');
    }
  }

  /**
   * Get reference checks for an application
   */
  async getReferenceChecks(applicationId: string): Promise<ReferenceCheck[]> {
    try {
      // References are part of the main application data
      const response = await this.apiService.get<RawApplicationEnvelope>(
        `/api/v1/applications/${applicationId}`
      );
      const application = response.data || response; // Extract data field from API response wrapper

      // ADS-1199: references live inside the submitted answers blob
      // (application.data.references), not as a flat top-level array.
      return buildReferenceChecks(applicationId, application.data?.references);
    } catch (error) {
      console.error(`Failed to fetch references for application ${applicationId}:`, error);
      throw new Error('Failed to fetch reference checks from server');
    }
  }

  /**
   * Update reference check status
   */
  async updateReferenceCheck(
    applicationId: string,
    referenceId: string,
    status: string,
    notes?: string
  ) {
    try {
      // Use the new referenceId parameter instead of extracting reference_index
      const response = await this.apiService.patch<unknown>(
        `/api/v1/applications/${applicationId}/references`,
        {
          referenceId, // Send the reference ID directly
          status,
          notes,
          contacted_at: new Date().toISOString(),
        }
      );
      return response;
    } catch (error) {
      console.error(
        `Failed to update reference check ${referenceId} for application ${applicationId}:`,
        error
      );
      throw new Error('Failed to update reference check on server');
    }
  }

  /**
   * Get home visits for an application
   */
  async getHomeVisits(applicationId: string): Promise<HomeVisit[]> {
    try {
      // First try the dedicated home-visits endpoint
      const response = await this.apiService.get<{ success: boolean; visits: HomeVisit[] }>(
        `/api/v1/applications/${applicationId}/home-visits`
      );

      // Handle backend response format { success: true, visits: [...] }
      if (response.success && Array.isArray(response.visits)) {
        return response.visits;
      }

      // Fallback for direct array response (backward compatibility)
      if (Array.isArray(response)) {
        return response;
      }

      return [];
    } catch (error) {
      console.error('Home visits endpoint not available, checking application data:', error);

      // Fallback: Check if there are home_visit_notes in the application data
      try {
        const application = await this.apiService.get<RawApplication & LegacyApplicationFields>(
          `/api/v1/applications/${applicationId}`
        );

        if (application?.home_visit_notes && application.home_visit_notes.trim()) {
          // Convert existing home_visit_notes to a HomeVisit object
          const homeVisit: HomeVisit = {
            id: `legacy-visit-${applicationId}`,
            applicationId: applicationId,
            scheduledDate: application.submitted_at
              ? new Date(application.submitted_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            scheduledTime: '14:00', // Default time since we don't have it
            assignedStaff: application.actioned_by || 'Staff Member',
            status: 'completed' as const,
            notes: application.home_visit_notes,
            outcome:
              application.status === 'approved'
                ? ('approved' as const)
                : application.status === 'rejected'
                  ? ('rejected' as const)
                  : ('conditional' as const),
            completedAt:
              application.decision_at || application.reviewed_at || new Date().toISOString(),
          };

          return [homeVisit];
        }

        return [];
      } catch (fallbackError) {
        // UX P2 G: previously returned `[]` here, which was indistinguishable
        // from "no home visits scheduled" — the UI rendered an empty section
        // even when the entire request had failed. Re-throw so the consuming
        // hook can surface an inline error.
        console.error('Error fetching application data for home visit fallback:', fallbackError);
        throw fallbackError instanceof Error
          ? fallbackError
          : new Error('Failed to load home visits');
      }
    }
  }

  /**
   * Schedule a home visit.
   *
   * Backed by POST /api/v1/applications/:id/home-visit/schedule
   * (ScheduleHomeVisit): the service models the visit on the application
   * itself, so the route takes a single `scheduledAt` instant plus an
   * optional `note` and returns the updated application (not a standalone
   * visit row). We fold the form's date + time into one ISO timestamp for
   * the request and return the scheduled visit assembled from the submitted
   * values — the consuming hook re-fetches the application afterwards, so the
   * assigned-staff field (which the service does not persist) stays local.
   */
  async scheduleHomeVisit(
    applicationId: string,
    visitData: {
      scheduledDate: string;
      scheduledTime: string;
      assignedStaff: string;
      notes?: string;
    }
  ): Promise<HomeVisit> {
    try {
      await this.apiService.post<{ application?: unknown }>(
        `/api/v1/applications/${applicationId}/home-visit/schedule`,
        {
          scheduledAt: combineDateTime(visitData.scheduledDate, visitData.scheduledTime),
          note: visitData.notes,
        }
      );

      return {
        id: `visit-${applicationId}`,
        applicationId,
        scheduledDate: visitData.scheduledDate,
        scheduledTime: visitData.scheduledTime,
        assignedStaff: visitData.assignedStaff,
        status: 'scheduled',
        notes: visitData.notes,
      };
    } catch (error) {
      console.error('Error scheduling home visit:', error);
      throw new Error('Failed to schedule home visit. Please try again.');
    }
  }

  /**
   * Update home visit status
   */
  async updateHomeVisit(
    applicationId: string,
    visitId: string,
    updateData: Partial<HomeVisit>
  ): Promise<HomeVisit> {
    try {
      // Convert camelCase to snake_case for API
      const apiData: Record<string, unknown> = {};

      if (updateData.status) {
        apiData.status = updateData.status;
      }
      if (updateData.scheduledDate) {
        apiData.scheduled_date = updateData.scheduledDate;
      }
      if (updateData.scheduledTime) {
        apiData.scheduled_time = updateData.scheduledTime;
      }
      if (updateData.assignedStaff) {
        apiData.assigned_staff = updateData.assignedStaff;
      }
      if (updateData.notes) {
        apiData.notes = updateData.notes;
      }
      if (updateData.outcome) {
        apiData.outcome = updateData.outcome;
      }
      if (updateData.completedAt) {
        apiData.completed_at = updateData.completedAt;
      }

      // Add any custom fields for different update types
      if ('startedAt' in updateData) {
        apiData.started_at = updateData.startedAt;
      }
      if ('rescheduledAt' in updateData) {
        apiData.rescheduled_at = updateData.rescheduledAt;
      }
      if ('rescheduleReason' in updateData) {
        apiData.reschedule_reason = updateData.rescheduleReason;
      }
      if ('cancelledAt' in updateData) {
        apiData.cancelled_at = updateData.cancelledAt;
      }
      if ('cancelReason' in updateData) {
        apiData.cancelled_reason = updateData.cancelReason;
      }
      if ('conditions' in updateData) {
        apiData.conditions = updateData.conditions;
      }

      const response = await this.apiService.put<{
        success: boolean;
        message: string;
        visit: HomeVisit;
      }>(`/api/v1/applications/${applicationId}/home-visits/${visitId}`, apiData);

      // Handle backend response format { success: true, visit: {...} }
      if (response.success && response.visit) {
        return response.visit;
      }

      // Fallback for direct HomeVisit response (backward compatibility)
      const fallback = response as unknown as Record<string, unknown>;
      if (fallback.id || fallback.scheduledDate) {
        return fallback as unknown as HomeVisit;
      }

      throw new Error('Invalid response format from server');
    } catch (error) {
      console.error('Error updating home visit:', error);
      throw new Error('Failed to update home visit. Please try again.');
    }
  }

  /**
   * Get application timeline
   */
  async getApplicationTimeline(applicationId: string): Promise<ApplicationTimeline[]> {
    try {
      const response = await this.apiService.get<RawTimelineItem[] | RawTimelineResponse>(
        `/api/v1/applications/${applicationId}/timeline`
      );

      // Handle different possible response formats
      let timelineArray: RawTimelineItem[] = [];

      if (Array.isArray(response)) {
        timelineArray = response;
      } else if (response && Array.isArray(response.timeline)) {
        timelineArray = response.timeline;
      } else if (response && Array.isArray(response.data)) {
        timelineArray = response.data;
      } else {
        console.warn('Unexpected timeline response format:', response);
        timelineArray = [];
      }

      // Transform timeline data to expected format
      return timelineArray.map(
        (item: RawTimelineItem): ApplicationTimeline => ({
          id: item.timeline_id || item.id || '',
          applicationId: item.application_id || applicationId,
          event: item.event_type || item.event || 'Timeline Event',
          title: item.title || item.event || 'Timeline Event',
          description: item.description || `Timeline event: ${item.event_type}`,
          timestamp: item.created_at || item.timestamp || '',
          userId: item.created_by || item.userId,
          userName: item.created_by_system
            ? 'System'
            : item.CreatedBy
              ? `${item.CreatedBy.firstName || ''} ${item.CreatedBy.lastName || ''}`.trim() ||
                item.CreatedBy.email ||
                'Unknown User'
              : item.created_by_name || item.userName || 'Unknown',
          data: item.metadata || item.data || {},
          eventType: item.event_type,
          isSystemGenerated: item.created_by_system || false,
          previousStage: item.previous_stage,
          newStage: item.new_stage,
          previousStatus: item.previous_status,
          newStatus: item.new_status,
        })
      );
    } catch (error) {
      // UX P0/P1 #6: previously this returned `[]` on error, which was
      // indistinguishable from a genuine empty timeline. Re-throw so the
      // caller can render an error state instead of a silent empty list.
      console.error(`Failed to fetch timeline for application ${applicationId}:`, error);
      throw error instanceof Error ? error : new Error('Failed to load application timeline');
    }
  }

  /**
   * Add timeline event
   */
  async addTimelineEvent(
    applicationId: string,
    event: string,
    description: string,
    data?: Record<string, unknown>
  ) {
    try {
      const response = await this.apiService.post<unknown>(
        `/api/v1/applications/${applicationId}/timeline/events`,
        {
          event_type: event,
          title: event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description,
          metadata: data || {},
        }
      );

      return response;
    } catch (error) {
      console.error(`Failed to add timeline event for application ${applicationId}:`, error);
      throw new Error('Failed to add timeline event on server');
    }
  }

  /**
   * Get timeline statistics for an application
   */
  async getApplicationTimelineStats(applicationId: string): Promise<TimelineStatsResponse> {
    try {
      const response = await this.apiService.get<TimelineStatsResponse>(
        `/api/v1/applications/${applicationId}/timeline/stats`
      );

      return response;
    } catch (error) {
      console.error(`Failed to fetch timeline stats for application ${applicationId}:`, error);
      throw new Error('Failed to fetch application timeline statistics');
    }
  }

  /**
   * Add a note to the application timeline
   */
  async addTimelineNote(applicationId: string, title: string, content: string, noteType?: string) {
    try {
      const response = await this.apiService.post<unknown>(
        `/api/v1/applications/${applicationId}/timeline/notes`,
        {
          title,
          description: content,
          metadata: {
            note_type: noteType || 'general',
            full_content: content,
          },
        }
      );

      return response;
    } catch (error) {
      console.error(`Failed to add timeline note for application ${applicationId}:`, error);
      throw new Error('Failed to add timeline note');
    }
  }

  /**
   * Perform bulk actions on applications
   */
  async performBulkAction(action: BulkAction) {
    try {
      // Transform the action to match backend expectations
      const bulkUpdate = {
        applicationIds: action.applicationIds,
        updates: {
          // Map action type to simple status updates
          ...(action.type === 'approve' && { status: 'approved' }),
          ...(action.type === 'reject' && { status: 'rejected' }),
          ...(action.type === 'withdraw' && { status: 'withdrawn' }),
          ...action.data,
        },
      };

      const response = await this.apiService.patch<unknown>(
        '/api/v1/applications/bulk-update',
        bulkUpdate
      );
      return response;
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
      throw new Error('Failed to perform bulk action on server');
    }
  }

  /**
   * ADS-642: dispatch a set of per-application bulk updates. Each group
   * shares one `updates` payload (e.g. all rows advancing to REVIEWING
   * vs. all rows advancing to VISITING), so the bulk-update endpoint
   * still does the heavy lifting and we only fan out by distinct
   * payload shape. Returns an aggregate {successCount, failureCount}
   * matching the existing single-action response shape.
   */
  async performBulkUpdates(
    groups: ReadonlyArray<{ applicationIds: string[]; updates: Record<string, unknown> }>
  ): Promise<{
    successCount: number;
    failureCount: number;
    failures: Array<{ applicationId: string; error: string }>;
  }> {
    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{ applicationId: string; error: string }> = [];
    for (const group of groups) {
      if (group.applicationIds.length === 0) {
        continue;
      }
      try {
        const response = await this.apiService.patch<{
          data?: {
            successCount?: number;
            failureCount?: number;
            failures?: Array<{ applicationId: string; error: string }>;
          };
          successCount?: number;
          failureCount?: number;
          failures?: Array<{ applicationId: string; error: string }>;
        }>('/api/v1/applications/bulk-update', {
          applicationIds: group.applicationIds,
          updates: group.updates,
        });
        const payload = response.data || response;
        successCount += payload.successCount ?? group.applicationIds.length;
        failureCount += payload.failureCount ?? 0;
        if (payload.failures) {
          failures.push(...payload.failures);
        }
      } catch (error) {
        failureCount += group.applicationIds.length;
        const message = error instanceof Error ? error.message : 'Bulk update failed';
        for (const id of group.applicationIds) {
          failures.push({ applicationId: id, error: message });
        }
      }
    }
    return { successCount, failureCount, failures };
  }

  /**
   * Transform application data for list display
   */
  private transformApplicationForList = (app: RawApplication): ApplicationListItem => {
    const submittedAt = new Date(app.submittedAt || new Date());
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: app.id,
      petId: app.petId,
      petName: app.petName || 'Unknown Pet',
      petType: app.petType || 'Unknown',
      petBreed: app.petBreed || 'Mixed',
      userId: app.userId,
      rescueId: app.rescueId,
      status: app.status,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      data: app.data,
      applicantName:
        `${app.data?.personalInfo?.firstName || 'Unknown'} ${app.data?.personalInfo?.lastName || ''}`.trim(),
      submittedDaysAgo: daysDiff,
      priority: this.getPriority(app),
      referencesStatus: this.calculateReferencesStatus(app),
      homeVisitStatus: this.calculateHomeVisitStatus(app),
      // New stage-based fields - map status to appropriate stage if no stage provided
      stage: app.stage || this.mapStatusToStage(app.status),
      stageProgressPercentage: this.calculateStageProgress(app),
      assignedStaff: app.assignedStaff,
      tags: app.tags || [],
      finalOutcome: app.finalOutcome,
    };
  };

  /**
   * Get application priority from backend data
   */
  private getPriority(app: RawApplication): ApplicationPriority {
    // Use the actual priority field from the backend
    // Backend uses: LOW, NORMAL, HIGH, URGENT

    if (!app.priority) {
      return 'normal'; // Default to normal if no priority set
    }

    const backendPriority = app.priority.toLowerCase() as ApplicationPriority;

    // Validate that it's one of our expected values
    const validPriorities: ApplicationPriority[] = ['low', 'normal', 'high', 'urgent'];
    return validPriorities.includes(backendPriority) ? backendPriority : 'normal';
  }

  /**
   * Calculate references status based on application data
   */
  private calculateReferencesStatus(
    app: RawApplication
  ): 'pending' | 'in_progress' | 'completed' | 'failed' {
    // Simple logic based on simplified statuses
    if (app.status === 'submitted') {
      return 'pending';
    }
    if (app.status === 'approved') {
      return 'completed';
    }
    if (app.status === 'rejected') {
      return 'failed';
    }
    return 'pending';
  }

  /**
   * Calculate home visit status based on application data
   */
  private calculateHomeVisitStatus(
    app: RawApplication
  ): 'not_scheduled' | 'scheduled' | 'completed' | 'failed' {
    // Simple logic based on simplified statuses
    if (app.status === 'submitted') {
      return 'not_scheduled';
    }
    if (app.status === 'approved') {
      return 'completed';
    }
    if (app.status === 'rejected') {
      return 'failed';
    }
    return 'not_scheduled';
  }

  /**
   * Calculate stage progress percentage based on current stage and completed steps
   */
  private calculateStageProgress(app: RawApplication): number {
    const stage = app.stage || 'PENDING';

    // Base progress by stage
    const stageProgress: Record<string, number> = {
      PENDING: 10,
      REVIEWING: 30,
      VISITING: 60,
      DECIDING: 80,
      RESOLVED: 100,
    };

    let progress = stageProgress[stage] || 0;

    // Add bonus progress based on completed tasks
    if (app.referencesCompleted) {
      progress += 10;
    }
    if (app.homeVisitCompleted) {
      progress += 10;
    }
    if (app.interviewCompleted) {
      progress += 5;
    }

    return Math.min(progress, 100);
  }
}

// Export a default instance for easy use
export const applicationService = new RescueApplicationService();

// Export the class as default for custom configurations
