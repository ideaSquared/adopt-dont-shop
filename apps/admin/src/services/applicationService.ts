import { apiService } from './libraryServices';
import type { ApplicationStatus } from '@adopt-dont-shop/lib.types';
export type { ApplicationStatus } from '@adopt-dont-shop/lib.types';

export type AdminApplication = {
  applicationId: string;
  status: ApplicationStatus;
  petName: string;
  petType?: string;
  petId: string;
  rescueName: string;
  rescueId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationFilters = {
  status?: ApplicationStatus;
  rescueId?: string;
  page?: number;
  limit?: number;
};

export type BulkApplicationFailure = {
  applicationId: string;
  error: string;
};

// Mirrors the `data` body of PATCH /api/v1/applications/bulk-update. The
// gateway fans out per application, so a 200 can still carry per-item failures.
export type BulkApplicationResult = {
  successCount: number;
  failureCount: number;
  failures: BulkApplicationFailure[];
};

type BackendApplication = {
  id: string;
  status: ApplicationStatus;
  petId: string;
  petName?: string;
  petType?: string;
  rescueId: string;
  rescueName?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
};

type ApplicationsPaginatedResponse = {
  success: boolean;
  data: BackendApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

const toAdminApplication = (a: BackendApplication): AdminApplication => ({
  applicationId: a.id,
  status: a.status,
  petId: a.petId,
  petName: a.petName ?? '',
  petType: a.petType,
  rescueId: a.rescueId,
  rescueName: a.rescueName ?? '',
  applicantId: a.userId,
  applicantName: a.userName ?? '',
  applicantEmail: a.userEmail ?? '',
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

class ApplicationServiceClient {
  private baseUrl = '/api/v1/applications';

  async getAll(filters: ApplicationFilters = {}): Promise<{
    data: AdminApplication[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const params: Record<string, string> = {};
    if (filters.status) {
      params.status = filters.status;
    }
    // The list route reads the `rescue` query param (not `rescueId`).
    if (filters.rescueId) {
      params.rescue = filters.rescueId;
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

  async getById(applicationId: string): Promise<AdminApplication> {
    const response = await apiService.get<{ data: BackendApplication }>(
      `${this.baseUrl}/${applicationId}`
    );
    return toAdminApplication(response.data);
  }

  async bulkUpdate(
    applicationIds: string[],
    updates: { status?: ApplicationStatus; reviewNotes?: string },
    reason?: string
  ): Promise<BulkApplicationResult> {
    const response = await apiService.patch<{ data: BulkApplicationResult }>(
      `${this.baseUrl}/bulk-update`,
      { applicationIds, updates, reason }
    );

    return response.data;
  }
}

export const applicationService = new ApplicationServiceClient();
