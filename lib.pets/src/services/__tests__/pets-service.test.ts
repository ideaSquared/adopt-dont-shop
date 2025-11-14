import { PetsService } from '../pets-service';
import { ApiService } from '@adopt-dont-shop/lib.api';

// Mock the API service
const mockApiService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  updateConfig: jest.fn(),
} as unknown as jest.Mocked<ApiService>;

describe('PetsService', () => {
  let service: PetsService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset mocks
    jest.clearAllMocks();

    service = new PetsService(mockApiService, {
      debug: false,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(service).toBeDefined();
      expect(service.updateConfig).toBeDefined();
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true, apiUrl: 'https://test-api.com' });
      expect(mockApiService.updateConfig).toHaveBeenCalledWith({ apiUrl: 'https://test-api.com' });
    });
  });

  describe('searchPets', () => {
    it('should search pets successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [
            {
              pet_id: '1',
              name: 'Buddy',
              type: 'dog',
              breed: 'Golden Retriever',
              age_years: 3,
              age_months: 6,
              status: 'available',
              images: [],
              videos: [],
              location: { type: 'Point', coordinates: [0, 0] },
              tags: [],
              temperament: [],
              created_at: '2023-01-01',
              updated_at: '2023-01-01',
            },
          ],
          meta: {
            page: 1,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      };

      mockApiService.get.mockResolvedValueOnce(mockResponse);

      const result = await service.searchPets({ type: 'dog' });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Buddy');
      expect(result.pagination.page).toBe(1);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets', { type: 'dog' });
    });

    it('should handle search errors gracefully', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.searchPets()).rejects.toThrow('API Error');
    });
  });

  describe('getPetById', () => {
    it('should get pet by ID successfully', async () => {
      const mockPet = {
        pet_id: '1',
        name: 'Buddy',
        type: 'dog',
        breed: 'Golden Retriever',
        age_years: 3,
        age_months: 6,
        status: 'available',
        images: [],
        videos: [],
        location: { type: 'Point', coordinates: [0, 0] },
        tags: [],
        temperament: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockPet,
      });

      const result = await service.getPetById('1');

      expect(result).toEqual(mockPet);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets/1');
    });
  });

  describe('getFeaturedPets', () => {
    it('should get featured pets successfully', async () => {
      const mockPets = [
        {
          pet_id: '1',
          name: 'Buddy',
          featured: true,
          images: [],
          videos: [],
          location: { type: 'Point', coordinates: [0, 0] },
          tags: [],
          temperament: [],
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ];

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockPets,
      });

      const result = await service.getFeaturedPets(12);

      expect(result).toEqual(mockPets);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets/featured', { limit: 12 });
    });
  });

  describe('favorites management', () => {
    it('should add pet to favorites', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: true });

      await service.addToFavorites('1');

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/pets/1/favorite');
    });

    it('should remove pet from favorites', async () => {
      mockApiService.delete.mockResolvedValueOnce({ success: true });

      await service.removeFromFavorites('1');

      expect(mockApiService.delete).toHaveBeenCalledWith('/api/v1/pets/1/favorite');
    });

    it('should check if pet is favorite', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { isFavorite: true },
      });

      const result = await service.isFavorite('1');

      expect(result).toBe(true);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets/1/favorite/status');
    });
  });
});
