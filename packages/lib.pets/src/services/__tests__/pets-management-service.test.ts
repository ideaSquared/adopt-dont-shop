import { PetManagementService } from '../pets-management-service';
import { ApiService } from '@adopt-dont-shop/lib.api';
import type { PetCreateData, PetUpdateData, PetStatus } from '../../types';

// Mock the API service (mirrors the style in pets-service.test.ts)
const mockApiService = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  updateConfig: vi.fn(),
} as unknown as vi.Mocked<ApiService>;

const samplePet = {
  pet_id: 'pet-1',
  name: 'Buddy',
  type: 'dog',
  status: 'available',
};

describe('PetManagementService', () => {
  let service: PetManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PetManagementService(mockApiService, { debug: false });
  });

  describe('initialization', () => {
    it('is defined and exposes updateConfig', () => {
      expect(service).toBeDefined();
      expect(service.updateConfig).toBeDefined();
    });

    it('forwards apiUrl changes to the underlying API service', () => {
      service.updateConfig({ debug: true, apiUrl: 'https://test-api.com' });
      expect(mockApiService.updateConfig).toHaveBeenCalledWith({ apiUrl: 'https://test-api.com' });
    });

    it('does not call the API service when only non-url config changes', () => {
      service.updateConfig({ debug: true });
      expect(mockApiService.updateConfig).not.toHaveBeenCalled();
    });
  });

  describe('createPet', () => {
    const createData: PetCreateData = {
      name: 'Buddy',
      type: 'dog',
      breed: 'Labrador',
      gender: 'male',
      size: 'medium',
      color: 'brown',
      rescueId: 'rescue-1',
      ageGroup: 'adult',
      energyLevel: 'medium',
      shortDescription: 'A good boy',
      goodWithChildren: true,
    };

    it('transforms camelCase fields to snake_case and strips rescueId before POST', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: true, data: samplePet });

      const result = await service.createPet(createData);

      expect(result).toEqual(samplePet);
      const [endpoint, body] = mockApiService.post.mock.calls[0];
      expect(endpoint).toBe('/api/v1/pets');
      const sent = body as Record<string, unknown>;
      expect(sent.age_group).toBe('adult');
      expect(sent.energy_level).toBe('medium');
      expect(sent.short_description).toBe('A good boy');
      expect(sent.good_with_children).toBe(true);
      // Original camelCase keys are removed
      expect(sent).not.toHaveProperty('ageGroup');
      expect(sent).not.toHaveProperty('energyLevel');
      // rescueId is determined server-side from auth
      expect(sent).not.toHaveProperty('rescueId');
    });

    it('throws the API message when the response is unsuccessful', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: false, message: 'Name taken' });

      await expect(service.createPet(createData)).rejects.toThrow('Name taken');
    });

    it('throws a default message when an unsuccessful response has no message', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: false });

      await expect(service.createPet(createData)).rejects.toThrow('Failed to create pet');
    });

    it('propagates network errors from the API service', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Network down'));

      await expect(service.createPet(createData)).rejects.toThrow('Network down');
    });
  });

  describe('updatePet', () => {
    const updateData: PetUpdateData = { name: 'Rex', adoptionFee: '150.00' };

    it('PUTs transformed data to the pet-by-id endpoint', async () => {
      mockApiService.put.mockResolvedValueOnce({ success: true, data: samplePet });

      const result = await service.updatePet('pet-1', updateData);

      expect(result).toEqual(samplePet);
      const [endpoint, body] = mockApiService.put.mock.calls[0];
      expect(endpoint).toBe('/api/v1/pets/pet-1');
      const sent = body as Record<string, unknown>;
      expect(sent.adoption_fee).toBe('150.00');
      expect(sent).not.toHaveProperty('adoptionFee');
    });

    it('throws on an unsuccessful response', async () => {
      mockApiService.put.mockResolvedValueOnce({ success: false });

      await expect(service.updatePet('pet-1', updateData)).rejects.toThrow('Failed to update pet');
    });
  });

  describe('deletePet', () => {
    it('soft-deletes a pet, passing the reason in the request body', async () => {
      mockApiService.delete.mockResolvedValueOnce({
        success: true,
        data: { success: true, message: 'Deleted' },
      });

      const result = await service.deletePet('pet-1', 'duplicate');

      expect(result).toEqual({ success: true, message: 'Deleted' });
      expect(mockApiService.delete).toHaveBeenCalledWith('/api/v1/pets/pet-1', {
        reason: 'duplicate',
      });
    });

    it('throws when the delete response is unsuccessful', async () => {
      mockApiService.delete.mockResolvedValueOnce({ success: false });

      await expect(service.deletePet('pet-1')).rejects.toThrow('Failed to delete pet');
    });
  });

  describe('updatePetStatus', () => {
    it('PATCHes the status sub-resource with status and notes', async () => {
      mockApiService.patch.mockResolvedValueOnce({ success: true, data: samplePet });

      const result = await service.updatePetStatus('pet-1', 'adopted' as PetStatus, 'Found home');

      expect(result).toEqual(samplePet);
      expect(mockApiService.patch).toHaveBeenCalledWith('/api/v1/pets/pet-1/status', {
        status: 'adopted',
        notes: 'Found home',
      });
    });

    it('throws when the status update is unsuccessful', async () => {
      mockApiService.patch.mockResolvedValueOnce({ success: false });

      await expect(service.updatePetStatus('pet-1', 'adopted' as PetStatus)).rejects.toThrow(
        'Failed to update pet status'
      );
    });
  });

  describe('uploadPetImages', () => {
    it('POSTs images to the images sub-resource', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: true, data: samplePet });

      const result = await service.uploadPetImages('pet-1', ['a.jpg', 'b.jpg']);

      expect(result).toEqual(samplePet);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/pets/pet-1/images', {
        images: ['a.jpg', 'b.jpg'],
      });
    });

    it('throws when image upload is unsuccessful', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: false });

      await expect(service.uploadPetImages('pet-1', [])).rejects.toThrow(
        'Failed to upload pet images'
      );
    });
  });

  describe('removePetImage', () => {
    it('DELETEs the images sub-resource with a URL-encoded imageUrl query param', async () => {
      mockApiService.delete.mockResolvedValueOnce({ success: true, data: samplePet });

      const result = await service.removePetImage('pet-1', 'https://cdn/img a.jpg');

      expect(result).toEqual(samplePet);
      expect(mockApiService.delete).toHaveBeenCalledWith(
        '/api/v1/pets/pet-1/images?imageUrl=https%3A%2F%2Fcdn%2Fimg%20a.jpg'
      );
    });

    it('throws when image removal is unsuccessful', async () => {
      mockApiService.delete.mockResolvedValueOnce({ success: false });

      await expect(service.removePetImage('pet-1', 'x.jpg')).rejects.toThrow(
        'Failed to remove pet image'
      );
    });
  });

  describe('getMyRescuePets', () => {
    const meta = { page: 2, total: 30, totalPages: 3, hasNext: true, hasPrev: true };

    it('returns pets and normalised pagination from the my-rescue endpoint', async () => {
      mockApiService.get.mockResolvedValueOnce({ success: true, data: [samplePet], meta });

      const result = await service.getMyRescuePets({ limit: 10, status: 'available' as PetStatus });

      expect(result.pets).toEqual([samplePet]);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets/rescue/my', {
        limit: 10,
        status: 'available',
      });
    });

    it('falls back to default pagination values when meta fields are missing', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: [],
        meta: { page: 0, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });

      const result = await service.getMyRescuePets();

      expect(result.pagination).toEqual({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('throws when the response is missing meta', async () => {
      mockApiService.get.mockResolvedValueOnce({ success: true, data: [samplePet] });

      await expect(service.getMyRescuePets()).rejects.toThrow('Invalid API response structure');
    });

    it('propagates API errors', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('boom'));

      await expect(service.getMyRescuePets()).rejects.toThrow('boom');
    });
  });

  describe('getRescuePets', () => {
    const meta = { page: 1, total: 5, totalPages: 1, hasNext: false, hasPrev: false };

    it('sends the rescueId alongside filters to the pets endpoint', async () => {
      mockApiService.get.mockResolvedValueOnce({ success: true, data: [samplePet], meta });

      const result = await service.getRescuePets('rescue-9', { page: 1, search: 'lab' });

      expect(result.pets).toEqual([samplePet]);
      expect(result.pagination.limit).toBe(12);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets', {
        rescueId: 'rescue-9',
        page: 1,
        search: 'lab',
      });
    });

    it('throws when the response structure is invalid', async () => {
      mockApiService.get.mockResolvedValueOnce({ success: false });

      await expect(service.getRescuePets('rescue-9')).rejects.toThrow(
        'Invalid API response structure'
      );
    });
  });

  describe('bulkUpdatePetStatus', () => {
    const bulkResult = { successCount: 2, failedCount: 0, errors: [] };

    it('posts an update_status bulk operation and returns the summary', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: true, data: bulkResult });

      const result = await service.bulkUpdatePetStatus(['a', 'b'], 'adopted' as PetStatus, 'event');

      expect(result).toEqual(bulkResult);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/pets/bulk-update', {
        petIds: ['a', 'b'],
        operation: 'update_status',
        data: { status: 'adopted' },
        reason: 'event',
      });
    });

    it('throws when the bulk operation is unsuccessful', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: false });

      await expect(service.bulkUpdatePetStatus(['a'], 'adopted' as PetStatus)).rejects.toThrow(
        'Failed to bulk update pet status'
      );
    });

    it('propagates a plan-gated 403 error verbatim', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Plan does not allow bulk operations'));

      await expect(service.bulkUpdatePetStatus(['a'], 'adopted' as PetStatus)).rejects.toThrow(
        'Plan does not allow bulk operations'
      );
    });
  });

  describe('bulkArchivePets', () => {
    const bulkResult = { successCount: 1, failedCount: 1, errors: [{ petId: 'b', error: 'x' }] };

    it('posts an archive bulk operation and returns partial-success details', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: true, data: bulkResult });

      const result = await service.bulkArchivePets(['a', 'b'], 'cleanup');

      expect(result).toEqual(bulkResult);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/pets/bulk-update', {
        petIds: ['a', 'b'],
        operation: 'archive',
        reason: 'cleanup',
      });
    });

    it('throws when the archive operation is unsuccessful', async () => {
      mockApiService.post.mockResolvedValueOnce({ success: false });

      await expect(service.bulkArchivePets(['a'])).rejects.toThrow('Failed to bulk archive pets');
    });
  });

  describe('getPetStatistics', () => {
    const stats = {
      total: 10,
      available: 4,
      pending: 2,
      adopted: 3,
      onHold: 1,
      byType: { dog: 6, cat: 4 },
      byStatus: { available: 4 },
      avgTimeToAdoption: 21,
    };

    it('fetches statistics for a rescue via query param', async () => {
      mockApiService.get.mockResolvedValueOnce({ success: true, data: stats });

      const result = await service.getPetStatistics('rescue-1');

      expect(result).toEqual(stats);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets/statistics?rescueId=rescue-1');
    });

    it('throws when statistics cannot be fetched', async () => {
      mockApiService.get.mockResolvedValueOnce({ success: false });

      await expect(service.getPetStatistics('rescue-1')).rejects.toThrow(
        'Failed to fetch pet statistics'
      );
    });
  });

  describe('debug logging', () => {
    it('logs to console.error on failure when debug is enabled', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      service.updateConfig({ debug: true });
      mockApiService.post.mockRejectedValueOnce(new Error('boom'));

      await expect(
        service.createPet({
          name: 'X',
          type: 'dog',
          breed: 'Lab',
          gender: 'male',
          size: 'medium',
          color: 'brown',
          rescueId: 'r',
        })
      ).rejects.toThrow('boom');

      expect(spy).toHaveBeenCalledWith('Failed to create pet:', expect.any(Error));
      spy.mockRestore();
    });
  });
});
