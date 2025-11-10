/**
 * ApplicationsService - Handles applications operations
 */
import { ApiService } from '@adopt-dont-shop/lib-api';
import {
  Application,
  ApplicationData,
  ApplicationStatus,
  ApplicationWithPetInfo,
  DocumentUpload,
  Document,
  ApplicationsServiceConfig,
} from '../types';

/**
 * Applications Service
 *
 * Provides complete adoption application workflow and document management
 * capabilities. Handles multi-step form processing, document uploads,
 * and application status tracking.
 *
 * Features:
 * - Multi-step application form handling
 * - Document upload with file validation
 * - Application status tracking
 * - Pet-specific application logic
 * - Data transformation for API compatibility
 */
export class ApplicationsService {
  private apiService: ApiService;
  private config: ApplicationsServiceConfig;
  private baseUrl = '/api/v1/applications';

  constructor(apiService?: ApiService, config: ApplicationsServiceConfig = {}) {
    this.apiService = apiService || new ApiService();
    this.config = {
      apiUrl: 'http://localhost:5000',
      debug: false,
      ...config,
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ApplicationsServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.apiUrl) {
      this.apiService.updateConfig({ apiUrl: config.apiUrl });
    }
  }

  /**
   * Submit a new adoption application
   */
  async submitApplication(applicationData: ApplicationData): Promise<Application> {
    try {
      const response = (await this.apiService.post(this.baseUrl, applicationData)) as {
        data: Application;
      };
      return response.data;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to submit application:', error);
      }
      throw error;
    }
  }

  /**
   * Update an existing application
   */
  async updateApplication(
    applicationId: string,
    applicationData: Partial<ApplicationData>
  ): Promise<Application> {
    try {
      const response = (await this.apiService.put(
        `${this.baseUrl}/${applicationId}`,
        applicationData
      )) as { data: Application };
      return response.data;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to update application:', error);
      }
      throw error;
    }
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId: string): Promise<Application> {
    try {
      const response = (await this.apiService.get(`${this.baseUrl}/${applicationId}`)) as unknown;

      // Handle different response formats
      let applicationData: Record<string, unknown>;
      if (response && typeof response === 'object' && 'data' in response) {
        applicationData = (response as { data: Record<string, unknown> }).data;
      } else {
        applicationData = response as Record<string, unknown>;
      }

      // Transform the response to match the frontend Application interface
      // The backend returns personalInfo, livingsituation, and petExperience at the root level
      // but the frontend expects them nested under a 'data' property
      const application: ApplicationWithPetInfo = {
        id: applicationData.id as string,
        petId: applicationData.petId as string,
        userId: applicationData.userId as string,
        rescueId: applicationData.rescueId as string,
        status: applicationData.status as ApplicationStatus,
        submittedAt: applicationData.submittedAt as string,
        reviewedAt: applicationData.reviewedAt as string,
        reviewedBy: applicationData.reviewedBy as string,
        reviewNotes: applicationData.reviewNotes as string,
        createdAt: applicationData.createdAt as string,
        updatedAt: applicationData.updatedAt as string,
        data: {
          petId: applicationData.petId as string,
          userId: applicationData.userId as string,
          rescueId: applicationData.rescueId as string,
          personalInfo: (applicationData.personalInfo as any) || {},
          livingsituation: (applicationData.livingsituation as any) || {},
          petExperience: (applicationData.petExperience as any) || {},
          references: (applicationData.references as any) || { personal: [] },
          additionalInfo: (applicationData.additionalInfo as any) || {},
        },
        documents:
          (applicationData.documents as Array<{
            id: string;
            type: string;
            filename: string;
            url: string;
            uploadedAt: string;
          }>) || [],
      };

      // Add pet information if available (backend already provides these)
      if (applicationData.petName) {
        application.petName = applicationData.petName as string;
        application.petType = applicationData.petType as string;
        application.petBreed = applicationData.petBreed as string;
      }

      return application;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get application:', error);
      }
      throw error;
    }
  }

  /**
   * Get user's applications
   */
  async getUserApplications(userId?: string): Promise<Application[]> {
    try {
      const queryParams = userId ? { user_id: userId } : {};
      const response = (await this.apiService.get(this.baseUrl, queryParams)) as {
        data?: { applications?: Application[] } | Application[];
      };

      // Handle nested response structure
      const applications =
        (response.data as { applications?: Application[] })?.applications ||
        (response.data as Application[]) ||
        [];
      return applications;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get user applications:', error);
      }
      throw error;
    }
  }

  /**
   * Get application by pet ID
   */
  async getApplicationByPetId(petId: string): Promise<Application | null> {
    try {
      const response = (await this.apiService.get(this.baseUrl, { pet_id: petId })) as {
        data: {
          success: boolean;
          data: {
            applications: Application[];
            total: number;
            page: number;
            totalPages: number;
          };
        };
      };

      // Extract applications from nested structure
      const applications = response?.data?.data?.applications || [];

      if (applications.length === 0) {
        return null;
      }

      // Return the first (most recent) application for this pet
      return applications[0];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get application by pet ID:', error);
      }
      return null;
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string
  ): Promise<Application> {
    try {
      const response = (await this.apiService.patch(`${this.baseUrl}/${id}/status`, {
        status,
        notes,
      })) as { data: Application };
      return response.data;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to update application status:', error);
      }
      throw error;
    }
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(id: string, reason?: string): Promise<void> {
    try {
      await this.apiService.put(`${this.baseUrl}/${id}/withdraw`, {
        reason,
      });
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to withdraw application:', error);
      }
      throw error;
    }
  }

  /**
   * Upload document for application
   */
  async uploadDocument(applicationId: string, file: File, type: string): Promise<DocumentUpload> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = (await this.apiService.post(
        `${this.baseUrl}/${applicationId}/documents`,
        formData
      )) as { data: DocumentUpload };
      return response.data;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to upload document:', error);
      }
      throw error;
    }
  }

  /**
   * Remove document from application
   */
  async removeDocument(applicationId: string, documentId: string): Promise<void> {
    try {
      await this.apiService.delete(`${this.baseUrl}/${applicationId}/documents/${documentId}`);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to remove document:', error);
      }
      throw error;
    }
  }

  /**
   * Get documents for application
   */
  async getDocuments(applicationId: string): Promise<Document[]> {
    try {
      const response = (await this.apiService.get(`${this.baseUrl}/${applicationId}/documents`)) as
        | { data?: Document[] }
        | Document[];

      return (response as { data?: Document[] }).data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get documents:', error);
      }
      throw error;
    }
  }

  /**
   * Get all applications for a rescue organization
   * For use in rescue management dashboard
   */
  async getRescueApplications(
    rescueId?: string,
    options?: {
      status?: ApplicationStatus;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Application[]> {
    try {
      const params = new URLSearchParams();

      if (rescueId) params.append('rescueId', rescueId);
      if (options?.status) params.append('status', options.status);
      if (options?.search) params.append('search', options.search);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const queryString = params.toString();
      const url = `${this.baseUrl}${queryString ? `?${queryString}` : ''}`;

      const response = await this.apiService.get<{
        success: boolean;
        data: Application[];
        meta: {
          total: number;
          page: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(url);

      if (this.config.debug) {
        console.log('Rescue applications retrieved:', response.data?.length || 0);
        console.log('Response meta:', response.meta);
      }

      // Return the applications array from the standardized response
      return response.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get rescue applications:', error);
      }
      throw error;
    }
  }

  /**
   * Get application statistics for rescue dashboard
   */
  async getApplicationStats(rescueId?: string): Promise<{
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    pendingReferences: number;
  }> {
    try {
      const params = rescueId ? `?rescueId=${rescueId}` : '';
      const response = await this.apiService.get<any>(`${this.baseUrl}/stats${params}`);

      return (
        response.data || {
          total: 0,
          submitted: 0,
          underReview: 0,
          approved: 0,
          rejected: 0,
          pendingReferences: 0,
        }
      );
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get application stats:', error);
      }
      throw error;
    }
  }
}

// Create and export singleton instance
export const applicationsService = new ApplicationsService();

