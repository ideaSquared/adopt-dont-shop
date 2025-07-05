import { PaginatedResponse, Pet, Rescue } from '@/types';
import { apiService } from './api';

// API Response type for rescue from backend
interface RescueAPIResponse {
  rescue_id?: string;
  rescueId?: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  zipCode?: string;
  country: string;
  website?: string;
  description?: string;
  mission?: string;
  ein?: string;
  registration_number?: string;
  registrationNumber?: string;
  contact_person?: string;
  contactPerson?: string;
  contact_title?: string;
  contactTitle?: string;
  contact_email?: string;
  contactEmail?: string;
  contact_phone?: string;
  contactPhone?: string;
  status: 'pending' | 'verified' | 'suspended' | 'inactive';
  verified_at?: string;
  verifiedAt?: string;
  verified_by?: string;
  verifiedBy?: string;
  settings?: Record<string, unknown>;
  is_deleted?: boolean;
  isDeleted?: boolean;
  deleted_at?: string;
  deletedAt?: string;
  deleted_by?: string;
  deletedBy?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  type?: 'individual' | 'organization';
}

// Transform rescue data from API format
const transformRescueFromAPI = (rescue: RescueAPIResponse): Rescue => {
  if (!rescue) return rescue as Rescue;

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
    },
    // Determine type based on available data - this logic may need adjustment
    type: rescue.type || (rescue.ein ? 'organization' : 'individual'),
  };
};

class RescueService {
  // Get a single rescue by ID
  async getRescue(rescueId: string): Promise<Rescue> {
    try {
      // Make direct fetch to handle API response format properly
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/rescues/${rescueId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const rawData = await response.json();

      if (!response.ok) {
        throw new Error(rawData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle the API response structure
      if (rawData.success && rawData.data) {
        return transformRescueFromAPI(rawData.data);
      } else {
        throw new Error(rawData.message || 'Invalid API response structure');
      }
    } catch (error) {
      console.error('Failed to fetch rescue:', error);
      throw error;
    }
  }

  // Get pets by rescue ID
  async getPetsByRescue(
    rescueId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Pet>> {
    try {
      // Make direct fetch to handle API response format properly
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/pets/rescue/${rescueId}?${searchParams.toString()}`,
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

      // Handle the API response structure
      if (rawData.success && rawData.data && rawData.meta) {
        return {
          data: rawData.data,
          pagination: {
            page: rawData.meta.page || page,
            limit: limit,
            total: rawData.meta.total || 0,
            totalPages: rawData.meta.totalPages || 1,
            hasNext: rawData.meta.hasNext || false,
            hasPrev: rawData.meta.hasPrev || false,
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
      console.error('Failed to fetch pets by rescue:', error);
      throw error;
    }
  }

  // Search rescues with filters
  async searchRescues(
    filters: {
      search?: string;
      type?: 'individual' | 'organization';
      location?: string;
      verified?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<Rescue>> {
    try {
      // Make direct fetch to handle API response format properly
      const searchParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/rescues?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const rawData = await response.json();

      if (!response.ok) {
        throw new Error(rawData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle the API response structure
      if (rawData.success && rawData.data && rawData.pagination) {
        return {
          data: rawData.data.map(transformRescueFromAPI),
          pagination: {
            page: rawData.pagination.page || 1,
            limit: rawData.pagination.limit || 20,
            total: rawData.pagination.total || 0,
            totalPages: rawData.pagination.pages || 1,
            hasNext: rawData.pagination.page < rawData.pagination.pages,
            hasPrev: rawData.pagination.page > 1,
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
      console.error('Failed to search rescues:', error);
      throw error;
    }
  }

  // Helper method to get all rescues for debugging
  async getAllRescues(): Promise<Rescue[]> {
    const result = await this.searchRescues({ limit: 100 });
    return result.data;
  }

  // Get featured rescues
  async getFeaturedRescues(limit: number = 10): Promise<Rescue[]> {
    const response = await apiService.get<Rescue[]>('/rescues/featured', { limit });
    return Array.isArray(response) ? response.map(transformRescueFromAPI) : [];
  }
}

export const rescueService = new RescueService();
