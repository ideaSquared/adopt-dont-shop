import { apiService } from './api';

/**
 * Pet-related types and interfaces
 */
export interface Pet {
  pet_id: string;
  rescue_id: string;
  name: string;
  species: 'DOG' | 'CAT' | 'OTHER';
  breed?: string;
  age_years?: number;
  age_months?: number;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  neutered_spayed: boolean;
  description?: string;
  medical_notes?: string;
  behavioral_notes?: string;
  adoption_fee?: number;
  status: 'AVAILABLE' | 'PENDING' | 'ADOPTED' | 'UNAVAILABLE' | 'MEDICAL_HOLD';
  location?: string;
  microchip_id?: string;
  intake_date: string;
  photos?: PetPhoto[];
  created_at: string;
  updated_at: string;
}

export interface PetPhoto {
  photo_id: string;
  pet_id: string;
  url: string;
  caption?: string;
  is_primary: boolean;
  created_at: string;
}

export interface CreatePetRequest {
  name: string;
  species: Pet['species'];
  breed?: string;
  age_years?: number;
  age_months?: number;
  size: Pet['size'];
  gender: Pet['gender'];
  neutered_spayed: boolean;
  description?: string;
  medical_notes?: string;
  behavioral_notes?: string;
  adoption_fee?: number;
  location?: string;
  microchip_id?: string;
  intake_date?: string;
}

export interface UpdatePetRequest {
  name?: string;
  species?: Pet['species'];
  breed?: string;
  age_years?: number;
  age_months?: number;
  size?: Pet['size'];
  gender?: Pet['gender'];
  neutered_spayed?: boolean;
  description?: string;
  medical_notes?: string;
  behavioral_notes?: string;
  adoption_fee?: number;
  status?: Pet['status'];
  location?: string;
  microchip_id?: string;
}

export interface PetListResponse {
  pets: Pet[];
  total: number;
  page: number;
  limit: number;
}

