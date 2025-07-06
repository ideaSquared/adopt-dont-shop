import { Application, ApplicationData, ApplicationStatus } from '@/types';
import { api } from './api';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

export class ApplicationService {
  private baseUrl = '/api/applications';

  async submitApplication(applicationData: ApplicationData): Promise<Application> {
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
    const response = await api.get<ApiResponse<Application>>(`${this.baseUrl}/${applicationId}`);
    return response.data;
  }

  async getApplicationByPetId(petId: string): Promise<Application | null> {
    try {
      // In dev mode with dev token, return null (no existing applications)
      if (import.meta.env.DEV) {
        const token = localStorage.getItem('accessToken');
        if (token?.startsWith('dev-token-')) {
          return null; // Dev users don't have existing applications yet
        }
      }

      const response = await api.get<ApiResponse<Application>>(`${this.baseUrl}/pet/${petId}`);
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getUserApplications(userId?: string): Promise<Application[]> {
    const url = userId ? `${this.baseUrl}/user/${userId}` : `${this.baseUrl}/user`;
    const response = await api.get<ApiResponse<Application[]>>(url);
    return response.data;
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

  async withdrawApplication(applicationId: string, reason?: string): Promise<void> {
    await api.patch(`${this.baseUrl}/${applicationId}/withdraw`, {
      reason,
    });
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
