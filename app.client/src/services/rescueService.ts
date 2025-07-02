import { PaginatedResponse, Pet, Rescue } from '@/types';
import { apiService } from './api';

// Transform rescue data from API format
const transformRescueFromAPI = (rescue: any): Rescue => {
  if (!rescue) return rescue;

  return {
    ...rescue,
    rescueId: rescue.rescue_id || rescue.rescueId,
    createdAt: rescue.created_at || rescue.createdAt,
    updatedAt: rescue.updated_at || rescue.updatedAt,
  };
};

class RescueService {
  // Get a single rescue by ID
  async getRescue(rescueId: string): Promise<Rescue> {
    const response = await apiService.get<Rescue>(`/rescues/${rescueId}`);
    return transformRescueFromAPI(response);
  }

  // Get pets by rescue ID
  async getPetsByRescue(
    rescueId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Pet>> {
    // The pets will be automatically transformed by apiService
    return await apiService.get<PaginatedResponse<Pet>>(`/pets/rescue/${rescueId}`, {
      page,
      limit,
    });
  }

  // Search rescues with filters
  async searchRescues(
    filters: {
      search?: string;
      type?: 'individual' | 'organization';
      location?: string;
      verified?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<Rescue>> {
    const response = await apiService.get<PaginatedResponse<any>>('/rescues', filters);

    // Transform rescue data
    return {
      ...response,
      data: response.data.map(transformRescueFromAPI),
    };
  }

  // Get featured rescues
  async getFeaturedRescues(limit: number = 10): Promise<Rescue[]> {
    const response = await apiService.get<Rescue[]>('/rescues/featured', { limit });
    return Array.isArray(response) ? response.map(transformRescueFromAPI) : [];
  }
}

export const rescueService = new RescueService();
