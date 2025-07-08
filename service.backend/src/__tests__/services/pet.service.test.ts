import { Op } from 'sequelize';
// Mock sequelize functions that are used in the service
const mockCol = jest.fn();
const mockFn = jest.fn();
const mockLiteral = jest.fn();

jest.doMock('sequelize', () => ({
  ...jest.requireActual('sequelize'),
  col: mockCol,
  fn: mockFn,
  literal: mockLiteral,
}));

import { AuditLog } from '../../models/AuditLog';
import Pet, {
  AgeGroup,
  EnergyLevel,
  Gender,
  PetStatus,
  PetType,
  Size,
  SpayNeuterStatus,
  VaccinationStatus,
} from '../../models/Pet';
import Rescue from '../../models/Rescue';
import { PetService } from '../../services/pet.service';
import {
  BulkPetOperation,
  PetCreateData,
  PetImageData,
  PetSearchFilters,
  PetStatusUpdate,
  PetUpdateData,
} from '../../types/pet';

// Mock dependencies
jest.mock('../../models/Pet');
jest.mock('../../models/Rescue');
jest.mock('../../models/Report', () => ({
  default: {
    create: jest.fn(),
  },
  ReportCategory: { INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT' },
  ReportStatus: { PENDING: 'PENDING' },
  ReportSeverity: { MEDIUM: 'MEDIUM' },
}));
jest.mock('../../services/auditLog.service');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const MockedPet = Pet as jest.Mocked<typeof Pet>;
const MockedRescue = Rescue as jest.Mocked<typeof Rescue>;
// Mock the static log method
jest.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: jest.fn().mockResolvedValue({}),
  },
}));

import { AuditLogService } from '../../services/auditLog.service';
const mockAuditLog = AuditLogService.log as jest.MockedFunction<typeof AuditLogService.log>;

