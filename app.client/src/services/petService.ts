import { ApiResponse, PaginatedResponse, Pet, PetSearchFilters } from '@/types';
import { apiService } from './api';

class PetService {
  // Search pets with filters and pagination
  async searchPets(filters: PetSearchFilters = {}): Promise<PaginatedResponse<Pet>> {
    // Map frontend filter format to backend API format
    const apiFilters: Record<string, string | number | boolean | undefined> = {};

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
        created_at: 'created_at',
        adoptionFee: 'adoption_fee',
        adoption_fee: 'adoption_fee',
        age: 'age_years',
        age_years: 'age_years',
        name: 'name',
      };
      apiFilters.sortBy = sortByMapping[filters.sortBy] || filters.sortBy;
    }

    // Map filter field names to backend format
    if (filters.ageGroup) {
      apiFilters.age_group = filters.ageGroup;
      delete apiFilters.ageGroup;
    }

    // Use 'search' parameter for general text search instead of 'breed'
    if (filters.breed && !filters.search) {
      apiFilters.search = filters.breed;
      delete apiFilters.breed;
    }

    try {
      // Call the API directly without transformations to debug
      console.log('Calling API with filters:', apiFilters);

      // Build URL with query parameters
      const searchParams = new URLSearchParams();
      Object.entries(apiFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const url = `/api/v1/pets?${searchParams.toString()}`;
      console.log('Full URL:', url);

      // Make direct fetch to avoid API service transformations
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      console.log('Raw API response:', rawData);

      // Transform according to the actual API response structure
      if (rawData.success && rawData.data && rawData.meta) {
        return {
          data: rawData.data,
          pagination: {
            page: rawData.meta.page || 1,
            limit: typeof apiFilters.limit === 'number' ? apiFilters.limit : 12,
            total: rawData.meta.total || 0,
            totalPages: rawData.meta.totalPages || 1,
            hasNext: rawData.meta.hasNext || false,
            hasPrev: rawData.meta.hasPrev || false,
          },
        };
      } else {
        console.error('Unexpected API response structure:', rawData);
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
  // Get a single pet by ID
  async getPet(petId: string): Promise<Pet> {
    try {
      // Make direct fetch to avoid API service transformations that might be causing issues
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/pets/${petId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      console.log('Raw pet API response:', rawData);

      // Handle the API response structure
      if (rawData.success && rawData.data) {
        return rawData.data;
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error('Failed to fetch pet:', error);
      throw error;
    }
  }

  // Get featured/recommended pets for home page
  async getFeaturedPets(limit: number = 12): Promise<Pet[]> {
    const response = await apiService.get<ApiResponse<Pet[]>>('/api/v1/pets/featured', { limit });
    return response.data || [];
  }

  // Get recent pets
  async getRecentPets(limit: number = 12): Promise<Pet[]> {
    try {
      const response = await apiService.get<ApiResponse<Pet[]>>('/api/v1/pets/recent', { limit });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch recent pets:', error);
      throw error;
    }
  }

  // Get pet breeds by type
  async getPetBreedsByType(type: string): Promise<string[]> {
    try {
      const response = await apiService.get<ApiResponse<string[]>>(`/api/v1/pets/breeds/${type}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch breeds for type ${type}:`, error);
      throw error;
    }
  }

  // Get all available pet types
  async getPetTypes(): Promise<string[]> {
    try {
      const response = await apiService.get<ApiResponse<string[]>>('/api/v1/pets/types');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch pet types:', error);
      throw error;
    }
  }

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
    interface BackendPetWithRescue extends Omit<Pet, 'rescue'> {
      Rescue?: {
        rescueId: string;
        name: string;
        city: string;
        state: string;
      };
    }

    const response = await apiService.get<{
      pets: BackendPetWithRescue[];
      total: number;
      page: number;
      totalPages: number;
    }>('/api/v1/pets/favorites/user');

    // Transform the response to match the Pet interface
    const pets = (response.pets || []).map(
      (pet: BackendPetWithRescue): Pet => ({
        ...pet,
        // Transform Rescue object to rescue format expected by frontend
        rescue: pet.Rescue
          ? {
              name: pet.Rescue.name,
              location: `${pet.Rescue.city}, ${pet.Rescue.state}`,
            }
          : undefined,
      })
    );

    return pets;
  }
  // Check if pet is in user's favorites (requires authentication)
  async isFavorite(petId: string): Promise<boolean> {
    try {
      // In dev mode with dev token, return false to avoid auth issues
      if (import.meta.env.DEV) {
        const token = localStorage.getItem('accessToken');
        if (token?.startsWith('dev-token-')) {
          return false; // Dev users don't have favorites yet
        }
      }

      const result = await apiService.get<ApiResponse<{ isFavorite: boolean }>>(
        `/api/v1/pets/${petId}/favorite/status`
      );
      return result.data?.isFavorite || false;
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
    const response = await apiService.get<ApiResponse<Pet[]>>(`/api/v1/pets/rescue/${rescueId}`, {
      page,
      limit,
    });

    // Transform response to match expected format
    return {
      data: response.data || [],
      pagination: {
        page: response.meta?.page || page,
        limit,
        total: response.meta?.total || 0,
        totalPages: response.meta?.totalPages || 1,
        hasNext: response.meta?.hasNext || false,
        hasPrev: response.meta?.hasPrev || false,
      },
    };
  }

  // Get similar pets
  async getSimilarPets(petId: string, limit: number = 6): Promise<Pet[]> {
    try {
      const response = await apiService.get<ApiResponse<Pet[]>>(`/api/v1/pets/${petId}/similar`, {
        limit,
      });
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch similar pets for ${petId}:`, error);
      throw error;
    }
  }

  // Report a pet
  async reportPet(
    petId: string,
    reason: string,
    description?: string
  ): Promise<{ reportId: string; message: string }> {
    try {
      const response = await apiService.post<ApiResponse<{ reportId: string; message: string }>>(
        `/api/v1/pets/${petId}/report`,
        {
          reason,
          description,
        }
      );
      return response.data || { reportId: '', message: 'Report submitted successfully' };
    } catch (error) {
      console.error(`Failed to report pet ${petId}:`, error);
      throw error;
    }
  }

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
