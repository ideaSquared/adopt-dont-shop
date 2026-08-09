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
  type?: string;
  rescueId?: string;
  page?: number;
  limit?: number;
};

export type BulkPetOperation = 'update_status' | 'archive' | 'feature' | 'delete';

export type BulkPetResult = {
  successCount: number;
  failedCount: number;
  errors: Array<{ petId: string; error: string }>;
};

// The gateway serves the snake_case pet view (pet_id / rescue_id, lowercase
// enum tokens); it does NOT include a rescue name. This is that wire shape.
type BackendPet = {
  pet_id: string;
  name: string;
  type?: string;
  breed?: string;
  status?: PetStatus;
  rescue_id?: string;
  rescueName?: string;
  archived?: boolean;
  featured?: boolean;
  created_at: string;
  updated_at: string;
};

type PetsPaginatedResponse = {
  success: boolean;
  data: BackendPet[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

// Map the snake_case pet view onto the camelCase AdminPet the admin UI reads.
// rescueName is left undefined — the list view does not currently provide it.
const toAdminPet = (p: BackendPet): AdminPet => ({
  petId: p.pet_id,
  name: p.name,
  type: p.type ?? '',
  breed: p.breed ?? '',
  status: p.status ?? 'not_available',
  rescueId: p.rescue_id ?? '',
  rescueName: p.rescueName,
  archived: p.archived ?? false,
  featured: p.featured ?? false,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

class PetService {
  private baseUrl = '/api/v1/pets';

  async getAll(filters: PetFilters = {}): Promise<{
    data: AdminPet[];
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
    if (filters.type) {
      params.type = filters.type;
    }
    if (filters.page) {
      params.page = String(filters.page);
    }
    const limit = filters.limit ?? 20;
    params.limit = String(limit);

    const response = await apiService.get<PetsPaginatedResponse>(this.baseUrl, params);
    return { data: response.data.map(toAdminPet), pagination: response.pagination };
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
