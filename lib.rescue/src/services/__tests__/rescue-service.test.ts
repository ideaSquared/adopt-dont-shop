import { RescueService } from '../rescue-service';
import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  Rescue,
  RescueAPIResponse,
  RescueSearchFilters,
  PaginatedResponse,
  Pet,
  RescueStatus,
  RescueType,
} from '../../types';

// Mock the ApiService
jest.mock('@adopt-dont-shop/lib.api');

describe('RescueService', () => {
  let rescueService: RescueService;
  let mockApiService: jest.Mocked<ApiService>;

  const mockRescueAPIResponse: RescueAPIResponse = {
    rescue_id: 'rescue-123',
    name: 'Happy Tails Rescue',
    email: 'info@happytails.org',
    phone: '555-123-4567',
    address: '123 Pet Street',
    city: 'Petville',
    state: 'CA',
    zip_code: '90210',
    country: 'USA',
    website: 'https://happytails.org',
    description: 'A wonderful rescue organization',
    mission: 'To save all pets',
    ein: '12-3456789',
    registration_number: 'REG-123',
    contact_person: 'Jane Doe',
    contact_title: 'Director',
    contact_email: 'jane@happytails.org',
    contact_phone: '555-987-6543',
    status: 'verified' as RescueStatus,
    verified_at: '2024-01-01T00:00:00Z',
    verified_by: 'admin-123',
    settings: { notifications: true },
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    type: 'organization' as RescueType,
  };

  const mockRescue: Rescue = {
    rescueId: 'rescue-123',
    name: 'Happy Tails Rescue',
    email: 'info@happytails.org',
    phone: '555-123-4567',
    address: '123 Pet Street',
    city: 'Petville',
    state: 'CA',
    zipCode: '90210',
    country: 'USA',
    website: 'https://happytails.org',
    description: 'A wonderful rescue organization',
    mission: 'To save all pets',
    ein: '12-3456789',
    registrationNumber: 'REG-123',
    contactPerson: 'Jane Doe',
    contactTitle: 'Director',
    contactEmail: 'jane@happytails.org',
    contactPhone: '555-987-6543',
    status: 'verified' as RescueStatus,
    verifiedAt: '2024-01-01T00:00:00Z',
    verifiedBy: 'admin-123',
    settings: { notifications: true },
    isDeleted: false,
    deletedAt: undefined,
    deletedBy: undefined,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    verified: true,
    location: {
      address: '123 Pet Street',
      city: 'Petville',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
    },
    type: 'organization' as RescueType,
  };

  const mockPet: Pet = {
    id: 'pet-123',
    name: 'Buddy',
    type: 'dog',
    breed: 'Golden Retriever',
    age: 3,
    size: 'large',
    rescueId: 'rescue-123',
    status: 'available',
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock ApiService instance
    mockApiService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      updateConfig: jest.fn(),
    } as unknown as jest.Mocked<ApiService>;

    // Mock the ApiService constructor
    (ApiService as jest.MockedClass<typeof ApiService>).mockImplementation(() => mockApiService);

    // Create service instance
    rescueService = new RescueService();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(rescueService).toBeInstanceOf(RescueService);
    });

    it('should create instance with custom config', () => {
      const customConfig = { apiUrl: 'http://test.com', debug: true };
      const service = new RescueService(mockApiService, customConfig);
      expect(service).toBeInstanceOf(RescueService);
    });
  });

  describe('getRescue', () => {
    it('should get rescue by ID successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockRescueAPIResponse,
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.getRescue('rescue-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/rescues/rescue-123');
      expect(result).toEqual(mockRescue);
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        success: false,
        message: 'Rescue not found',
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      await expect(rescueService.getRescue('invalid-id')).rejects.toThrow('Rescue not found');
    });

    it('should handle network error', async () => {
      const error = new Error('Network error');
      mockApiService.get.mockRejectedValue(error);

      await expect(rescueService.getRescue('rescue-123')).rejects.toThrow('Network error');
    });
  });

  describe('getPetsByRescue', () => {
    it('should get pets by rescue ID successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockPet],
        meta: {
          page: 1,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.getPetsByRescue('rescue-123', 1, 20);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets/rescue/rescue-123', {
        page: '1',
        limit: '20',
      });
      expect(result).toEqual({
        data: [mockPet],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should handle empty pets response', async () => {
      const mockResponse = {
        success: true,
        data: [],
        meta: {
          page: 1,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.getPetsByRescue('rescue-123');

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should handle missing meta response', async () => {
      const mockResponse = {
        success: false,
        data: null,
        meta: null,
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.getPetsByRescue('rescue-123');

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });
  });

  describe('searchRescues', () => {
    it('should search rescues successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockRescueAPIResponse],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const filters: RescueSearchFilters = {
        search: 'Happy Tails',
        type: 'organization',
        verified: true,
        page: 1,
        limit: 20,
      };

      const result = await rescueService.searchRescues(filters);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/rescues', {
        search: 'Happy Tails',
        type: 'organization',
        verified: 'true',
        page: '1',
        limit: '20',
      });
      expect(result).toEqual({
        data: [mockRescue],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should search rescues with empty filters', async () => {
      const mockResponse = {
        success: true,
        data: [mockRescueAPIResponse],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.searchRescues();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/rescues', {});
      expect(result.data).toHaveLength(1);
    });

    it('should filter out undefined and empty values', async () => {
      const mockResponse = {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const filters: RescueSearchFilters = {
        search: 'test',
        type: undefined,
        location: '',
        verified: false,
      };

      await rescueService.searchRescues(filters);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/rescues', {
        search: 'test',
        verified: 'false',
      });
    });

    it('should handle search error', async () => {
      const mockResponse = {
        success: false,
        message: 'Search failed',
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      await expect(rescueService.searchRescues()).rejects.toThrow('Search failed');
    });
  });

  describe('getAllRescues', () => {
    it('should get all rescues', async () => {
      const mockResponse = {
        success: true,
        data: [mockRescueAPIResponse],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          pages: 1,
        },
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.getAllRescues();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/rescues', { limit: '100' });
      expect(result).toEqual([mockRescue]);
    });
  });

  describe('getFeaturedRescues', () => {
    it('should get featured rescues successfully', async () => {
      mockApiService.get.mockResolvedValue([mockRescueAPIResponse]);

      const result = await rescueService.getFeaturedRescues(5);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/rescues/featured', {
        limit: '5',
      });
      expect(result).toEqual([mockRescue]);
    });

    it('should get featured rescues with nested response', async () => {
      const mockResponse = { data: [mockRescueAPIResponse] };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.getFeaturedRescues();

      expect(result).toEqual([mockRescue]);
    });

    it('should handle featured rescues error gracefully', async () => {
      const error = new Error('API error');
      mockApiService.get.mockRejectedValue(error);

      const result = await rescueService.getFeaturedRescues();

      expect(result).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('should update service configuration', () => {
      const newConfig = { apiUrl: 'http://newapi.com', debug: true };

      rescueService.updateConfig(newConfig);

      expect(mockApiService.updateConfig).toHaveBeenCalledWith({ apiUrl: 'http://newapi.com' });
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = rescueService.getConfig();

      expect(config).toEqual({
        apiUrl: 'http://localhost:5000',
        debug: false,
      });
    });
  });
});