export interface PetFilters {
  species?: string;
  breed?: string;
  age_min?: number;
  age_max?: number;
  size?: string;
  gender?: string;
  status?: string;
  neutered_spayed?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Enhanced Pet Service for Rescue App
 *
 * Provides comprehensive pet management functionality with enhanced
 * error handling, caching, and data transformation capabilities.
 */
class PetService {
  private cache: Map<string, { data: Pet; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all pets with filters and pagination
   */
  async getPets(filters: PetFilters = {}): Promise<PetListResponse> {
    try {
      // Transform filters to match backend API format
      const apiFilters = this.transformFilters(filters);

      const response = await apiService.get<PetListResponse>('/api/v1/pets', apiFilters);

      // Cache individual pets
      if (response.pets) {
        response.pets.forEach((pet: Pet) => {
          this.cache.set(pet.pet_id, {
            data: pet,
            timestamp: Date.now(),
          });
        });
      }

      return response;
    } catch (error) {
      console.error('❌ PetService: Failed to fetch pets:', error);
      throw error;
    }
  }

  /**
   * Get a single pet by ID with caching
   */
  async getPetById(petId: string, useCache = true): Promise<Pet> {
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(petId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const pet = await apiService.get<Pet>(`/api/v1/pets/${petId}`);

      // Update cache
      this.cache.set(petId, {
        data: pet,
        timestamp: Date.now(),
      });

      return pet;
    } catch (error) {
      console.error('❌ PetService: Failed to fetch pet:', error);
      throw error;
    }
  }

  /**
   * Create a new pet
   */
  async createPet(petData: CreatePetRequest): Promise<Pet> {
    try {
      const pet = await apiService.post<Pet>('/api/v1/pets', petData);

      // Add to cache
      this.cache.set(pet.pet_id, {
        data: pet,
        timestamp: Date.now(),
      });

      return pet;
    } catch (error) {
      console.error('❌ PetService: Failed to create pet:', error);
      throw error;
    }
  }

  /**
   * Update an existing pet
   */
  async updatePet(petId: string, petData: UpdatePetRequest): Promise<Pet> {
    try {
      const pet = await apiService.patch<Pet>(`/api/v1/pets/${petId}`, petData);

      // Update cache
      this.cache.set(petId, {
        data: pet,
        timestamp: Date.now(),
      });

      return pet;
    } catch (error) {
      console.error('❌ PetService: Failed to update pet:', error);
      throw error;
    }
  }

  /**
   * Delete a pet
   */
  async deletePet(petId: string): Promise<void> {
    try {
      await apiService.delete<void>(`/api/v1/pets/${petId}`);

      // Remove from cache
      this.cache.delete(petId);
    } catch (error) {
      console.error('❌ PetService: Failed to delete pet:', error);
      throw error;
    }
  }

  /**
   * Upload a photo for a pet
   */
  async uploadPetPhoto(
    petId: string,
    photo: File,
    options: {
      caption?: string;
      isPrimary?: boolean;
    } = {}
  ): Promise<PetPhoto> {
    try {
      const photoData = await apiService.uploadFile<PetPhoto>(
        `/api/v1/pets/${petId}/photos`,
        photo,
        {
          caption: options.caption,
          is_primary: options.isPrimary,
        }
      );

      // Invalidate pet cache to refresh photos
      this.cache.delete(petId);

      return photoData;
    } catch (error) {
      console.error('❌ PetService: Failed to upload pet photo:', error);
      throw error;
    }
  }

  /**
   * Update photo details
   */
  async updatePetPhoto(
    petId: string,
    photoId: string,
    updates: {
      caption?: string;
      is_primary?: boolean;
    }
  ): Promise<PetPhoto> {
    try {
      const photoData = await apiService.patch<PetPhoto>(
        `/api/v1/pets/${petId}/photos/${photoId}`,
        updates
      );

      // Invalidate pet cache
      this.cache.delete(petId);

      return photoData;
    } catch (error) {
      console.error('❌ PetService: Failed to update pet photo:', error);
      throw error;
    }
  }

  /**
   * Delete a pet photo
   */
  async deletePetPhoto(petId: string, photoId: string): Promise<void> {
    try {
      await apiService.delete<void>(`/api/v1/pets/${petId}/photos/${photoId}`);

      // Invalidate pet cache
      this.cache.delete(petId);
    } catch (error) {
      console.error('❌ PetService: Failed to delete pet photo:', error);
      throw error;
    }
  }

  /**
   * Search pets with text query
   */
  async searchPets(query: string, filters: PetFilters = {}): Promise<PetListResponse> {
    try {
      const searchFilters = {
        ...this.transformFilters(filters),
        search: query,
      };

      return await apiService.get<PetListResponse>('/api/v1/pets/search', searchFilters);
    } catch (error) {
      console.error('❌ PetService: Failed to search pets:', error);
      throw error;
    }
  }

  /**
   * Get pet statistics
   */
  async getPetStats(): Promise<{
    total: number;
    available: number;
    pending: number;
    adopted: number;
    by_species: Record<string, number>;
    by_size: Record<string, number>;
  }> {
    try {
      return await apiService.get('/api/v1/pets/stats');
    } catch (error) {
      console.error('❌ PetService: Failed to fetch pet stats:', error);
      throw error;
    }
  }

  /**
   * Bulk update pet statuses
   */
  async bulkUpdateStatus(
    petIds: string[],
    status: Pet['status'],
    notes?: string
  ): Promise<{ success: number; failed: number }> {
    try {
      return await apiService.patch('/api/v1/pets/bulk-update', {
        pet_ids: petIds,
        status,
        notes,
      });
    } catch (error) {
      console.error('❌ PetService: Failed to bulk update pets:', error);
      throw error;
    }
  }

  /**
   * Get pet activity history
   */
  async getPetActivity(petId: string): Promise<
    Array<{
      activity_type: string;
      description: string;
      user_id?: string;
      user_name?: string;
      created_at: string;
    }>
  > {
    try {
      const response = await apiService.get(`/api/v1/pets/${petId}/activity`);
      return response as Array<{
        activity_type: string;
        description: string;
        user_id?: string;
        user_name?: string;
        created_at: string;
      }>;
    } catch (error) {
      console.error('❌ PetService: Failed to fetch pet activity:', error);
      throw error;
    }
  }

  /**
   * Export pets data
   */
  async exportPets(filters: PetFilters = {}, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    try {
      const exportFilters = {
        ...this.transformFilters(filters),
        format,
      };

      const response = await apiService.get('/api/v1/pets/export', exportFilters);
      return response as unknown as Blob;
    } catch (error) {
      console.error('❌ PetService: Failed to export pets:', error);
      throw error;
    }
  }

  /**
   * Transform frontend filters to backend API format
   */
  private transformFilters(filters: PetFilters): Record<string, unknown> {
    const apiFilters: Record<string, unknown> = {};

    // Map filter names and values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle age range
        if (key === 'age_min' || key === 'age_max') {
          apiFilters[key] = value;
        }
        // Handle boolean values
        else if (typeof value === 'boolean') {
          apiFilters[key] = value;
        }
        // Handle other values
        else {
          apiFilters[key] = value;
        }
      }
    });

    return apiFilters;
  }

  /**
   * Clear the service cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      oldestEntry: oldestTimestamp,
    };
  }
}

export const petService = new PetService();
