import { apiService } from './libraryServices';

export type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn';

export type AdminApplication = {
  applicationId: string;
  status: ApplicationStatus;
  petName: string;
  petId: string;
  rescueName: string;
  rescueId: string;
  applicantName: string;
  applicantEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationFilters = {
  search?: string;
  status?: ApplicationStatus;
  rescueId?: string;
  page?: number;
  limit?: number;
};

export type BulkApplicationResult = {
  successCount: number;
  failureCount: number;
  failures: Array<{ applicationId: string; error: string }>;
};

type PaginatedApplicationsResponse = {
  success: boolean;
  data: AdminApplication[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

class ApplicationServiceClient {
  private baseUrl = '/api/v1/applications';

  async getAll(
    filters: ApplicationFilters = {}
  ): Promise<{ data: AdminApplication[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.rescueId) params.rescueId = filters.rescueId;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await apiService.get<PaginatedApplicationsResponse>(this.baseUrl, params);
    return { data: response.data, pagination: response.pagination };
  }

  async bulkUpdate(
    applicationIds: string[],
    updates: { status?: ApplicationStatus; reviewNotes?: string },
    reason?: string
  ): Promise<BulkApplicationResult> {
    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: BulkApplicationResult;
    }>(`${this.baseUrl}/bulk-update`, { applicationIds, updates, reason });

    if (!response.success) {
      throw new Error(response.message || 'Failed to bulk update applications');
    }

    return response.data;
  }
}

export const applicationService = new ApplicationServiceClient();
