import { PaginatedResponse, Pet, PetSearchFilters } from '@/types';
import { apiService } from './api';

class PetService {
  // Search pets with filters and pagination
  async searchPets(filters: PetSearchFilters = {}): Promise<PaginatedResponse<Pet>> {
    // Map frontend filter format to backend API format
    const apiFilters: Record<string, any> = {};

    // Only include non-empty values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        apiFilters[key] = value;
      }
    });

    // Map age range to backend format
    if (filters.age?.min !== undefined) {
      apiFilters.ageMin = filters.age.min;
      delete apiFilters.age;
    }
    if (filters.age?.max !== undefined) {
      apiFilters.ageMax = filters.age.max;
      delete apiFilters.age;
    }

    // Map sort order to backend format (uppercase)
    if (filters.sortOrder) {
      apiFilters.sortOrder = filters.sortOrder.toUpperCase();
    }

    // Map sortBy field names to backend format
    if (filters.sortBy) {
      const sortByMapping: Record<string, string> = {
        createdAt: 'created_at',
        adoptionFee: 'adoption_fee',
        age: 'age_years',
      };
      apiFilters.sortBy = sortByMapping[filters.sortBy] || filters.sortBy;
    }

    // Use 'search' parameter for general text search instead of 'breed'
    if (filters.breed && !filters.search) {
      apiFilters.search = filters.breed;
      delete apiFilters.breed;
    }

    return await apiService.get<PaginatedResponse<Pet>>('/api/v1/pets', apiFilters);
  }

  // Get a single pet by ID
  async getPet(petId: string): Promise<Pet> {
    return await apiService.get<Pet>(`/api/v1/pets/${petId}`);
  }

  // Get featured/recommended pets for home page
  async getFeaturedPets(limit: number = 12): Promise<Pet[]> {
    return await apiService.get<Pet[]>('/api/v1/pets/featured', { limit });
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
    await apiService.post(`/api/v1/pets/${petId}/favorite`);
  }

  // Remove pet from favorites (requires authentication)
  async removeFromFavorites(petId: string): Promise<void> {
    await apiService.delete(`/api/v1/pets/${petId}/favorite`);
  }

  // Get user's favorite pets (requires authentication)
  async getFavorites(): Promise<Pet[]> {
    return await apiService.get<Pet[]>('/api/v1/pets/favorites/user');
  }

  // Check if pet is in user's favorites (requires authentication)
  async isFavorite(petId: string): Promise<boolean> {
    try {
      const result = await apiService.get<{ isFavorite: boolean }>(
        `/api/v1/pets/${petId}/favorite/status`
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
    return await apiService.get<PaginatedResponse<Pet>>(`/api/v1/pets/rescue/${rescueId}`, {
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
    return await apiService.get('/api/v1/pets/statistics');
  }
}

export const petService = new PetService();
