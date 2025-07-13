import { Application, ApplicationData, ApplicationStatus } from '@/types';
import { api } from './api';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

// Extended interface for applications with pet info
interface ApplicationWithPetInfo extends Application {
  petName?: string;
  petType?: string;
  petBreed?: string;
}

interface ApplicationSubmission {
  pet_id: string;
  answers: {
    personal_info: Record<string, unknown>;
    living_situation: Record<string, unknown>;
    pet_experience: Record<string, unknown>;
    additional_info: Record<string, unknown>;
  };
  references?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  priority?: string;
}

export class ApplicationService {
  private baseUrl = '/api/v1/applications';

  async submitApplication(applicationData: ApplicationSubmission): Promise<Application> {
    const response = await api.post<ApiResponse<Application>>(`${this.baseUrl}`, applicationData);
    return response.data;
  }

  async updateApplication(
    applicationId: string,
    applicationData: Partial<ApplicationData>
  ): Promise<Application> {
    const response = await api.put<ApiResponse<Application>>(
      `${this.baseUrl}/${applicationId}`,
      applicationData
    );
    return response.data;
  }

  async getApplicationById(applicationId: string): Promise<Application> {
    const response = await api.get<{
      success: boolean;
      data: Record<string, unknown>;
    }>(`${this.baseUrl}/${applicationId}`);

    // Handle different response formats
    let applicationData: Record<string, unknown>;
    if (response && typeof response === 'object' && 'data' in response) {
      // Nested data response
      applicationData = response.data as Record<string, unknown>;
    } else {
      // Direct response
      applicationData = response as Record<string, unknown>;
    }

    // Transform the response to match the frontend Application interface
    const application: ApplicationWithPetInfo = {
      id: applicationData.application_id as string,
      petId: applicationData.pet_id as string,
      userId: applicationData.user_id as string,
      rescueId: applicationData.rescue_id as string,
      status: applicationData.status as ApplicationStatus,
      submittedAt: applicationData.submitted_at as string,
      reviewedAt: applicationData.reviewed_at as string,
      reviewedBy: applicationData.actioned_by as string,
      reviewNotes: applicationData.notes as string,
      createdAt: applicationData.created_at as string,
      updatedAt: applicationData.updated_at as string,
      data: {
        answers: (applicationData.answers as Record<string, unknown>) || {},
        references: {
          personal: (applicationData.references as unknown[]) || [],
        },
        documents: (applicationData.documents as unknown[]) || [],
      } as unknown as ApplicationData,
      documents: [],
    };

    // Add pet information if available
    const petData = applicationData.Pet as Record<string, unknown> | undefined;
    if (petData) {
      application.petName = petData.name as string;
      application.petType = petData.type as string;
      application.petBreed = petData.breed as string;
    }

    return application;
  }

  async getApplicationByPetId(petId: string): Promise<Application | null> {
    try {
      // Use query parameter to filter applications by pet
      const response = await api.get<{
        success: boolean;
        data: Application[];
        pagination?: unknown;
        filters_applied?: unknown;
        total_filtered?: number;
      }>(this.baseUrl, { pet_id: petId });

      // Handle the nested response structure from the backend
      const responseData = response as unknown as {
        data: {
          success: boolean;
          data: Application[];
          pagination?: unknown;
          filters_applied?: unknown;
          total_filtered?: number;
        };
      };

      const applications = responseData.data?.data || [];

      // Return the first application found for this pet (there should typically be only one per user)
      return applications.length > 0 ? applications[0] : null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getUserApplications(userId?: string): Promise<Application[]> {
    try {
      // Use query parameter to filter applications by user
      const params = userId ? { user_id: userId } : {};

      const response = await api.get<{
        success: boolean;
        data: Record<string, unknown>[];
        pagination?: unknown;
        filters_applied?: unknown;
        total_filtered?: number;
      }>(this.baseUrl, params);

      // Handle different response formats - sometimes the API returns the data directly,
      // sometimes it's nested in a data property
      let applicationsData: Record<string, unknown>[] = [];
      if (Array.isArray(response)) {
        // Direct array response
        applicationsData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        // Nested data response
        applicationsData = response.data;
      } else {
        applicationsData = [];
      }

      // Transform the response to match the frontend Application interface
      const applications: ApplicationWithPetInfo[] = applicationsData.map(app => {
        const baseApplication: ApplicationWithPetInfo = {
          id: app.application_id as string,
          petId: app.pet_id as string,
          userId: app.user_id as string,
          rescueId: app.rescue_id as string,
          status: app.status as ApplicationStatus,
          submittedAt: app.submitted_at as string,
          reviewedAt: app.reviewed_at as string,
          reviewedBy: app.actioned_by as string,
          reviewNotes: app.notes as string,
          createdAt: app.created_at as string,
          updatedAt: app.updated_at as string,
          data: {} as ApplicationData, // Simplified for now
          documents: [],
        };

        // Add pet info if available
        if (app.Pet) {
          const pet = app.Pet as Record<string, unknown>;
          baseApplication.petName = pet.name as string;
          baseApplication.petType = pet.type as string;
          baseApplication.petBreed = pet.breed as string;
        }

        return baseApplication;
      });

      return applications;
    } catch (error) {
      console.error('Failed to get user applications:', error);
      throw error;
    }
  }

  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    notes?: string
  ): Promise<Application> {
    const response = await api.patch<ApiResponse<Application>>(
      `${this.baseUrl}/${applicationId}/status`,
      {
        status,
        notes,
      }
    );
    return response.data;
  }

  async withdrawApplication(applicationId: string, reason?: string): Promise<Application> {
    const response = await api.post<ApiResponse<Application>>(
      `${this.baseUrl}/${applicationId}/withdraw`,
      { reason }
    );
    return response.data;
  }

  async uploadDocument(
    applicationId: string,
    file: File,
    documentType: string
  ): Promise<{ url: string; documentId: string }> {
    const response = await api.uploadFile<ApiResponse<{ url: string; documentId: string }>>(
      `${this.baseUrl}/${applicationId}/documents`,
      file,
      { documentType }
    );
    return response.data;
  }

  async deleteDocument(applicationId: string, documentId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${applicationId}/documents/${documentId}`);
  }

  async getApplicationDocuments(applicationId: string): Promise<
    Array<{
      documentId: string;
      documentType: string;
      filename: string;
      url: string;
      uploadedAt: string;
    }>
  > {
    const response = await api.get<
      ApiResponse<
        Array<{
          documentId: string;
          documentType: string;
          filename: string;
          url: string;
          uploadedAt: string;
        }>
      >
    >(`${this.baseUrl}/${applicationId}/documents`);
    return response.data;
  }

  async searchApplications(filters: {
    status?: ApplicationStatus;
    rescueId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    applications: Application[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get<
      ApiResponse<{
        applications: Application[];
        total: number;
        page: number;
        totalPages: number;
      }>
    >(`${this.baseUrl}/search?${params.toString()}`);
    return response.data;
  }
}

export const applicationService = new ApplicationService();
