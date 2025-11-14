import { ApiService, ApiResponse } from '@adopt-dont-shop/lib.api';
import { Pet, PetSearchFilters, PaginatedResponse, PetStats, PetsServiceConfig } from '../types';
import { PETS_ENDPOINTS } from '../constants/endpoints';

/**
 * Pet Service
 *
 * Provides pet browsing, search, filtering, and favorites management
 * capabilities. Handles data transformation between frontend and backend formats.
 *
 * Features:
 * - Advanced search with 15+ filter types
 * - Pet data transformation (snake_case ↔ camelCase)
 * - PostGIS location handling
 * - Favorites management with localStorage caching
 * - Pet reporting functionality
 * - Statistics and analytics
 */
export class PetsService {
  private apiService: ApiService;
  private config: PetsServiceConfig;

  constructor(apiService?: ApiService, config: PetsServiceConfig = {}) {
    this.apiService = apiService || new ApiService();
    this.config = {
      apiUrl: 'http://localhost:5000',
      debug: false,
      ...config,
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<PetsServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.apiUrl) {
      this.apiService.updateConfig({ apiUrl: config.apiUrl });
    }
  }

  /**
   * Search pets with filters and pagination
   */
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
      const response = await this.apiService.get<{
        success: boolean;
        data: Pet[];
        meta: {
          page: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(PETS_ENDPOINTS.PETS, apiFilters);

      // Transform according to the actual API response structure
      if (response.success && response.data && response.meta) {
        return {
          data: response.data,
          pagination: {
            page: response.meta.page || 1,
            limit: typeof apiFilters.limit === 'number' ? apiFilters.limit : 12,
            total: response.meta.total || 0,
            totalPages: response.meta.totalPages || 1,
            hasNext: response.meta.hasNext || false,
            hasPrev: response.meta.hasPrev || false,
          },
        };
      } else {
        if (this.config.debug) {
          console.error('Unexpected API response structure:', response);
        }
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
      if (this.config.debug) {
        console.error('Pet search failed:', error);
      }
      throw error;
    }
  }

  /**
   * Get a single pet by ID
   */
  async getPetById(id: string): Promise<Pet> {
    try {
      const response = await this.apiService.get<ApiResponse<Pet>>(PETS_ENDPOINTS.PET_BY_ID(id));

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch pet:', error);
      }
      throw error;
    }
  }

  /**
   * Get featured pets for home page
   */
  async getFeaturedPets(limit: number = 12): Promise<Pet[]> {
    try {
      const response = await this.apiService.get<ApiResponse<Pet[]>>(PETS_ENDPOINTS.FEATURED_PETS, {
        limit,
      });
      return response.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch featured pets:', error);
      }
      throw error;
    }
  }

  /**
   * Get recent pets
   */
  async getRecentPets(limit: number = 12): Promise<Pet[]> {
    try {
      const response = await this.apiService.get<ApiResponse<Pet[]>>(PETS_ENDPOINTS.RECENT_PETS, {
        limit,
      });
      return response.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch recent pets:', error);
      }
      throw error;
    }
  }

  /**
   * Get pets by rescue organization
   */
  async getPetsByRescue(rescueId: string, page: number = 1): Promise<PaginatedResponse<Pet>> {
    try {
      const response = await this.apiService.get<{
        success: boolean;
        data: Pet[];
        meta: {
          page: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(PETS_ENDPOINTS.PETS_BY_RESCUE(rescueId), {
        page,
        limit: 20,
      });

      return {
        data: response.data || [],
        pagination: {
          page: response.meta?.page || page,
          limit: 20,
          total: response.meta?.total || 0,
          totalPages: response.meta?.totalPages || 1,
          hasNext: response.meta?.hasNext || false,
          hasPrev: response.meta?.hasPrev || false,
        },
      };
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to fetch pets for rescue ${rescueId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Get pet breeds by type
   */
  async getPetBreeds(type?: string): Promise<string[]> {
    try {
      const endpoint = type ? PETS_ENDPOINTS.PET_BREEDS_BY_TYPE(type) : PETS_ENDPOINTS.PET_BREEDS;
      const response = await this.apiService.get<ApiResponse<string[]>>(endpoint);
      return response.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to fetch breeds for type ${type}:`, error);
      }
      throw error;
    }
  }

  /**
   * Get all available pet types
   */
  async getPetTypes(): Promise<string[]> {
    try {
      const response = await this.apiService.get<ApiResponse<string[]>>(PETS_ENDPOINTS.PET_TYPES);
      return response.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch pet types:', error);
      }
      throw error;
    }
  }

  /**
   * Add pet to favorites (requires authentication)
   */
  async addToFavorites(petId: string): Promise<void> {
    await this.apiService.post(PETS_ENDPOINTS.ADD_TO_FAVORITES(petId));
  }

  /**
   * Remove pet from favorites (requires authentication)
   */
  async removeFromFavorites(petId: string): Promise<void> {
    await this.apiService.delete(PETS_ENDPOINTS.REMOVE_FROM_FAVORITES(petId));
  }

  /**
   * Get user's favorite pets (requires authentication)
   */
  async getFavorites(): Promise<Pet[]> {
    try {
      interface BackendPetWithRescue extends Omit<Pet, 'rescue'> {
        Rescue?: {
          rescueId: string;
          name: string;
          city: string;
          state: string;
        };
      }

      const response = await this.apiService.get<
        ApiResponse<{
          pets: BackendPetWithRescue[];
          total: number;
          page: number;
          totalPages: number;
        }>
      >(PETS_ENDPOINTS.USER_FAVORITES);

      // Transform the response to match the Pet interface
      const pets = (response.data?.pets || []).map(
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
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch favorites:', error);
      }
      throw error;
    }
  }

  /**
   * Check if pet is in user's favorites (requires authentication)
   */
  async isFavorite(petId: string): Promise<boolean> {
    try {
      const result = await this.apiService.get<ApiResponse<{ isFavorite: boolean }>>(
        PETS_ENDPOINTS.FAVORITE_STATUS(petId)
      );
      return result.data?.isFavorite || false;
    } catch (error) {
      // Return false on error (likely not authenticated)
      return false;
    }
  }

  /**
   * Get similar pets
   */
  async getSimilarPets(petId: string, limit: number = 6): Promise<Pet[]> {
    try {
      const response = await this.apiService.get<ApiResponse<Pet[]>>(
        PETS_ENDPOINTS.SIMILAR_PETS(petId),
        {
          limit,
        }
      );
      return response.data || [];
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to fetch similar pets for ${petId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Report a pet
   */
  async reportPet(
    petId: string,
    reason: string,
    description?: string
  ): Promise<{ reportId: string; message: string }> {
    try {
      const response = await this.apiService.post<
        ApiResponse<{ reportId: string; message: string }>
      >(PETS_ENDPOINTS.REPORT_PET(petId), {
        reason,
        description,
      });
      return response.data || { reportId: '', message: 'Report submitted successfully' };
    } catch (error) {
      if (this.config.debug) {
        console.error(`Failed to report pet ${petId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Get pet statistics for analytics
   */
  async getPetStats(): Promise<PetStats> {
    try {
      const response = await this.apiService.get<ApiResponse<PetStats>>(
        PETS_ENDPOINTS.PET_STATISTICS
      );
      return response.data!;
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch pet statistics:', error);
      }
      throw error;
    }
  }
}

// Create and export singleton instance
export const petsService = new PetsService();
