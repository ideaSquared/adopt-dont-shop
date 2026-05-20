import { apiService } from './libraryServices';

export type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn';

export type AdminApplication = {
  applicationId: string;
  status: ApplicationStatus;
  petName: string;
  petType?: string;
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
  petType?: string;
  page?: number;
  limit?: number;
};

export type BulkApplicationResult = {
  successCount: number;
  failureCount: number;
  failures: Array<{ applicationId: string; error: string }>;
};

type BackendApplication = {
  id: string;
  status: ApplicationStatus;
  petId: string;
  petName?: string;
  petType?: string;
  rescueId: string;
  rescueName?: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
};

type ApplicationsPaginatedResponse = {
  success: boolean;
  data: BackendApplication[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

const toAdminApplication = (a: BackendApplication): AdminApplication => ({
  applicationId: a.id,
  status: a.status,
  petId: a.petId,
  petName: a.petName ?? '',
  petType: a.petType,
  rescueId: a.rescueId,
  rescueName: a.rescueName ?? '',
  applicantName: a.userName ?? '',
  applicantEmail: a.userEmail ?? '',
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

class ApplicationServiceClient {
  private baseUrl = '/api/v1/applications';

  async getAll(filters: ApplicationFilters = {}): Promise<{
    data: AdminApplication[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const params: Record<string, string> = {};
    if (filters.search) {
      params.search = filters.search;
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.rescueId) {
      params.rescueId = filters.rescueId;
    }
    if (filters.petType) {
      params.petType = filters.petType;
    }
    if (filters.page) {
      params.page = String(filters.page);
    }
    const limit = filters.limit ?? 20;
    params.limit = String(limit);

    const response = await apiService.get<ApplicationsPaginatedResponse>(this.baseUrl, params);
    return {
      data: response.data.map(toAdminApplication),
      pagination: response.pagination,
    };
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
