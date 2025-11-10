import { ApiService, ApiResponse } from '@adopt-dont-shop/lib-api';
import { Pet, PetCreateData, PetUpdateData, PetStatus, PetsServiceConfig } from '../types';
import { PETS_ENDPOINTS } from '../constants/endpoints';

/**
 * Pet Management Service
 *
 * Provides CRUD operations for rescue staff to manage their pets
 * including creation, updates, status changes, and image management.
 *
 * Features:
 * - Full CRUD operations for pets
 * - Image upload and management
 * - Status updates and tracking
 * - Bulk operations support
 * - Medical history management
 * - Behavioral assessment tracking
 */
export class PetManagementService {
  private apiService: ApiService;
  private config: PetsServiceConfig;

  constructor(apiService?: ApiService, config: PetsServiceConfig = {}) {
    this.apiService =
      apiService ||
      new ApiService({
        apiUrl: 'http://localhost:5000',
        getAuthToken: () => {
          // Get token from localStorage, prioritizing authToken over accessToken
          if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('authToken') || localStorage.getItem('accessToken');
          }
          return null;
        },
      });
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
   * Create a new pet
   */
  async createPet(petData: PetCreateData): Promise<Pet> {
    try {
      const transformedData = this.transformPetDataForAPI(petData);

      const response = await this.apiService.post<ApiResponse<Pet>>(
        PETS_ENDPOINTS.PETS,
        transformedData
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create pet');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to create pet:', error);
      }
      throw error;
    }
  }

  /**
   * Update an existing pet
   */
  async updatePet(petId: string, petData: PetUpdateData): Promise<Pet> {
    try {
      const response = await this.apiService.put<ApiResponse<Pet>>(
        PETS_ENDPOINTS.PET_BY_ID(petId),
        this.transformPetDataForAPI(petData)
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update pet');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to update pet:', error);
      }
      throw error;
    }
  }

  /**
   * Delete a pet (soft delete)
   */
  async deletePet(petId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiService.delete<
        ApiResponse<{ success: boolean; message: string }>
      >(PETS_ENDPOINTS.PET_BY_ID(petId), { reason });

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to delete pet');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to delete pet:', error);
      }
      throw error;
    }
  }

  /**
   * Update pet status
   */
  async updatePetStatus(petId: string, status: PetStatus, notes?: string): Promise<Pet> {
    try {
      const response = await this.apiService.patch<ApiResponse<Pet>>(
        `${PETS_ENDPOINTS.PET_BY_ID(petId)}/status`,
        { status, notes }
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update pet status');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to update pet status:', error);
      }
      throw error;
    }
  }

  /**
   * Upload pet images
   */
  async uploadPetImages(petId: string, images: string[]): Promise<Pet> {
    try {
      const response = await this.apiService.post<ApiResponse<Pet>>(
        `${PETS_ENDPOINTS.PET_BY_ID(petId)}/images`,
        { images }
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to upload pet images');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to upload pet images:', error);
      }
      throw error;
    }
  }

  /**
   * Remove pet image
   */
  async removePetImage(petId: string, imageUrl: string): Promise<Pet> {
    try {
      const url = `${PETS_ENDPOINTS.PET_BY_ID(petId)}/images?imageUrl=${encodeURIComponent(imageUrl)}`;
      const response = await this.apiService.delete<ApiResponse<Pet>>(url);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to remove pet image');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to remove pet image:', error);
      }
      throw error;
    }
  }

  /**
   * Get pets for the current user's rescue (automatically filtered by backend)
   */
  async getMyRescuePets(
    filters: {
      page?: number;
      limit?: number;
      status?: PetStatus;
      search?: string;
      type?: string;
      size?: string;
      breed?: string;
      ageGroup?: string;
      gender?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{
    pets: Pet[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      // Use the new "my rescue pets" endpoint that automatically gets the user's rescue
      const params = {
        ...filters,
      };

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
      }>(PETS_ENDPOINTS.MY_RESCUE_PETS, params);

      if (response.success && response.data && response.meta) {
        return {
          pets: response.data,
          pagination: {
            page: response.meta.page || 1,
            limit: filters.limit || 12,
            total: response.meta.total || 0,
            totalPages: response.meta.totalPages || 1,
            hasNext: response.meta.hasNext || false,
            hasPrev: response.meta.hasPrev || false,
          },
        };
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch my rescue pets:', error);
      }
      throw error;
    }
  }

  /**
   * Get pets by rescue ID (for rescue staff)
   */
  async getRescuePets(
    rescueId: string,
    filters: {
      page?: number;
      limit?: number;
      status?: PetStatus;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{
    pets: Pet[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const params = {
        rescueId,
        ...filters,
      };

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
      }>(PETS_ENDPOINTS.PETS, params);

      if (response.success && response.data && response.meta) {
        return {
          pets: response.data,
          pagination: {
            page: response.meta.page || 1,
            limit: filters.limit || 12,
            total: response.meta.total || 0,
            totalPages: response.meta.totalPages || 1,
            hasNext: response.meta.hasNext || false,
            hasPrev: response.meta.hasPrev || false,
          },
        };
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch rescue pets:', error);
      }
      throw error;
    }
  }

  /**
   * Bulk update pet statuses
   */
  async bulkUpdatePetStatus(
    petIds: string[],
    status: PetStatus,
    notes?: string
  ): Promise<{ success: boolean; updated: number; errors: any[] }> {
    try {
      const response = await this.apiService.patch<
        ApiResponse<{
          success: boolean;
          updated: number;
          errors: any[];
        }>
      >(`${PETS_ENDPOINTS.PETS}/bulk/status`, { petIds, status, notes });

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to bulk update pet status');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to bulk update pet status:', error);
      }
      throw error;
    }
  }

  /**
   * Get pet statistics for rescue dashboard
   */
  async getPetStatistics(rescueId: string): Promise<{
    total: number;
    available: number;
    pending: number;
    adopted: number;
    onHold: number;
    byType: { [key: string]: number };
    byStatus: { [key: string]: number };
    avgTimeToAdoption: number;
  }> {
    try {
      const response = await this.apiService.get<
        ApiResponse<{
          total: number;
          available: number;
          pending: number;
          adopted: number;
          onHold: number;
          byType: { [key: string]: number };
          byStatus: { [key: string]: number };
          avgTimeToAdoption: number;
        }>
      >(`${PETS_ENDPOINTS.PETS}/statistics?rescueId=${rescueId}`);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch pet statistics');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch pet statistics:', error);
      }
      throw error;
    }
  }

  /**
   * Transform pet data from frontend format to backend API format
   */
  private transformPetDataForAPI(petData: PetCreateData | PetUpdateData): any {
    const transformed: any = { ...petData };

    // Transform camelCase to snake_case for backend
    const fieldMapping: { [key: string]: string } = {
      ageGroup: 'age_group',
      energyLevel: 'energy_level',
      shortDescription: 'short_description',
      longDescription: 'long_description',
      adoptionFee: 'adoption_fee',
      goodWithChildren: 'good_with_children',
      goodWithCats: 'good_with_cats',
      goodWithDogs: 'good_with_dogs',
      goodWithSmallAnimals: 'good_with_small_animals',
      houseTrained: 'house_trained',
      specialNeeds: 'special_needs',
      spayNeuterStatus: 'spay_neuter_status',
      vaccinationStatus: 'vaccination_status',
      ageYears: 'age_years',
      ageMonths: 'age_months',
    };

    Object.entries(fieldMapping).forEach(([frontendKey, backendKey]) => {
      if (transformed[frontendKey] !== undefined) {
        transformed[backendKey] = transformed[frontendKey];
        delete transformed[frontendKey];
      }
    });

    // Remove rescueId as it's automatically determined by the backend from the authenticated user
    delete transformed.rescueId;

    return transformed;
  }
}

// Create and export singleton instance
export const petManagementService = new PetManagementService();
