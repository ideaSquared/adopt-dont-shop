import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  ApplicationSchema,
  ApplicationWithPetInfoSchema,
  ApplicationFlatResponseSchema,
  ApplicationListResponseSchema,
  ApplicationByPetResponseSchema,
  RescueApplicationsResponseSchema,
  ApplicationStatsSchema,
  DocumentUploadSchema,
  DocumentsResponseSchema,
  type Application,
  type ApplicationData,
  type ApplicationStatus,
  type ApplicationWithPetInfo,
  type DocumentUpload,
  type Document,
  type ApplicationStats,
} from '../schemas';
import { type ApplicationsServiceConfig } from '../types';

export class ApplicationsService {
  private apiService: ApiService;
  private config: ApplicationsServiceConfig;
  private baseUrl = '/api/v1/applications';

  constructor(apiService?: ApiService, config: ApplicationsServiceConfig = {}) {
    this.apiService = apiService || new ApiService();
    this.config = {
      debug: false,
      ...config,
    };
  }

  updateConfig(config: Partial<ApplicationsServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.apiUrl) {
      this.apiService.updateConfig({ apiUrl: config.apiUrl });
    }
  }

  async submitApplication(applicationData: ApplicationData): Promise<Application> {
    try {
      const response = await this.apiService.post<{ data: unknown }>(
        this.baseUrl,
        applicationData
      );
      return ApplicationSchema.parse(response.data);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to submit application:', error);
      }
      throw error;
    }
  }

  async updateApplication(
    applicationId: string,
    applicationData: Partial<ApplicationData>
  ): Promise<Application> {
    try {
      const response = await this.apiService.put<{ data: unknown }>(
        `${this.baseUrl}/${applicationId}`,
        applicationData
      );
      return ApplicationSchema.parse(response.data);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to update application:', error);
      }
      throw error;
    }
  }

  async getApplicationById(applicationId: string): Promise<ApplicationWithPetInfo> {
    try {
      const response = await this.apiService.get<{ data: unknown }>(
        `${this.baseUrl}/${applicationId}`
      );
      // Backend returns a flat structure: personalInfo, livingsituation, petExperience
      // are at the root of the data object rather than nested under a `data` sub-key.
      const flat = ApplicationFlatResponseSchema.parse(response.data);

      const application: ApplicationWithPetInfo = ApplicationWithPetInfoSchema.parse({
        id: flat.id,
        petId: flat.petId,
        userId: flat.userId,
        rescueId: flat.rescueId,
        status: flat.status,
        submittedAt: flat.submittedAt,
        reviewedAt: flat.reviewedAt,
        reviewedBy: flat.reviewedBy,
        reviewNotes: flat.reviewNotes,
        createdAt: flat.createdAt,
        updatedAt: flat.updatedAt,
        documents: flat.documents,
        petName: flat.petName,
        petType: flat.petType,
        petBreed: flat.petBreed,
        data: {
          petId: flat.petId,
          userId: flat.userId,
          rescueId: flat.rescueId,
          personalInfo: flat.personalInfo ?? {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
          },
          livingsituation: flat.livingsituation ?? {
            housingType: 'house',
            isOwned: false,
            hasYard: false,
            allowsPets: false,
            householdSize: 0,
            hasAllergies: false,
          },
          petExperience: flat.petExperience ?? {
            hasPetsCurrently: false,
            experienceLevel: 'beginner',
            willingToTrain: false,
            hoursAloneDaily: 0,
            exercisePlans: '',
          },
          references: flat.references ?? { personal: [] },
          additionalInfo: flat.additionalInfo,
        },
      });

      return application;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get application:', error);
      }
      throw error;
    }
  }

  async getUserApplications(userId?: string): Promise<Application[]> {
    try {
      const queryParams = userId ? { user_id: userId } : {};
      const response = await this.apiService.get<unknown>(this.baseUrl, queryParams);
      const parsed = ApplicationListResponseSchema.parse(response);
      if (!parsed.data) return [];
      return Array.isArray(parsed.data) ? parsed.data : (parsed.data.applications ?? []);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get user applications:', error);
      }
      throw error;
    }
  }

  async getApplicationByPetId(petId: string): Promise<Application | null> {
    try {
      const response = await this.apiService.get<unknown>(this.baseUrl, { pet_id: petId });
      const parsed = ApplicationByPetResponseSchema.parse(response);
      const applications = parsed.data?.data?.applications ?? [];
      return applications.length > 0 ? applications[0] : null;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get application by pet ID:', error);
      }
      return null;
    }
  }

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string
  ): Promise<Application> {
    try {
      const response = await this.apiService.patch<{ data: unknown }>(
        `${this.baseUrl}/${id}/status`,
        { status, notes }
      );
      return ApplicationSchema.parse(response.data);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to update application status:', error);
      }
      throw error;
    }
  }

  async withdrawApplication(id: string, reason?: string): Promise<void> {
    try {
      await this.apiService.put(`${this.baseUrl}/${id}/withdraw`, { reason });
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to withdraw application:', error);
      }
      throw error;
    }
  }

  async uploadDocument(applicationId: string, file: File, type: string): Promise<DocumentUpload> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const response = await this.apiService.post<{ data: unknown }>(
        `${this.baseUrl}/${applicationId}/documents`,
        formData
      );
      return DocumentUploadSchema.parse(response.data);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to upload document:', error);
      }
      throw error;
    }
  }

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

  async getDocuments(applicationId: string): Promise<Document[]> {
    try {
      const response = await this.apiService.get<unknown>(
        `${this.baseUrl}/${applicationId}/documents`
      );
      const parsed = DocumentsResponseSchema.parse(response);
      return parsed.data ?? [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get documents:', error);
      }
      throw error;
    }
  }

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

      const response = await this.apiService.get<unknown>(url);
      const parsed = RescueApplicationsResponseSchema.parse(response);
      return parsed.data;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to get rescue applications:', error);
      }
      throw error;
    }
  }

  async getApplicationStats(rescueId?: string): Promise<ApplicationStats> {
    try {
      const params = rescueId ? `?rescueId=${rescueId}` : '';
      const response = await this.apiService.get<{ data: unknown }>(
        `${this.baseUrl}/stats${params}`
      );
      return ApplicationStatsSchema.parse(response.data ?? {});
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
