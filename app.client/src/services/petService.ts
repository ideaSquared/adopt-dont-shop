import { PaginatedResponse, Pet, PetSearchFilters } from '@/types';
import { apiService } from './api';

class PetService {
  // Search pets with filters and pagination
  async searchPets(filters: PetSearchFilters = {}): Promise<PaginatedResponse<Pet>> {
    return await apiService.get<PaginatedResponse<Pet>>('/pets/search', filters);
  }

  // Get a single pet by ID
  async getPet(petId: string): Promise<Pet> {
    return await apiService.get<Pet>(`/pets/${petId}`);
  }

  // Get featured/recommended pets for home page
  async getFeaturedPets(limit: number = 12): Promise<Pet[]> {
    return await apiService.get<Pet[]>('/pets/featured', { limit });
  }

  // Get recent pets
  async getRecentPets(limit: number = 12): Promise<Pet[]> {
    return await apiService.get<Pet[]>('/pets/recent', { limit });
  }

  // Get pet breeds by type
  async getBreedsForType(type: string): Promise<string[]> {
    return await apiService.get<string[]>(`/pets/breeds/${type}`);
  }

  // Get all available pet types
  async getPetTypes(): Promise<string[]> {
    return await apiService.get<string[]>('/pets/types');
  }

  // Add pet to favorites (requires authentication)
  async addToFavorites(petId: string): Promise<void> {
    await apiService.post(`/pets/${petId}/favorite`);
  }

  // Remove pet from favorites (requires authentication)
  async removeFromFavorites(petId: string): Promise<void> {
    await apiService.delete(`/pets/${petId}/favorite`);
  }

  // Get user's favorite pets (requires authentication)
  async getFavorites(): Promise<Pet[]> {
    return await apiService.get<Pet[]>('/pets/favorites');
  }

  // Check if pet is in user's favorites (requires authentication)
  async isFavorite(petId: string): Promise<boolean> {
    try {
      const result = await apiService.get<{ isFavorite: boolean }>(`/pets/${petId}/favorite/check`);
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
    return await apiService.get<PaginatedResponse<Pet>>(`/pets/rescue/${rescueId}`, {
      page,
      limit,
    });
  }

  // Get similar pets (based on type, breed, size, etc.)
  async getSimilarPets(petId: string, limit: number = 6): Promise<Pet[]> {
    return await apiService.get<Pet[]>(`/pets/${petId}/similar`, { limit });
  }

  // Report a pet (for inappropriate content, etc.)
  async reportPet(petId: string, reason: string, description?: string): Promise<void> {
    await apiService.post(`/pets/${petId}/report`, {
      reason,
      description,
    });
  }

  // Get pet statistics for analytics
  async getPetStats(): Promise<{
    totalPets: number;
    availablePets: number;
    adoptedPets: number;
    petsByType: Record<string, number>;
  }> {
    return await apiService.get('/pets/stats');
  }
}

export const petService = new PetService();
