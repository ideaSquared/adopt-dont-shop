import { apiService } from './api';
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
      return response;
    } catch (error) {
      console.error(`Failed to fetch application ${id}:`, error);
      throw new Error(`Failed to fetch application details from server`);
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(id: string, status: string, notes?: string) {
    try {
      const response = await this.apiService.patch<any>(`/api/v1/applications/${id}/status`, {
        status,
        notes,
        timestamp: new Date().toISOString(),
      });
      return response;
    } catch (error) {
      console.error(`Failed to update application status for ${id}:`, error);
      throw new Error('Failed to update application status on server');
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
      const application = response;

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
      // Extract the reference index from the referenceId (e.g., "ref-0" -> 0)
      const referenceIndex = parseInt(referenceId.split('-')[1], 10);

      const response = await this.apiService.patch<any>(
        `/api/v1/applications/${applicationId}/references`,
        {
          reference_index: referenceIndex,
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
      // For now, visits might be part of the application data or not implemented
      // Return empty array until visit endpoints are fully implemented
      console.warn(`Home visits not fully implemented in backend for application ${applicationId}`);
      return [];
    } catch (error) {
      console.error(`Failed to fetch home visits for application ${applicationId}:`, error);
      throw new Error('Failed to fetch home visits from server');
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
  ) {
    try {
      const response = await this.apiService.post<any>(
        `/api/v1/applications/${applicationId}/schedule-visit`,
        {
          date: visitData.scheduledDate,
          time: visitData.scheduledTime,
          notes: visitData.notes,
          visitType: 'HOME_VISIT',
        }
      );
      return response;
    } catch (error) {
      console.error(`Failed to schedule home visit for application ${applicationId}:`, error);
      throw new Error('Failed to schedule home visit on server');
    }
  }

  /**
   * Update home visit status
   */
  async updateHomeVisit(applicationId: string, visitId: string, updateData: Partial<HomeVisit>) {
    try {
      // Visit updates might not be implemented yet
      console.warn(
        `Home visit updates not fully implemented in backend for application ${applicationId}, visit ${visitId}`,
        updateData
      );
      throw new Error('Home visit updates not yet implemented in backend');
    } catch (error) {
      console.error(
        `Failed to update home visit ${visitId} for application ${applicationId}:`,
        error
      );
      throw new Error('Failed to update home visit on server');
    }
  }

  /**
   * Get application timeline
   */
  async getApplicationTimeline(applicationId: string): Promise<ApplicationTimeline[]> {
    try {
      const response = await this.apiService.get<any>(
        `/api/v1/applications/${applicationId}/history`
      );

      // Transform history data to timeline format
      const history = response.history || [];
      return history.map((item: any, index: number) => ({
        id: `timeline-${index}`,
        applicationId,
        event: item.event || item.action || 'Status Update',
        description: item.description || item.message || `Status changed to ${item.status}`,
        timestamp: item.timestamp || item.createdAt,
        userId: item.userId,
        userName: item.userName || item.staffName || 'System',
        data: item.data || {},
      }));
    } catch (error) {
      console.error(`Failed to fetch timeline for application ${applicationId}:`, error);
      throw new Error('Failed to fetch application timeline from server');
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
      // Timeline events are typically created automatically when status changes
      // For now, we'll update the application status which should create a history entry
      console.warn(`Timeline event addition not directly supported - use status updates instead`, {
        applicationId,
        event,
        description,
        data,
      });
      throw new Error('Direct timeline event addition not supported - use status updates');
    } catch (error) {
      console.error(`Failed to add timeline event for application ${applicationId}:`, error);
      throw new Error('Failed to add timeline event on server');
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
          // Map action type to status updates
          ...(action.type === 'approve' && { status: 'APPROVED' }),
          ...(action.type === 'reject' && { status: 'REJECTED' }),
          ...(action.type === 'request_references' && { status: 'PENDING_REFERENCES' }),
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
    };
  };

  /**
   * Get application priority from backend data
   */
  private getPriority(app: any): 'low' | 'medium' | 'high' | 'urgent' {
    // Use the actual priority field from the backend
    // Backend uses: LOW, NORMAL, HIGH, URGENT
    // Frontend expects: low, medium, high, urgent

    if (!app.priority) {
      return 'medium'; // Default to medium if no priority set
    }

    const backendPriority = app.priority.toLowerCase();

    // Map NORMAL to medium for better UI representation
    if (backendPriority === 'normal') {
      return 'medium';
    }

    // Validate that it's one of our expected values
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    return validPriorities.includes(backendPriority)
      ? (backendPriority as 'low' | 'medium' | 'high' | 'urgent')
      : 'medium';
  }

  /**
   * Calculate references status based on application data
   */
  private calculateReferencesStatus(app: any): 'pending' | 'in_progress' | 'completed' | 'failed' {
    // This would be calculated based on actual reference checks data
    // For now, return based on application status
    if (app.status === 'pending_references') return 'pending';
    if (app.status === 'under_review') return 'in_progress';
    if (app.status === 'approved') return 'completed';
    return 'pending';
  }

  /**
   * Calculate home visit status based on application data
   */
  private calculateHomeVisitStatus(
    app: any
  ): 'not_scheduled' | 'scheduled' | 'completed' | 'failed' {
    // This would be calculated based on actual home visit data
    // For now, return based on application status
    if (app.status === 'approved') return 'completed';
    if (app.status === 'under_review') return 'scheduled';
    return 'not_scheduled';
  }
}

// Export a default instance for easy use
export const applicationService = new RescueApplicationService();

// Export the class as default for custom configurations
export default RescueApplicationService;
