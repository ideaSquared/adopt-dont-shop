import { z } from 'zod';
import { ApiService, ApiResponse } from '@adopt-dont-shop/lib.api';
import { Pet, PetSearchFilters, PaginatedResponse, PetsServiceConfig } from '../types';
import { PetSchema, PetStatsSchema, type PetStats } from '../schemas';
import { PETS_ENDPOINTS } from '../constants/endpoints';

const camelToSnake = (key: string): string => key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);

/**
 * Strict camelCase → snake_case rename + Zod validation for an inbound
 * pet payload. Two pre-processing steps before `PetSchema.parse`:
 *
 *   1. Drop entries whose value is `null` — Sequelize emits `null` for
 *      every `allowNull: true` column on the model (location, breed,
 *      adoption_fee, …) but `.optional()` in Zod v3 only accepts
 *      `undefined`, so a null would otherwise blow up the parse and the
 *      caller would see `searchPets` reject the whole list. Stripping
 *      nulls turns each absent column back into the schema's "field
 *      omitted" branch.
 *
 *   2. Rename keys to snake_case so the rest of the codebase can keep
 *      its `pet.pet_id` / `pet.age_years` shape regardless of which
 *      casing the API chose.
 */
const normalisePet = (raw: unknown): Pet => {
  const rawRecord = z.record(z.string(), z.unknown()).parse(raw);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawRecord)) {
    if (value === null) {
      continue;
    }
    result[camelToSnake(key)] = value;
  }
  return PetSchema.parse(result);
};

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

    // Only include non-empty primitive values (objects like age are handled separately below)
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && typeof value !== 'object') {
        apiFilters[key] = value as string | number | boolean;
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

    // Map sortBy field names to backend camelCase format
    if (filters.sortBy) {
      const sortByMapping: Record<string, string> = {
        createdAt: 'createdAt',
        created_at: 'createdAt',
        adoptionFee: 'adoptionFeeMinor',
        adoption_fee: 'adoptionFeeMinor',
        age: 'ageYears',
        age_years: 'ageYears',
        name: 'name',
        distance: 'distance',
      };
      apiFilters.sortBy = sortByMapping[filters.sortBy] || filters.sortBy;
    }

    // Map location coordinates to backend query params
    if (filters.latitude !== undefined) {
      apiFilters.lat = filters.latitude;
      delete apiFilters.latitude;
    }
    if (filters.longitude !== undefined) {
      apiFilters.lng = filters.longitude;
      delete apiFilters.longitude;
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
        data: unknown[];
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
          data: response.data.map((p) => normalisePet(p)),
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
      const response = await this.apiService.get<ApiResponse<unknown>>(
        PETS_ENDPOINTS.PET_BY_ID(id)
      );

      if (response.success && response.data) {
        return normalisePet(response.data);
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
      const response = await this.apiService.get<ApiResponse<unknown[]>>(
        PETS_ENDPOINTS.FEATURED_PETS,
        { limit }
      );
      return (response.data || []).map((p) => normalisePet(p));
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
      const response = await this.apiService.get<ApiResponse<unknown[]>>(
        PETS_ENDPOINTS.RECENT_PETS,
        { limit }
      );
      return (response.data || []).map((p) => normalisePet(p));
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
        data: unknown[];
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
        data: (response.data || []).map((p) => normalisePet(p)),
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
      const response = await this.apiService.get<
        ApiResponse<{
          pets: unknown[];
          total: number;
          page: number;
          totalPages: number;
        }>
      >(PETS_ENDPOINTS.USER_FAVORITES);

      const rawPets = response.data?.pets || [];
      return rawPets.map((pet): Pet => {
        const rawRecord = z.record(z.string(), z.unknown()).parse(pet);
        const normalised = normalisePet(rawRecord);
        const rescue = rawRecord['Rescue'];
        if (rescue && typeof rescue === 'object' && rescue !== null) {
          const r = rescue as Record<string, unknown>;
          return {
            ...normalised,
            rescue: {
              name: typeof r['name'] === 'string' ? r['name'] : '',
              location:
                typeof r['city'] === 'string' && typeof r['state'] === 'string'
                  ? `${r['city']}, ${r['state']}`
                  : undefined,
            },
          };
        }
        return normalised;
      });
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
      const response = await this.apiService.get<ApiResponse<unknown[]>>(
        PETS_ENDPOINTS.SIMILAR_PETS(petId),
        { limit }
      );
      return (response.data || []).map((p) => normalisePet(p));
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
      const response = await this.apiService.get<{ data: unknown }>(PETS_ENDPOINTS.PET_STATISTICS);
      return PetStatsSchema.parse(response.data ?? {});
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
