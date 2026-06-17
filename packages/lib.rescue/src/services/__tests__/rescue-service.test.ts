import { RescueService } from '../rescue-service';
import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  Rescue,
  RescueAPIResponse,
  RescueSearchFilters,
  Pet,
  RescueStatus,
  RescueType,
} from '../../types';

// Mock the ApiService
vi.mock('@adopt-dont-shop/lib.api');

describe('RescueService', () => {
  let rescueService: RescueService;
  let mockApiService: vi.Mocked<ApiService>;

  const mockRescueAPIResponse: RescueAPIResponse = {
    rescue_id: 'rescue-123',
    name: 'Happy Tails Rescue',
    email: 'info@happytails.org',
    phone: '555-123-4567',
    address: '123 Pet Street',
    city: 'Petville',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'GB',
    website: 'https://happytails.org',
    description: 'A wonderful rescue organization',
    mission: 'To save all pets',
    companies_house_number: '12345678',
    charity_registration_number: undefined,
    verification_source: undefined,
    verification_failure_reason: undefined,
    manual_verification_requested_at: undefined,
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
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'GB',
    website: 'https://happytails.org',
    description: 'A wonderful rescue organization',
    mission: 'To save all pets',
    companiesHouseNumber: '12345678',
    charityRegistrationNumber: undefined,
    verificationSource: undefined,
    verificationFailureReason: undefined,
    manualVerificationRequestedAt: undefined,
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
      county: 'Greater London',
      postcode: 'SW1A 1AA',
      country: 'GB',
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
    vi.clearAllMocks();

    // Create mock ApiService instance
    mockApiService = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      updateConfig: vi.fn(),
    } as unknown as vi.Mocked<ApiService>;

    // Mock the ApiService constructor
    (ApiService as vi.MockedClass<typeof ApiService>).mockImplementation(function () {
      return mockApiService;
    });

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

    it('should log featured rescues errors to console.error regardless of debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const error = new Error('Network failure');
      mockApiService.get.mockRejectedValue(error);

      // Default service has debug: false — error must still be logged
      await rescueService.getFeaturedRescues();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch featured rescues:', error);
      consoleSpy.mockRestore();
    });
  });

  const mockAdoptionPolicy = {
    requireHomeVisit: true,
    requireReferences: true,
    minimumReferenceCount: 2,
    requireVeterinarianReference: false,
    adoptionFeeRange: { min: 50, max: 150 },
    requirements: ['Must have a garden'],
    policies: ['No re-homing within 6 months'],
    returnPolicy: 'Returns accepted within 14 days',
    spayNeuterPolicy: 'All pets are neutered',
    followUpPolicy: 'Home check at 1 month',
  };

  describe('updateAdoptionPolicies', () => {
    it('should update adoption policies successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockAdoptionPolicy,
      };
      mockApiService.put.mockResolvedValue(mockResponse);

      const result = await rescueService.updateAdoptionPolicies('rescue-123', mockAdoptionPolicy);

      expect(mockApiService.put).toHaveBeenCalledWith(
        '/api/v1/rescues/rescue-123/adoption-policies',
        mockAdoptionPolicy
      );
      expect(result).toEqual(mockAdoptionPolicy);
    });

    it('should throw when the response is not successful', async () => {
      const mockResponse = {
        success: false,
        message: 'Failed to update adoption policies',
      };
      mockApiService.put.mockResolvedValue(mockResponse);

      await expect(
        rescueService.updateAdoptionPolicies('rescue-123', mockAdoptionPolicy)
      ).rejects.toThrow('Failed to update adoption policies');
    });

    it('should throw when the response succeeds but has no data', async () => {
      const mockResponse = {
        success: true,
        data: null,
      };
      mockApiService.put.mockResolvedValue(mockResponse);

      await expect(
        rescueService.updateAdoptionPolicies('rescue-123', mockAdoptionPolicy)
      ).rejects.toThrow('Failed to update adoption policies');
    });

    it('should propagate network errors', async () => {
      const error = new Error('Network error');
      mockApiService.put.mockRejectedValue(error);

      await expect(
        rescueService.updateAdoptionPolicies('rescue-123', mockAdoptionPolicy)
      ).rejects.toThrow('Network error');
    });
  });

  describe('getAdoptionPolicies', () => {
    it('should get adoption policies successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockAdoptionPolicy,
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.getAdoptionPolicies('rescue-123');

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/v1/rescues/rescue-123/adoption-policies'
      );
      expect(result).toEqual(mockAdoptionPolicy);
    });

    it('should return null when the response data is null', async () => {
      const mockResponse = {
        success: true,
        data: null,
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await rescueService.getAdoptionPolicies('rescue-123');

      expect(result).toBeNull();
    });

    it('should throw when the response is not successful', async () => {
      const mockResponse = {
        success: false,
        message: 'Failed to fetch adoption policies',
      };
      mockApiService.get.mockResolvedValue(mockResponse);

      await expect(rescueService.getAdoptionPolicies('rescue-123')).rejects.toThrow(
        'Failed to fetch adoption policies'
      );
    });

    it('should propagate network errors', async () => {
      const error = new Error('Network error');
      mockApiService.get.mockRejectedValue(error);

      await expect(rescueService.getAdoptionPolicies('rescue-123')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('transformRescueFromAPI (via getRescue)', () => {
    const baseApiResponse: RescueAPIResponse = {
      name: 'Solo Foster',
      email: 'solo@foster.org',
      address: '1 Lane',
      city: 'Town',
      postcode: 'AB1 2CD',
      country: 'GB',
      status: 'pending' as RescueStatus,
    };

    it('should compute type "individual" when no companies-house or charity number', async () => {
      mockApiService.get.mockResolvedValue({ success: true, data: baseApiResponse });

      const result = await rescueService.getRescue('rescue-solo');

      expect(result.type).toBe('individual');
    });

    it('should compute type "organization" when a charity number is present', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: { ...baseApiResponse, charity_registration_number: 'CH-9999' },
      });

      const result = await rescueService.getRescue('rescue-org');

      expect(result.type).toBe('organization');
    });

    it('should resolve camelCase fallbacks when snake_case fields are absent', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: {
          rescueId: 'camel-1',
          name: 'Camel Rescue',
          email: 'camel@rescue.org',
          address: '2 Road',
          city: 'City',
          postcode: 'XY9 8ZZ',
          country: 'GB',
          status: 'verified' as RescueStatus,
          companiesHouseNumber: 'CH-1',
          contactPerson: 'Cam El',
          createdAt: '2024-05-01T00:00:00Z',
          updatedAt: '2024-05-02T00:00:00Z',
        },
      });

      const result = await rescueService.getRescue('camel-1');

      expect(result.rescueId).toBe('camel-1');
      expect(result.companiesHouseNumber).toBe('CH-1');
      expect(result.contactPerson).toBe('Cam El');
      expect(result.createdAt).toBe('2024-05-01T00:00:00Z');
      expect(result.type).toBe('organization');
    });

    it('should fall back to name for contactPerson and default missing optional fields', async () => {
      mockApiService.get.mockResolvedValue({ success: true, data: baseApiResponse });

      const result = await rescueService.getRescue('rescue-solo');

      expect(result.contactPerson).toBe('Solo Foster');
      expect(result.isDeleted).toBe(false);
      expect(result.createdAt).toBe('');
      expect(result.verified).toBe(false);
      expect(result.adoptionPolicies).toBeUndefined();
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
        debug: false,
      });
    });
  });
});
