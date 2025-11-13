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
} from '../types/applications';
import type { ApplicationStage } from '../types/applicationStages';
import type { ApplicationPriority } from '@adopt-dont-shop/lib.applications';

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
      // Note: pet_type, pet_breed, references_status, home_visit_status are not validated by backend
      // These will need to be filtered client-side or backend validation needs to be updated
      if (filter?.priority?.length) {
        params.append('priority', filter.priority.join(','));
      }
      if (filter?.searchQuery) {
        params.append('search', filter.searchQuery);
      }
      if (filter?.dateRange) {
        params.append('startDate', filter.dateRange.start.toISOString());
        params.append('endDate', filter.dateRange.end.toISOString());
      }
      if (sort) {
        // Map frontend field names to backend field names
        const fieldMapping: Record<string, string> = {
          submittedAt: 'submitted_at',
          status: 'status',
          petName: 'pet_name',
          applicantName: 'applicant_name',
          priority: 'priority',
        };

        const backendField = fieldMapping[sort.field] || sort.field;
        params.append('sortBy', backendField);
        params.append('sortOrder', sort.direction.toUpperCase());
      }

      params.append('page', page.toString());
      params.append('limit', Math.min(limit, 100).toString()); // Backend max is 100
      params.append('_cacheBust', Date.now().toString()); // Force fresh data, no cache

      const response = await this.apiService.get<any>(`/api/v1/applications?${params}`);

      // Handle different response structures
      let applicationsArray = [];
      if (Array.isArray(response)) {
        // Direct array response
        applicationsArray = response;
      } else if (response && response.applications && Array.isArray(response.applications)) {
        // Wrapped in applications property
        applicationsArray = response.applications;
      } else if (response && response.data && Array.isArray(response.data)) {
        // Wrapped in data property
        applicationsArray = response.data;
      }

      return {
        applications: this.applyClientSideFilters(
          applicationsArray.map(this.transformApplicationForList) || [],
          filter || {}
        ),
        total: response.total || response.count || applicationsArray.length,
        page: response.page || response.currentPage || 1,
        totalPages:
          response.totalPages ||
          Math.ceil((response.total || applicationsArray.length) / (response.limit || 25)),
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
      const response = await this.apiService.get<any>(`/api/v1/applications/${id}`);
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
          console.log(
            `Application ${id} is already in status ${currentApp.status}, skipping redundant update`
          );
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

      const response = await this.apiService.patch<any>(`/api/v1/applications/${id}/status`, {
        status: normalizedStatus,
        notes,
        timestamp: new Date().toISOString(),
      });
      return response.data || response; // Extract data field from API response wrapper
    } catch (error) {
      console.error(`Failed to update application status for ${id}:`, error);
      throw error; // Re-throw to preserve the specific error message
    }
  }

  /**
   * Transition application to a new stage using the 5-stage workflow system
   * @param id Application ID
   * @param stageAction The stage action to perform (from STAGE_ACTIONS)
   * @param notes Optional notes about the transition
   */
  async transitionStage(id: string, stageAction: string, notes?: string) {
    try {
      const response = await this.apiService.post<any>(
        `/api/v1/applications/${id}/stage-transition`,
        {
          action: stageAction,
          notes,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data || response; // Extract data field from API response wrapper
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
      const response = await this.apiService.get<any>('/api/v1/applications/statistics');
      return response;
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
      const response = await this.apiService.get<any>(`/api/v1/applications/${applicationId}`);
      const application = response.data || response; // Extract data field from API response wrapper

      // Extract references from application data and transform them
      const references = application?.references || [];
      return references.map((ref: any, index: number) => ({
        id: `ref-${index}`,
        applicationId,
        type: ref.relationship?.toLowerCase().includes('vet') ? 'veterinarian' : 'personal',
        contactName: ref.name,
        contactInfo: `${ref.phone} - ${ref.email}`,
        status: ref.status || 'pending',
        notes: ref.notes || '',
        completedAt: ref.contactedAt,
        completedBy: ref.contactedBy,
      }));
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
      const response = await this.apiService.patch<any>(
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
        const application = await this.apiService.get<any>(`/api/v1/applications/${applicationId}`);

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

          console.log(`Found legacy home visit notes for application ${applicationId}:`, homeVisit);
          return [homeVisit];
        }

        return [];
      } catch (fallbackError) {
        console.error('Error fetching application data for home visit fallback:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Schedule a home visit
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
      const response = await this.apiService.post<{
        success: boolean;
        message: string;
        visit: HomeVisit;
      }>(`/api/v1/applications/${applicationId}/home-visits`, {
        scheduled_date: visitData.scheduledDate,
        scheduled_time: visitData.scheduledTime,
        assigned_staff: visitData.assignedStaff,
        notes: visitData.notes,
        status: 'scheduled',
      });

      // Handle backend response format { success: true, visit: {...} }
      if (response.success && response.visit) {
        return response.visit;
      }

      // Fallback for direct HomeVisit response (backward compatibility)
      if ((response as any).id || (response as any).scheduledDate) {
        return response as unknown as HomeVisit;
      }

      throw new Error('Invalid response format from server');
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
      const apiData: Record<string, any> = {};

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
      if ((response as any).id || (response as any).scheduledDate) {
        return response as unknown as HomeVisit;
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
      const response = await this.apiService.get<any>(
        `/api/v1/applications/${applicationId}/timeline`
      );

      console.log('Timeline API response:', response); // Debug log

      // Handle different possible response formats
      let timelineArray = [];

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
      return timelineArray.map((item: any) => ({
        id: item.timeline_id || item.id,
        applicationId: item.application_id || applicationId,
        event: item.event_type || item.event || 'Timeline Event',
        title: item.title || item.event || 'Timeline Event',
        description: item.description || `Timeline event: ${item.event_type}`,
        timestamp: item.created_at || item.timestamp,
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
      }));
    } catch (error) {
      console.error(`Failed to fetch timeline for application ${applicationId}:`, error);

      // Return empty array instead of throwing to prevent UI crashes
      console.warn('Returning empty timeline array due to API error');
      return [];
    }
  }

  /**
   * Add timeline event
   */
  async addTimelineEvent(
    applicationId: string,
    event: string,
    description: string,
    data?: Record<string, any>
  ) {
    try {
      const response = await this.apiService.post<any>(
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
  async getApplicationTimelineStats(applicationId: string): Promise<any> {
    try {
      const response = await this.apiService.get<any>(
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
      const response = await this.apiService.post<any>(
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

      const response = await this.apiService.patch<any>(
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
   * Apply client-side filtering for parameters not supported by backend
   */
  private applyClientSideFilters(
    applications: ApplicationListItem[],
    filter: ApplicationFilter
  ): ApplicationListItem[] {
    return applications.filter(app => {
      // Filter by pet type (not validated by backend, need to be filtered client-side)
      if (filter.petType && filter.petType !== 'all' && app.petType !== filter.petType) {
        return false;
      }

      // Filter by pet breed (not validated by backend, need to be filtered client-side)
      if (filter.petBreed && filter.petBreed !== 'all' && app.petBreed !== filter.petBreed) {
        return false;
      }

      // Filter by references status (not validated by backend, need to be filtered client-side)
      if (filter.referencesStatus && filter.referencesStatus !== 'all') {
        // Note: This would need reference data to properly filter,
        // for now we'll allow all applications through
        // In a complete implementation, we'd need to fetch reference data or include it in the application response
      }

      // Filter by home visit status (not validated by backend, need to be filtered client-side)
      if (filter.homeVisitStatus && filter.homeVisitStatus !== 'all') {
        // Note: This would need visit data to properly filter,
        // for now we'll allow all applications through
        // In a complete implementation, we'd need to fetch visit data or include it in the application response
      }

      return true;
    });
  }

  /**
   * Transform application data for list display
   */
  private transformApplicationForList = (app: any): ApplicationListItem => {
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
      createdAt: app.createdAt || app.submittedAt,
      updatedAt: app.updatedAt || app.submittedAt,
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
  private getPriority(app: any): ApplicationPriority {
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
  private calculateReferencesStatus(app: any): 'pending' | 'in_progress' | 'completed' | 'failed' {
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
    app: any
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
  private calculateStageProgress(app: any): number {
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
export default RescueApplicationService;
