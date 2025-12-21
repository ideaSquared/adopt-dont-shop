import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  Rescue,
  RescueAPIResponse,
  RescueSearchFilters,
  PaginatedResponse,
  Pet,
  RescueServiceConfig,
  RescueLocation,
  AdoptionPolicy,
} from '../types';

/**
 * Transform rescue data from API format to frontend format
 */
const transformRescueFromAPI = (rescue: RescueAPIResponse): Rescue => {
  if (!rescue) {
    return rescue as unknown as Rescue;
  }

  return {
    // Map all backend fields
    rescueId: rescue.rescue_id || rescue.rescueId || '',
    name: rescue.name,
    email: rescue.email,
    phone: rescue.phone,
    address: rescue.address,
    city: rescue.city,
    state: rescue.state,
    zipCode: rescue.zip_code || rescue.zipCode || '',
    country: rescue.country,
    website: rescue.website,
    description: rescue.description,
    mission: rescue.mission,
    ein: rescue.ein,
    registrationNumber: rescue.registration_number || rescue.registrationNumber,
    contactPerson: rescue.contact_person || rescue.contactPerson || rescue.name,
    contactTitle: rescue.contact_title || rescue.contactTitle,
    contactEmail: rescue.contact_email || rescue.contactEmail,
    contactPhone: rescue.contact_phone || rescue.contactPhone,
    status: rescue.status,
    verifiedAt: rescue.verified_at || rescue.verifiedAt,
    verifiedBy: rescue.verified_by || rescue.verifiedBy,
    settings: rescue.settings,
    adoptionPolicies: rescue.settings?.adoptionPolicies as AdoptionPolicy | undefined,
    isDeleted: rescue.is_deleted || rescue.isDeleted || false,
    deletedAt: rescue.deleted_at || rescue.deletedAt,
    deletedBy: rescue.deleted_by || rescue.deletedBy,
    createdAt: rescue.created_at || rescue.createdAt || '',
    updatedAt: rescue.updated_at || rescue.updatedAt || '',

    // Computed properties for backwards compatibility
    verified: rescue.status === 'verified',
    location: {
      address: rescue.address,
      city: rescue.city,
      state: rescue.state,
      zipCode: rescue.zip_code || rescue.zipCode || '',
      country: rescue.country,
    } as RescueLocation,
    // Determine type based on available data - this logic may need adjustment
    type: rescue.type || (rescue.ein ? 'organization' : 'individual'),
  };
};

/**
 * Rescue Service
 *
 * Provides comprehensive rescue organization data management including
 * rescue browsing, search, filtering, and pet retrieval by rescue.
 *
 * Features:
 * - Rescue profile browsing and retrieval
 * - Advanced search and filtering
 * - Pet lookup by rescue organization
 * - Featured rescue recommendations
 * - API data transformation (snake_case → camelCase)
 */
export class RescueService {
  private apiService: ApiService;
  private config: RescueServiceConfig;
  private baseUrl = '/api/v1/rescues';

  constructor(apiService?: ApiService, config: RescueServiceConfig = {}) {
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
  updateConfig(config: Partial<RescueServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.apiUrl) {
      this.apiService.updateConfig({ apiUrl: config.apiUrl });
    }
  }

  /**
   * Get a single rescue by ID
   */
  async getRescue(rescueId: string): Promise<Rescue> {
    try {
      const response = (await this.apiService.get(`${this.baseUrl}/${rescueId}`)) as {
        success: boolean;
        data: RescueAPIResponse;
        message?: string;
      };

      if (response.success && response.data) {
        return transformRescueFromAPI(response.data);
      } else {
        throw new Error(response.message || 'Invalid API response structure');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch rescue:', error);
      }
      throw error;
    }
  }

