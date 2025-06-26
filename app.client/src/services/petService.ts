import { PaginatedResponse, Pet, PetSearchFilters } from '@/types';
import { apiService } from './api';

class PetService {
  // Search pets with filters and pagination
  async searchPets(filters: PetSearchFilters = {}): Promise<PaginatedResponse<Pet>> {
    return await apiService.get<PaginatedResponse<Pet>>('/v1/pets', filters);
  }

  // Get a single pet by ID
  async getPet(petId: string): Promise<Pet> {
    return await apiService.get<Pet>(`/v1/pets/${petId}`);
  }

  // Get featured/recommended pets for home page
  async getFeaturedPets(limit: number = 12): Promise<Pet[]> {
    return await apiService.get<Pet[]>('/v1/pets/featured', { limit });
  }

  // Get recent pets - TODO: Implement backend endpoint
  // async getRecentPets(limit: number = 12): Promise<Pet[]> {
  //   return await apiService.get<Pet[]>('/v1/pets/recent', { limit });
  // }

  // Get pet breeds by type - TODO: Implement backend endpoint
  // async getBreedsForType(type: string): Promise<string[]> {
  //   return await apiService.get<string[]>(`/v1/pets/breeds/${type}`);
  // }

  // Get all available pet types - TODO: Implement backend endpoint
  // async getPetTypes(): Promise<string[]> {
  //   return await apiService.get<string[]>('/v1/pets/types');
  // }

  // Add pet to favorites (requires authentication)
  async addToFavorites(petId: string): Promise<void> {
    await apiService.post(`/v1/pets/${petId}/favorite`);
  }

  // Remove pet from favorites (requires authentication)
  async removeFromFavorites(petId: string): Promise<void> {
    await apiService.delete(`/v1/pets/${petId}/favorite`);
  }

  // Get user's favorite pets (requires authentication)
  async getFavorites(): Promise<Pet[]> {
    return await apiService.get<Pet[]>('/v1/pets/favorites/user');
  }

  // Check if pet is in user's favorites (requires authentication)
  async isFavorite(petId: string): Promise<boolean> {
    try {
      const result = await apiService.get<{ isFavorite: boolean }>(
        `/v1/pets/${petId}/favorite/status`
      );
      return result.isFavorite;
    } catch (error) {
      return false;
    }
  }

  // Get pets by rescue organization
  async getPetsByRescue(
    rescueId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Pet>> {
    return await apiService.get<PaginatedResponse<Pet>>(`/v1/pets/rescue/${rescueId}`, {
      page,
      limit,
    });
  }

  // Get similar pets - TODO: Implement backend endpoint
  // async getSimilarPets(petId: string, limit: number = 6): Promise<Pet[]> {
  //   return await apiService.get<Pet[]>(`/v1/pets/${petId}/similar`, { limit });
  // }

  // Report a pet - TODO: Implement backend endpoint
  // async reportPet(petId: string, reason: string, description?: string): Promise<void> {
  //   await apiService.post(`/v1/pets/${petId}/report`, {
  //     reason,
  //     description,
  //   });
  // }

  // Get pet statistics for analytics
  async getPetStats(): Promise<{
    totalPets: number;
    availablePets: number;
    adoptedPets: number;
    fosterPets: number;
    featuredPets: number;
    specialNeedsPets: number;
    petsByType: Record<string, number>;
    petsByStatus: Record<string, number>;
    petsBySize: Record<string, number>;
    petsByAgeGroup: Record<string, number>;
    averageAdoptionTime: number;
    monthlyAdoptions: Array<{
      month: string;
      year: number;
      adoptions: number;
      newIntakes: number;
    }>;
    popularBreeds: Array<{
      breed: string;
      count: number;
      percentage: number;
    }>;
  }> {
    return await apiService.get('/v1/pets/statistics');
  }
}

export const petService = new PetService();
