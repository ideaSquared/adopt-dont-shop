import { apiService } from './api';

// Application types for rescue app
interface Application {
  application_id: string;
  pet_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  application_data: {
    personal_info: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      address: string;
    };
    housing_info: {
      housing_type: string;
      own_or_rent: string;
      landlord_permission: boolean;
      yard_size?: string;
      fencing?: string;
    };
    experience: {
      previous_pets: boolean;
      experience_level: string;
      veterinarian_info?: string;
    };
    lifestyle: {
      work_schedule: string;
      family_members: number;
      children_ages?: string;
      other_pets?: string;
    };
  };
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

interface ApplicationListResponse {
  applications: Application[];
  total: number;
  page: number;
  limit: number;
}

interface ApplicationFilters {
  status?: string;
  pet_id?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

interface ProcessApplicationRequest {
  application_id: string;
  action: 'approve' | 'reject';
  notes?: string;
}

/**
 * Application Service for Rescue App
 *
 * Manages adoption applications submitted by potential adopters.
 * Provides functionality for reviewing, processing, and tracking applications.
 */
class ApplicationService {
  /**
   * Get all applications for the rescue
   */
  async getApplications(filters: ApplicationFilters = {}): Promise<ApplicationListResponse> {
    try {
      return await apiService.get<ApplicationListResponse>('/api/v1/applications', filters);
    } catch (error) {
      console.error('❌ ApplicationService: Failed to fetch applications:', error);
      throw error;
    }
  }

  /**
   * Get a specific application by ID
   */
  async getApplication(applicationId: string): Promise<Application> {
    try {
      return await apiService.get<Application>(`/api/v1/applications/${applicationId}`);
    } catch (error) {
      console.error('❌ ApplicationService: Failed to fetch application:', error);
      throw error;
    }
  }

  /**
   * Get applications for a specific pet
   */
  async getApplicationsForPet(petId: string): Promise<Application[]> {
    try {
      const response = await apiService.get<ApplicationListResponse>('/api/v1/applications', {
        pet_id: petId,
      });
      return response.applications;
    } catch (error) {
      console.error('❌ ApplicationService: Failed to fetch pet applications:', error);
      throw error;
    }
  }

  /**
   * Process an application (approve or reject)
   */
  async processApplication(request: ProcessApplicationRequest): Promise<Application> {
    try {
      return await apiService.patch<Application>(
        `/api/v1/applications/${request.application_id}/process`,
        {
          action: request.action,
          notes: request.notes,
        }
      );
    } catch (error) {
      console.error('❌ ApplicationService: Failed to process application:', error);
      throw error;
    }
  }

  /**
   * Add notes to an application
   */
  async addNotes(applicationId: string, notes: string): Promise<Application> {
    try {
      return await apiService.patch<Application>(`/api/v1/applications/${applicationId}/notes`, {
        notes,
      });
    } catch (error) {
      console.error('❌ ApplicationService: Failed to add notes:', error);
      throw error;
    }
  }

  /**
   * Get application statistics
   */
  async getApplicationStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    withdrawn: number;
  }> {
    try {
      return await apiService.get('/api/v1/applications/stats');
    } catch (error) {
      console.error('❌ ApplicationService: Failed to fetch application stats:', error);
      throw error;
    }
  }

  /**
   * Schedule an interview for an application
   */
  async scheduleInterview(
    applicationId: string,
    interviewData: {
      scheduled_date: string;
      location: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      await apiService.post(`/api/v1/applications/${applicationId}/interview`, interviewData);
    } catch (error) {
      console.error('❌ ApplicationService: Failed to schedule interview:', error);
      throw error;
    }
  }

  /**
   * Complete an interview
   */
  async completeInterview(
    applicationId: string,
    interviewResults: {
      outcome: 'positive' | 'negative' | 'neutral';
      notes: string;
      follow_up_required?: boolean;
    }
  ): Promise<Application> {
    try {
      return await apiService.patch<Application>(
        `/api/v1/applications/${applicationId}/interview/complete`,
        interviewResults
      );
    } catch (error) {
      console.error('❌ ApplicationService: Failed to complete interview:', error);
      throw error;
    }
  }

  /**
   * Request additional information from applicant
   */
  async requestAdditionalInfo(
    applicationId: string,
    requestData: {
      requested_info: string[];
      message: string;
    }
  ): Promise<void> {
    try {
      await apiService.post(`/api/v1/applications/${applicationId}/request-info`, requestData);
    } catch (error) {
      console.error('❌ ApplicationService: Failed to request additional info:', error);
      throw error;
    }
  }

  /**
   * Get application timeline/history
   */
  async getApplicationTimeline(applicationId: string): Promise<{
    events: Array<{
      event_type: string;
      description: string;
      user_id?: string;
      user_name?: string;
      created_at: string;
    }>;
  }> {
    try {
      return await apiService.get(`/api/v1/applications/${applicationId}/timeline`);
    } catch (error) {
      console.error('❌ ApplicationService: Failed to fetch application timeline:', error);
      throw error;
    }
  }

  /**
   * Export applications data
   */
  async exportApplications(
    filters: ApplicationFilters = {},
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<Blob> {
    try {
      const response = await apiService.get(`/api/v1/applications/export`, {
        ...filters,
        format,
      });
      return response as unknown as Blob;
    } catch (error) {
      console.error('❌ ApplicationService: Failed to export applications:', error);
      throw error;
    }
  }

  /**
   * Search applications
   */
  async searchApplications(
    query: string,
    filters: ApplicationFilters = {}
  ): Promise<ApplicationListResponse> {
    try {
      return await apiService.get<ApplicationListResponse>('/api/v1/applications/search', {
        query,
        ...filters,
      });
    } catch (error) {
      console.error('❌ ApplicationService: Failed to search applications:', error);
      throw error;
    }
  }

  /**
   * Get application metrics for dashboard
   */
  async getApplicationMetrics(dateRange?: { start: string; end: string }): Promise<{
    total_applications: number;
    approval_rate: number;
    average_processing_time: number;
    applications_by_status: Record<string, number>;
    applications_by_month: Array<{ month: string; count: number }>;
  }> {
    try {
      return await apiService.get('/api/v1/applications/metrics', dateRange);
    } catch (error) {
      console.error('❌ ApplicationService: Failed to fetch application metrics:', error);
      throw error;
    }
  }
}

export const applicationService = new ApplicationService();
