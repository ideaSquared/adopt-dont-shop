import { apiService } from './libraryServices';

export type FosterPlacementStatus = 'active' | 'completed' | 'cancelled';

export type FosterPlacement = {
  placementId: string;
  petId: string;
  fosterUserId: string;
  rescueId: string;
  startDate: string;
  endDate: string | null;
  status: FosterPlacementStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlacementInput = {
  petId: string;
  fosterUserId: string;
  rescueId: string;
  startDate: string;
  notes?: string;
};

export type EndPlacementInput = {
  outcome: 'return_to_rescue' | 'adopted_by_foster' | 'cancelled';
  endDate?: string;
  notes?: string;
};

class FosterServiceClient {
  async list(filter: { status?: FosterPlacementStatus } = {}): Promise<FosterPlacement[]> {
    const params = filter.status ? { status: filter.status } : undefined;
    const response = await apiService.get<{ data: FosterPlacement[] }>(
      '/api/v1/foster/placements',
      params
    );
    return response.data;
  }

  async create(input: CreatePlacementInput): Promise<FosterPlacement> {
    const response = await apiService.post<{ data: FosterPlacement }>(
      '/api/v1/foster/placements',
      input
    );
    return response.data;
  }

  async end(placementId: string, input: EndPlacementInput): Promise<FosterPlacement> {
    const response = await apiService.post<{ data: FosterPlacement }>(
      `/api/v1/foster/placements/${placementId}/end`,
      input
    );
    return response.data;
  }
}

export const fosterService = new FosterServiceClient();
export default fosterService;