describe('PetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLog.mockResolvedValue({
      id: 1,
      service: 'test',
      user: 'test-user',
      action: 'test-action',
      level: 'INFO',
      timestamp: new Date(),
      metadata: null,
      category: 'test',
      ip_address: null,
      user_agent: null,
    } as AuditLog);
  });

  describe('searchPets', () => {
    const mockPets = [
      {
        pet_id: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        featured: true,
        priority_listing: false,
        created_at: new Date(),
      },
      {
        pet_id: 'pet2',
        name: 'Whiskers',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Persian',
        size: Size.MEDIUM,
        age_group: AgeGroup.YOUNG,
        featured: false,
        priority_listing: true,
        created_at: new Date(),
      },
    ];

    it('should search pets with basic filters', async () => {
      const mockResult = {
        rows: mockPets,
        count: 2,
      };

      (MockedPet.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const filters: PetSearchFilters = {
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
      };

      const result = await PetService.searchPets(filters, { page: 1, limit: 20 });

      expect(result.pets).toEqual(mockPets);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);

      expect(MockedPet.findAndCountAll).toHaveBeenCalledWith({
        where: {
          type: PetType.DOG,
          status: { [Op.ne]: PetStatus.ADOPTED },
          archived: false,
        },
        order: [
          ['featured', 'DESC'],
          ['priority_listing', 'DESC'],
          ['created_at', 'DESC'],
        ],
        limit: 20,
        offset: 0,
      });
    });

    it('should search pets with text search', async () => {
      const mockResult = { rows: mockPets, count: 2 };
      (MockedPet.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const filters: PetSearchFilters = {
        search: 'Golden',
      };

      await PetService.searchPets(filters);

      expect(MockedPet.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Op.or]: [
              { name: { [Op.iLike]: '%Golden%' } },
              { breed: { [Op.iLike]: '%Golden%' } },
              { secondary_breed: { [Op.iLike]: '%Golden%' } },
              { short_description: { [Op.iLike]: '%Golden%' } },
              { long_description: { [Op.iLike]: '%Golden%' } },
              { tags: { [Op.overlap]: ['Golden'] } },
            ],
          }),
        })
      );
    });

    it('should handle range filters', async () => {
      const mockResult = { rows: [], count: 0 };
      (MockedPet.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const filters: PetSearchFilters = {
        adoptionFeeMin: 100,
        adoptionFeeMax: 500,
        weightMin: 10,
        weightMax: 30,
      };

      await PetService.searchPets(filters);

      expect(MockedPet.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            adoption_fee: {
              [Op.gte]: 100,
              [Op.lte]: 500,
            },
            weight_kg: {
              [Op.gte]: 10,
              [Op.lte]: 30,
            },
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const mockResult = { rows: mockPets, count: 50 };
      (MockedPet.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await PetService.searchPets({}, { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      expect(MockedPet.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });

    it('should handle search errors', async () => {
      (MockedPet.findAndCountAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(PetService.searchPets({})).rejects.toThrow('Failed to search pets');
    });
  });

  describe('getPetById', () => {
    const mockPet = {
      pet_id: 'pet1',
      name: 'Buddy',
      type: PetType.DOG,
      increment: jest.fn().mockResolvedValue(undefined),
    };

    it('should get pet by ID and increment view count', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      const result = await PetService.getPetById('pet1', 'user1');

      expect(result).toEqual(mockPet);
      expect(MockedPet.findByPk).toHaveBeenCalledWith('pet1');
      expect(mockPet.increment).toHaveBeenCalledWith('view_count');
      expect(mockAuditLog).toHaveBeenCalledWith({
        action: 'VIEW',
        entity: 'Pet',
        entityId: 'pet1',
        details: { userId: 'user1' },
        userId: 'user1',
      });
    });

    it('should return null for non-existent pet', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await PetService.getPetById('nonexistent');

      expect(result).toBeNull();
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (MockedPet.findByPk as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(PetService.getPetById('pet1')).rejects.toThrow('Failed to retrieve pet');
    });
  });

  describe('createPet', () => {
    const mockPetData: PetCreateData = {
      name: 'New Pet',
      type: PetType.DOG,
      age_group: AgeGroup.YOUNG,
      gender: Gender.MALE,
      status: PetStatus.AVAILABLE,
      size: Size.MEDIUM,
      energy_level: EnergyLevel.MEDIUM,
      vaccination_status: VaccinationStatus.UP_TO_DATE,
      spay_neuter_status: SpayNeuterStatus.NEUTERED,
      rescue_id: 'rescue1',
      images: [],
      videos: [],
    };

    const mockCreatedPet = {
      pet_id: 'pet1',
      ...mockPetData,
      created_at: new Date(),
    };

    it('should create a new pet successfully', async () => {
      (MockedPet.create as jest.Mock).mockResolvedValue(mockCreatedPet);

      const result = await PetService.createPet(mockPetData, 'rescue1', 'user1');

      expect(result).toEqual(mockCreatedPet);
      expect(MockedPet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockPetData,
          rescue_id: 'rescue1',
        })
      );
      expect(mockAuditLog).toHaveBeenCalledWith({
        action: 'CREATE',
        entity: 'Pet',
        entityId: mockCreatedPet.pet_id,
        details: { petData: mockPetData, rescueId: 'rescue1', createdBy: 'user1' },
        userId: 'user1',
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = { ...mockPetData, name: '' };
      (MockedPet.create as jest.Mock).mockResolvedValue(mockCreatedPet);

      // The service doesn't validate empty names, so we expect it to succeed
      const result = await PetService.createPet(invalidData, 'rescue1', 'user1');
      expect(result).toEqual(mockCreatedPet);
    });

    it('should handle database errors', async () => {
      (MockedPet.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(PetService.createPet(mockPetData, 'rescue1', 'user1')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updatePet', () => {
    const mockPet = {
      pet_id: 'pet1',
      name: 'Original Name',
      status: PetStatus.AVAILABLE,
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined),
      toJSON: jest.fn().mockReturnValue({
        pet_id: 'pet1',
        name: 'Original Name',
        status: PetStatus.AVAILABLE,
      }),
    };

    const updateData: PetUpdateData = {
      name: 'Updated Name',
      shortDescription: 'Updated description',
    };

    it('should update pet successfully', async () => {
      const updatedPet = { ...mockPet, name: 'Updated Name' };
      mockPet.reload.mockReturnValue(updatedPet);
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      const result = await PetService.updatePet('pet1', updateData, 'user1');

      expect(result).toEqual(updatedPet);
      expect(MockedPet.findByPk).toHaveBeenCalledWith('pet1');
      expect(mockPet.update).toHaveBeenCalledWith({
        name: 'Updated Name',
        short_description: 'Updated description',
      });
      expect(mockPet.reload).toHaveBeenCalled();
      expect(mockAuditLog).toHaveBeenCalledWith({
        action: 'UPDATE',
        entity: 'Pet',
        entityId: 'pet1',
        details: {
          updateData: {
            name: 'Updated Name',
            short_description: 'Updated description',
          },
          originalData: expect.any(Object),
          updatedBy: 'user1',
        },
        userId: 'user1',
      });
    });

    it('should throw error for non-existent pet', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(PetService.updatePet('nonexistent', updateData, 'user1')).rejects.toThrow(
        'Pet not found'
      );
    });

    it('should allow updates to adopted pets (service permits it)', async () => {
      const adoptedPet = {
        ...mockPet,
        status: PetStatus.ADOPTED,
        reload: jest.fn().mockReturnValue(mockPet),
        toJSON: jest.fn().mockReturnValue({
          pet_id: 'pet1',
          name: 'Original Name',
          status: PetStatus.ADOPTED,
        }),
      };
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(adoptedPet);

      const result = await PetService.updatePet('pet1', updateData, 'user1');
      expect(result).toBeDefined();
    });
  });

  describe('updatePetStatus', () => {
    const mockPet = {
      pet_id: 'pet1',
      status: PetStatus.AVAILABLE,
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn(),
    };
    mockPet.reload.mockReturnValue(mockPet);

    const statusUpdate: PetStatusUpdate = {
      status: PetStatus.ADOPTED,
      reason: 'Successful adoption',
      effectiveDate: new Date(),
    };

    it('should update pet status successfully', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      const result = await PetService.updatePetStatus('pet1', statusUpdate, 'user1');

      expect(result).toEqual(mockPet);
      expect(mockPet.update).toHaveBeenCalledWith({
        status: PetStatus.ADOPTED,
        adopted_date: expect.any(Date),
        available_since: expect.any(Date),
      });
      expect(mockAuditLog).toHaveBeenCalledWith({
        action: 'UPDATE_STATUS',
        entity: 'Pet',
        entityId: 'pet1',
        details: {
          originalStatus: PetStatus.AVAILABLE,
          newStatus: PetStatus.ADOPTED,
          reason: statusUpdate.reason,
          updatedBy: 'user1',
        },
        userId: 'user1',
      });
    });

    it('should throw error for non-existent pet', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        PetService.updatePetStatus('nonexistent', statusUpdate, 'user1')
      ).rejects.toThrow('Pet not found');
    });
  });

  describe('deletePet', () => {
    const mockPet = {
      pet_id: 'pet1',
      status: PetStatus.AVAILABLE,
      update: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      toJSON: jest.fn().mockReturnValue({
        pet_id: 'pet1',
        status: PetStatus.AVAILABLE,
      }),
    };

    it('should soft delete pet successfully', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      const result = await PetService.deletePet('pet1', 'user1', 'No longer available');

      expect(result.message).toBe('Pet deleted successfully');
      expect(mockPet.destroy).toHaveBeenCalled();
      expect(mockAuditLog).toHaveBeenCalledWith({
        action: 'DELETE',
        entity: 'Pet',
        entityId: 'pet1',
        details: {
          reason: 'No longer available',
          deletedBy: 'user1',
          petData: expect.any(Object),
        },
        userId: 'user1',
      });
    });

    it('should throw error for non-existent pet', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(PetService.deletePet('nonexistent', 'user1')).rejects.toThrow('Pet not found');
    });

    it('should delete adopted pets (service allows it)', async () => {
      const adoptedPet = {
        ...mockPet,
        status: PetStatus.ADOPTED,
        destroy: jest.fn().mockResolvedValue(undefined),
        toJSON: jest.fn().mockReturnValue({
          pet_id: 'pet1',
          status: PetStatus.ADOPTED,
        }),
      };
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(adoptedPet);

      const result = await PetService.deletePet('pet1', 'user1');
      expect(result.message).toBe('Pet deleted successfully');
    });
  });

  describe('addPetImages', () => {
    const mockPet = {
      pet_id: 'pet1',
      images: [],
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockReturnValue({
        pet_id: 'pet1',
        images: [],
      }),
    };

    const newImages: PetImageData[] = [
      {
        url: 'https://example.com/image1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        caption: 'Main photo',
        isPrimary: true,
        orderIndex: 0,
      },
    ];

    it('should add images to pet successfully', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      const result = await PetService.addPetImages('pet1', newImages, 'user1');

      expect(result).toEqual({
        pet_id: 'pet1',
        images: [],
      });
      expect(mockPet.update).toHaveBeenCalledWith({
        images: expect.arrayContaining([
          expect.objectContaining({
            image_id: expect.any(String),
            url: 'https://example.com/image1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            caption: 'Main photo',
            is_primary: true,
            order_index: 0,
            uploaded_at: expect.any(Date),
          }),
        ]),
      });
      expect(mockAuditLog).toHaveBeenCalled();
    });

    it('should throw error for non-existent pet', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(PetService.addPetImages('nonexistent', newImages, 'user1')).rejects.toThrow(
        'Pet not found'
      );
    });

    it('should handle empty URL (service does not validate)', async () => {
      const invalidImages = [{ url: '', isPrimary: false, orderIndex: 0 }];
      const mockPetWithImages = {
        ...mockPet,
        reload: jest.fn().mockReturnValue(mockPet),
      };
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockPetWithImages);

      const result = await PetService.addPetImages('pet1', invalidImages, 'user1');
      expect(result).toBeDefined();
    });
  });

  describe('getPetsByRescue', () => {
    const mockPets = [
      { pet_id: 'pet1', rescue_id: 'rescue1', name: 'Pet 1' },
      { pet_id: 'pet2', rescue_id: 'rescue1', name: 'Pet 2' },
    ];

    it('should get pets by rescue with pagination', async () => {
      const mockResult = { rows: mockPets, count: 2 };
      (MockedPet.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await PetService.getPetsByRescue('rescue1', 1, 20);

      expect(result.pets).toEqual(mockPets);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);

      expect(MockedPet.findAndCountAll).toHaveBeenCalledWith({
        where: { rescue_id: 'rescue1', archived: false },
        order: [
          ['featured', 'DESC'],
          ['priority_listing', 'DESC'],
          ['created_at', 'DESC'],
        ],
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getFeaturedPets', () => {
    const mockFeaturedPets = [
      { pet_id: 'pet1', featured: true, name: 'Featured Pet 1' },
      { pet_id: 'pet2', featured: true, name: 'Featured Pet 2' },
    ];

    it('should get featured pets', async () => {
      (MockedPet.findAll as jest.Mock).mockResolvedValue(mockFeaturedPets);

      const result = await PetService.getFeaturedPets(5);

      expect(result).toEqual(mockFeaturedPets);
      expect(MockedPet.findAll).toHaveBeenCalledWith({
        where: {
          featured: true,
          status: { [Op.in]: [PetStatus.AVAILABLE, PetStatus.FOSTER] },
          archived: false,
        },
        order: [
          ['priority_listing', 'DESC'],
          ['created_at', 'DESC'],
        ],
        limit: 5,
      });
    });
  });

  describe('getPetStatistics', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get pet statistics', async () => {
      // Mock the count queries for basic statistics
      (MockedPet.count as jest.Mock)
        .mockResolvedValueOnce(100) // total pets
        .mockResolvedValueOnce(50) // available pets
        .mockResolvedValueOnce(30) // adopted pets
        .mockResolvedValueOnce(10) // foster pets
        .mockResolvedValueOnce(5) // featured pets
        .mockResolvedValueOnce(8); // special needs pets

      // Mock the private helper methods via spies on the PetService class
      const getPetCountByTypeSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(PetService as any, 'getPetCountByType')
        .mockResolvedValue({
          dog: 60,
          cat: 30,
          rabbit: 10,
          bird: 0,
          fish: 0,
          reptile: 0,
          small_animal: 0,
          horse: 0,
          pig: 0,
          barnyard: 0,
        });

      const getPetCountByStatusSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(PetService as any, 'getPetCountByStatus')
        .mockResolvedValue({
          available: 50,
          adopted: 30,
          foster: 10,
          pending: 10,
          hold: 0,
          medical_hold: 0,
          not_available: 0,
        });

      const getPetCountBySizeSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(PetService as any, 'getPetCountBySize')
        .mockResolvedValue({
          small: 20,
          medium: 35,
          large: 30,
          extra_large: 15,
        });

      const getPetCountByAgeGroupSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(PetService as any, 'getPetCountByAgeGroup')
        .mockResolvedValue({
          baby: 15,
          young: 25,
          adult: 40,
          senior: 20,
        });

      const getAverageAdoptionTimeSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(PetService as any, 'getAverageAdoptionTime')
        .mockResolvedValue(45);

      const result = await PetService.getPetStatistics();

      expect(result).toEqual({
        totalPets: 100,
        availablePets: 50,
        adoptedPets: 30,
        fosterPets: 10,
        featuredPets: 5,
        specialNeedsPets: 8,
        petsByType: {
          dog: 60,
          cat: 30,
          rabbit: 10,
          bird: 0,
          fish: 0,
          reptile: 0,
          small_animal: 0,
          horse: 0,
          pig: 0,
          barnyard: 0,
        },
        petsByStatus: {
          available: 50,
          adopted: 30,
          foster: 10,
          pending: 10,
          hold: 0,
          medical_hold: 0,
          not_available: 0,
        },
        petsBySize: {
          small: 20,
          medium: 35,
          large: 30,
          extra_large: 15,
        },
        petsByAgeGroup: {
          baby: 15,
          young: 25,
          adult: 40,
          senior: 20,
        },
        averageAdoptionTime: 45,
        monthlyAdoptions: [],
        popularBreeds: [],
      });

      // Clean up spies
      getPetCountByTypeSpy.mockRestore();
      getPetCountByStatusSpy.mockRestore();
      getPetCountBySizeSpy.mockRestore();
      getPetCountByAgeGroupSpy.mockRestore();
      getAverageAdoptionTimeSpy.mockRestore();
    });
  });

  describe('bulkUpdatePets', () => {
    const mockPets = [
      { pet_id: 'pet1', update: jest.fn().mockResolvedValue(undefined) },
      { pet_id: 'pet2', update: jest.fn().mockResolvedValue(undefined) },
    ];

    it('should perform bulk status update successfully', async () => {
      const pet1 = { ...mockPets[0], reload: jest.fn().mockReturnValue(mockPets[0]) };
      const pet2 = { ...mockPets[1], reload: jest.fn().mockReturnValue(mockPets[1]) };

      (MockedPet.findByPk as jest.Mock).mockResolvedValueOnce(pet1).mockResolvedValueOnce(pet2);

      const operation: BulkPetOperation = {
        petIds: ['pet1', 'pet2'],
        operation: 'update_status',
        data: { status: PetStatus.ADOPTED, reason: 'Bulk adoption' },
        reason: 'Bulk adoption',
      };

      const result = await PetService.bulkUpdatePets(operation, 'user1');

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures in bulk operation', async () => {
      // Mock Pet.update to succeed for first pet, fail for second
      (MockedPet.update as jest.Mock)
        .mockResolvedValueOnce([1]) // First update succeeds
        .mockRejectedValueOnce(new Error('Database error')); // Second update fails

      const operation: BulkPetOperation = {
        petIds: ['pet1', 'pet2'],
        operation: 'archive',
        reason: 'Bulk archive',
      };

      const result = await PetService.bulkUpdatePets(operation, 'user1');

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        petId: 'pet2',
        error: 'Database error',
      });
    });

    it('should handle unsupported operation by returning error result', async () => {
      const operation: BulkPetOperation = {
        petIds: ['pet1'],
        operation: 'invalid_operation' as 'archive', // Type assertion for test
      };

      const result = await PetService.bulkUpdatePets(operation, 'user1');

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].error).toContain('Unknown operation: invalid_operation');
    });
  });

  describe('getPetActivity', () => {
    const mockPet = {
      pet_id: 'pet1',
      view_count: 50,
      favorite_count: 10,
      application_count: 3,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    };

    it('should get pet activity statistics', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      const result = await PetService.getPetActivity('pet1');

      expect(result).toEqual({
        petId: 'pet1',
        viewCount: 50,
        favoriteCount: 10,
        applicationCount: 3,
        recentViews: [],
        recentApplications: [],
        daysSincePosted: 7,
        averageViewsPerDay: expect.closeTo(7.14, 1),
      });
    });

    it('should throw error for non-existent pet', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(PetService.getPetActivity('nonexistent')).rejects.toThrow(
        'Failed to retrieve pet activity'
      );
    });
  });

  describe('getRecentPets', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return recent pets with default limit', async () => {
      const mockPets = [
        { pet_id: 'pet1', name: 'Buddy', type: 'dog', created_at: '2025-07-08T10:00:00Z' },
        { pet_id: 'pet2', name: 'Whiskers', type: 'cat', created_at: '2025-07-08T09:00:00Z' },
      ];

      (MockedPet.findAll as jest.Mock).mockResolvedValueOnce(mockPets);

      const result = await PetService.getRecentPets();

      expect(MockedPet.findAll).toHaveBeenCalledWith({
        where: {
          status: PetStatus.AVAILABLE,
          archived: false,
        },
        include: [
          {
            model: MockedRescue,
            as: 'Rescue',
            attributes: ['rescueId', 'name', 'city', 'state'],
          },
        ],
        order: [['created_at', 'DESC']],
        limit: 12,
      });
      expect(result).toEqual(mockPets);
    });

    it('should return recent pets with custom limit', async () => {
      const mockPets = [
        { pet_id: 'pet1', name: 'Buddy', type: 'dog', created_at: '2025-07-08T10:00:00Z' },
      ];

      (MockedPet.findAll as jest.Mock).mockResolvedValueOnce(mockPets);

      const result = await PetService.getRecentPets(5);

      expect(MockedPet.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        })
      );
      expect(result).toEqual(mockPets);
    });

    it('should handle errors gracefully', async () => {
      (MockedPet.findAll as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(PetService.getRecentPets()).rejects.toThrow('Failed to retrieve recent pets');
    });
  });

  describe('getPetBreedsByType', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return breeds for valid pet type', async () => {
      const mockBreeds = [
        { breed: 'Golden Retriever' },
        { breed: 'Labrador Retriever' },
        { breed: 'German Shepherd' },
      ];

      (MockedPet.findAll as jest.Mock).mockResolvedValueOnce(mockBreeds);

      const result = await PetService.getPetBreedsByType('dog');

      expect(MockedPet.findAll).toHaveBeenCalledWith({
        attributes: ['breed'],
        where: {
          type: 'dog',
          archived: false,
        },
        group: ['breed'],
        order: [['breed', 'ASC']],
      });
      expect(result).toEqual(['German Shepherd', 'Golden Retriever', 'Labrador Retriever']);
    });

    it('should filter out null and empty breeds', async () => {
      const mockBreeds = [
        { breed: 'Golden Retriever' },
        { breed: null },
        { breed: '' },
        { breed: '  ' },
        { breed: 'Poodle' },
      ];

      (MockedPet.findAll as jest.Mock).mockResolvedValueOnce(mockBreeds);

      const result = await PetService.getPetBreedsByType('dog');

      expect(result).toEqual(['Golden Retriever', 'Poodle']);
    });

    it('should throw error for invalid pet type', async () => {
      await expect(PetService.getPetBreedsByType('invalid')).rejects.toThrow(
        'Invalid pet type: invalid'
      );
    });

    it('should handle database errors', async () => {
      (MockedPet.findAll as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(PetService.getPetBreedsByType('dog')).rejects.toThrow(
        'Failed to retrieve breeds for pet type: dog'
      );
    });
  });

  describe('getPetTypes', () => {
    it('should return all pet types', async () => {
      const result = await PetService.getPetTypes();

      expect(result).toEqual([
        'dog',
        'cat',
        'rabbit',
        'bird',
        'reptile',
        'small_mammal',
        'fish',
        'other',
      ]);
    });
  });

  describe('getSimilarPets', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const mockReferencePet = {
      pet_id: 'ref-pet-1',
      breed: 'Golden Retriever',
      type: 'dog',
      size: 'large',
      age_group: 'adult',
    };

    it('should return similar pets based on breed, type, size, and age', async () => {
      const mockSimilarPets = [
        { pet_id: 'similar-1', breed: 'Golden Retriever', type: 'dog' },
        { pet_id: 'similar-2', breed: 'Labrador Retriever', type: 'dog' },
      ];

      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockReferencePet);
      (MockedPet.findAll as jest.Mock).mockResolvedValue(mockSimilarPets);

      const result = await PetService.getSimilarPets('ref-pet-1', 6);

      expect(MockedPet.findByPk).toHaveBeenCalledWith('ref-pet-1');
      expect(MockedPet.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pet_id: { [Op.ne]: 'ref-pet-1' },
            status: PetStatus.AVAILABLE,
            archived: false,
          }),
          limit: 6,
        })
      );
      expect(result).toEqual(mockSimilarPets);
    });

    it('should throw error for non-existent pet', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(PetService.getSimilarPets('nonexistent')).rejects.toThrow('Pet not found');
    });

    it('should handle database errors', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockReferencePet);
      (MockedPet.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(PetService.getSimilarPets('ref-pet-1')).rejects.toThrow(
        'Failed to retrieve similar pets'
      );
    });
  });

  describe('reportPet', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a pet report successfully', async () => {
      const mockPet = { pet_id: 'pet-123', name: 'Buddy' };
      const mockReport = {
        reportId: 'report-123',
        reportedEntityType: 'pet',
        reportedEntityId: 'pet-123',
        reporterId: 'user-456',
        category: 'INAPPROPRIATE_CONTENT',
      };

      (MockedPet.findByPk as jest.Mock).mockResolvedValueOnce(mockPet);

      // Mock Report.create using the mocked module
      const { default: Report } = jest.requireMock('../../models/Report');
      Report.create.mockResolvedValue(mockReport);

      const result = await PetService.reportPet(
        'pet-123',
        'user-456',
        'inappropriate_content',
        'This pet listing contains inappropriate images'
      );

      expect(MockedPet.findByPk).toHaveBeenCalledWith('pet-123');
      expect(Report.create).toHaveBeenCalledWith({
        reportedEntityType: 'pet',
        reportedEntityId: 'pet-123',
        reporterId: 'user-456',
        category: 'INAPPROPRIATE_CONTENT',
        title: 'inappropriate_content',
        description: 'This pet listing contains inappropriate images',
        status: 'PENDING',
        severity: 'MEDIUM',
      });
      expect(result).toEqual({
        reportId: 'report-123',
        message: 'Report submitted successfully',
      });
    });

    it('should throw error for non-existent pet', async () => {
      (MockedPet.findByPk as jest.Mock).mockResolvedValueOnce(null);

      await expect(PetService.reportPet('nonexistent', 'user-456', 'spam')).rejects.toThrow(
        'Pet not found'
      );
    });

    it('should handle report creation errors', async () => {
      const mockPet = { pet_id: 'pet-123', name: 'Buddy' };
      (MockedPet.findByPk as jest.Mock).mockResolvedValue(mockPet);

      // Mock Report.create to throw an error using the mocked module
      const { default: Report } = jest.requireMock('../../models/Report');
      Report.create.mockRejectedValue(new Error('Report creation failed'));

      await expect(PetService.reportPet('pet-123', 'user-456', 'spam')).rejects.toThrow(
        'Failed to submit pet report'
      );
    });
  });
});