  /**
   * Get pets by rescue ID with pagination
   */
  async getPetsByRescue(
    rescueId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Pet>> {
    try {
      const response = (await this.apiService.get(`/api/v1/pets/rescue/${rescueId}`, {
        page: page.toString(),
        limit: limit.toString(),
      })) as {
        success: boolean;
        data: Pet[];
        meta: {
          page?: number;
          total?: number;
          totalPages?: number;
          hasNext?: boolean;
          hasPrev?: boolean;
        };
      };

      // Handle the API response structure
      if (response.success && response.data && response.meta) {
        return {
          data: response.data,
          pagination: {
            page: response.meta.page || page,
            limit: limit,
            total: response.meta.total || 0,
            totalPages: response.meta.totalPages || 1,
            hasNext: response.meta.hasNext || false,
            hasPrev: response.meta.hasPrev || false,
          },
        };
      } else {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch pets by rescue:', error);
      }
      throw error;
    }
  }

  /**
   * Search rescues with filters and pagination
   */
  async searchRescues(filters: RescueSearchFilters = {}): Promise<PaginatedResponse<Rescue>> {
    try {
      // Build query parameters, filtering out undefined/null/empty values
      const queryParams: Record<string, string> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = String(value);
        }
      });

      const response = (await this.apiService.get(this.baseUrl, queryParams)) as {
        success: boolean;
        data: RescueAPIResponse[];
        pagination: {
          page?: number;
          limit?: number;
          total?: number;
          pages?: number;
        };
        message?: string;
      };

      if (!response.success) {
        throw new Error(response.message || 'Search failed');
      }

      // Handle the API response structure
      if (response.success && response.data && response.pagination) {
        return {
          data: response.data.map(transformRescueFromAPI),
          pagination: {
            page: response.pagination.page || 1,
            limit: response.pagination.limit || 20,
            total: response.pagination.total || 0,
            totalPages: response.pagination.pages || 1,
            hasNext: (response.pagination.page || 1) < (response.pagination.pages || 1),
            hasPrev: (response.pagination.page || 1) > 1,
          },
        };
      } else {
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to search rescues:', error);
      }
      throw error;
    }
  }

  /**
   * Get all rescues (helper method for debugging)
   */
  async getAllRescues(): Promise<Rescue[]> {
    const result = await this.searchRescues({ limit: 100 });
    return result.data;
  }

  /**
   * Get featured rescues
   */
  async getFeaturedRescues(limit: number = 10): Promise<Rescue[]> {
    try {
      const response = (await this.apiService.get(`${this.baseUrl}/featured`, {
        limit: limit.toString(),
      })) as RescueAPIResponse[] | { data: RescueAPIResponse[] };

      // Handle different response formats
      const rescueData = Array.isArray(response)
        ? response
        : (response as { data: RescueAPIResponse[] }).data || [];
      return rescueData.map(transformRescueFromAPI);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch featured rescues:', error);
      }
      // Return empty array on error for featured rescues (non-critical feature)
      return [];
    }
  }

  /**
   * Update adoption policies for a rescue
   */
  async updateAdoptionPolicies(
    rescueId: string,
    adoptionPolicies: AdoptionPolicy
  ): Promise<AdoptionPolicy> {
    try {
      const response = (await this.apiService.put(
        `${this.baseUrl}/${rescueId}/adoption-policies`,
        adoptionPolicies
      )) as {
        success: boolean;
        data: AdoptionPolicy;
        message?: string;
      };

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update adoption policies');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to update adoption policies:', error);
      }
      throw error;
    }
  }

  /**
   * Get adoption policies for a rescue
   */
  async getAdoptionPolicies(rescueId: string): Promise<AdoptionPolicy | null> {
    try {
      const response = (await this.apiService.get(
        `${this.baseUrl}/${rescueId}/adoption-policies`
      )) as {
        success: boolean;
        data: AdoptionPolicy | null;
        message?: string;
      };

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch adoption policies');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to fetch adoption policies:', error);
      }
      throw error;
    }
  }

  /**
   * Get configuration for debugging
   */
  getConfig(): RescueServiceConfig {
    return { ...this.config };
  }
}

// Create and export singleton instance
export const rescueService = new RescueService();
