import { apiService } from './libraryServices';

export type PetStatus = 'available' | 'adopted' | 'foster' | 'not_available';

export type AdminPet = {
  petId: string;
  name: string;
  type: string;
  breed: string;
  status: PetStatus;
  rescueId: string;
  rescueName?: string;
  archived: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PetFilters = {
  search?: string;
  status?: PetStatus;
  rescueId?: string;
  archived?: boolean;
  page?: number;
  limit?: number;
};

export type BulkPetOperation = 'update_status' | 'archive' | 'feature' | 'delete';

export type BulkPetResult = {
  successCount: number;
  failedCount: number;
  errors: Array<{ petId: string; error: string }>;
};

type PaginatedPetsResponse = {
  success: boolean;
  data: AdminPet[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

class PetService {
  private baseUrl = '/api/v1/pets';

  async getAll(
    filters: PetFilters = {}
  ): Promise<{ data: AdminPet[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.rescueId) params.rescueId = filters.rescueId;
    if (filters.archived !== undefined) params.archived = String(filters.archived);
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await apiService.get<PaginatedPetsResponse>(this.baseUrl, params);
    return { data: response.data, pagination: response.pagination };
  }

  async bulkUpdate(
    petIds: string[],
    operation: BulkPetOperation,
    data?: Record<string, unknown>,
    reason?: string
  ): Promise<BulkPetResult> {
    const response = await apiService.post<{
      success: boolean;
      message: string;
      data: BulkPetResult;
    }>(`${this.baseUrl}/bulk-update`, { petIds, operation, data, reason });

    if (!response.success) {
      throw new Error(response.message || 'Failed to bulk update pets');
    }

    return response.data;
  }
}

export const petService = new PetService();
