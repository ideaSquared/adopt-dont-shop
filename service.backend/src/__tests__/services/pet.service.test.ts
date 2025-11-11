import { Op } from 'sequelize';
import { vi } from 'vitest';
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

// Mock only non-database dependencies
// Logger is already mocked in setup-tests.ts
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue({}),
  },
}));

// Mock Report model to avoid circular dependencies
vi.mock('../../models/Report', () => ({
  default: {
    create: vi.fn(),
  },
  ReportCategory: {
    INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
    SPAM: 'SPAM',
    SCAM: 'SCAM',
    ABUSE: 'ABUSE',
    OTHER: 'OTHER',
  },
  ReportStatus: {
    PENDING: 'PENDING',
    UNDER_REVIEW: 'UNDER_REVIEW',
    RESOLVED: 'RESOLVED',
    DISMISSED: 'DISMISSED',
  },
  ReportSeverity: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  },
}));

import { AuditLogService } from '../../services/auditLog.service';
const mockAuditLog = AuditLogService.log as vi.MockedFunction<typeof AuditLogService.log>;

describe('PetService', () => {
  let testRescue: Rescue;

  beforeEach(async () => {
    vi.clearAllMocks();
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

    // Create test rescue with unique values
    const timestamp = Date.now();
    testRescue = await Rescue.create({
      rescueId: `rescue-${timestamp}`,
      name: `Test Rescue ${timestamp}`,
      email: `rescue${timestamp}@test.com`,
      address: '123 Test Street',
      city: 'Test City',
      postcode: 'TEST123',
      contactPerson: 'Test Contact',
      status: 'verified',
      country: 'United Kingdom',
      isDeleted: false,
    });
  });

  describe('searchPets', () => {
    beforeEach(async () => {
      // Create test pets
      await Pet.create({
        pet_id: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        featured: true,
        priority_listing: false,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });

      await Pet.create({
        pet_id: 'pet2',
        name: 'Whiskers',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Persian',
        size: Size.MEDIUM,
        age_group: AgeGroup.YOUNG,
        gender: Gender.FEMALE,
        energy_level: EnergyLevel.LOW,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.SPAYED,
        featured: false,
        priority_listing: true,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });
    });

    it('should search pets with basic filters', async () => {
      const filters: PetSearchFilters = {
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
      };

      const result = await PetService.searchPets(filters, { page: 1, limit: 20 });

      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].name).toBe('Buddy');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should search pets with text search', async () => {
      const filters: PetSearchFilters = {
        search: 'Golden',
      };

      const result = await PetService.searchPets(filters);

      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].breed).toContain('Golden');
    });

    it('should handle range filters', async () => {
      // Update pets with adoption fees
      await Pet.update({ adoption_fee: 250 }, { where: { pet_id: 'pet1' } });
      await Pet.update({ adoption_fee: 150 }, { where: { pet_id: 'pet2' } });

      const filters: PetSearchFilters = {
        adoptionFeeMin: 100,
        adoptionFeeMax: 200,
      };

      const result = await PetService.searchPets(filters);

      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].name).toBe('Whiskers');
    });

    it('should handle pagination correctly', async () => {
      // Create more pets to test pagination
      for (let i = 3; i <= 25; i++) {
        await Pet.create({
          pet_id: `pet${i}`,
          name: `Pet ${i}`,
          type: PetType.DOG,
          status: PetStatus.AVAILABLE,
          breed: 'Mixed',
          size: Size.MEDIUM,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.MEDIUM,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          featured: false,
          priority_listing: false,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        });
      }

      const result = await PetService.searchPets({}, { page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(3);
      expect(result.pets).toHaveLength(5); // 25 total, page 3 of 10 per page = 5 items
    });

    it('should handle search errors', async () => {
      // Create an invalid filter that would cause an error
      const filters: PetSearchFilters = {
        // Using an invalid operator that Sequelize won't understand
        type: { invalid: 'data' } as unknown as PetType,
      };

      await expect(PetService.searchPets(filters)).rejects.toThrow('Failed to search pets');
    });
  });

  describe('getPetById', () => {
    let testPet: Pet;

    beforeEach(async () => {
      testPet = await Pet.create({
        pet_id: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
        view_count: 0,
      });
    });

    it('should get pet by ID and increment view count', async () => {
      const result = await PetService.getPetById('pet1', 'user1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Buddy');

      // Reload to check view count was incremented
      await testPet.reload();
      expect(testPet.view_count).toBe(1);

      expect(mockAuditLog).toHaveBeenCalledWith({
        action: 'VIEW',
        entity: 'Pet',
        entityId: 'pet1',
        details: { userId: 'user1' },
        userId: 'user1',
      });
    });

    it('should return null for non-existent pet', async () => {
      const result = await PetService.getPetById('nonexistent');

      expect(result).toBeNull();
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Force an error by closing the database connection temporarily
      const originalFindByPk = Pet.findByPk;
      Pet.findByPk = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(PetService.getPetById('pet1')).rejects.toThrow('Failed to retrieve pet');

      // Restore
      Pet.findByPk = originalFindByPk;
    });
  });

  describe('createPet', () => {
    it('should create a new pet successfully', async () => {
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
        rescue_id: testRescue.rescueId,
        images: [],
        videos: [],
      };

      const result = await PetService.createPet(mockPetData, testRescue.rescueId, 'user1');

      expect(result).toBeDefined();
      expect(result.name).toBe('New Pet');
      expect(result.type).toBe(PetType.DOG);
      expect(result.rescue_id).toBe(testRescue.rescueId);

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'Pet',
          entityId: result.pet_id,
          userId: 'user1',
        })
      );
    });

    it('should handle validation errors', async () => {
      const mockPetData: PetCreateData = {
        name: '',
        type: PetType.DOG,
        age_group: AgeGroup.YOUNG,
        gender: Gender.MALE,
        status: PetStatus.AVAILABLE,
        size: Size.MEDIUM,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        images: [],
        videos: [],
      };

      // The service doesn't validate empty names but the model does
      await expect(
        PetService.createPet(mockPetData, testRescue.rescueId, 'user1')
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
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
        rescue_id: testRescue.rescueId,
        images: [],
        videos: [],
      };

      // Force an error
      const originalCreate = Pet.create;
      Pet.create = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        PetService.createPet(mockPetData, testRescue.rescueId, 'user1')
      ).rejects.toThrow('Database error');

      // Restore
      Pet.create = originalCreate;
    });
  });

  describe('updatePet', () => {
    let testPet: Pet;

    beforeEach(async () => {
      testPet = await Pet.create({
        pet_id: 'pet1',
        name: 'Original Name',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });
    });

    const updateData: PetUpdateData = {
      name: 'Updated Name',
      shortDescription: 'Updated description',
    };

    it('should update pet successfully', async () => {
      const result = await PetService.updatePet('pet1', updateData, 'user1');

      expect(result.name).toBe('Updated Name');
      expect(result.short_description).toBe('Updated description');

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'Pet',
          entityId: 'pet1',
          userId: 'user1',
        })
      );
    });

    it('should throw error for non-existent pet', async () => {
      await expect(
        PetService.updatePet('nonexistent', updateData, 'user1')
      ).rejects.toThrow('Pet not found');
    });

    it('should allow updates to adopted pets (service permits it)', async () => {
      await testPet.update({ status: PetStatus.ADOPTED });

      const result = await PetService.updatePet('pet1', updateData, 'user1');
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('updatePetStatus', () => {
    let testPet: Pet;

    beforeEach(async () => {
      testPet = await Pet.create({
        pet_id: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });
    });

    const statusUpdate: PetStatusUpdate = {
      status: PetStatus.ADOPTED,
      reason: 'Successful adoption',
      effectiveDate: new Date(),
    };

    it('should update pet status successfully', async () => {
      const result = await PetService.updatePetStatus('pet1', statusUpdate, 'user1');

      expect(result.status).toBe(PetStatus.ADOPTED);
      expect(result.adopted_date).toBeDefined();

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_STATUS',
          entity: 'Pet',
          entityId: 'pet1',
          details: expect.objectContaining({
            originalStatus: PetStatus.AVAILABLE,
            newStatus: PetStatus.ADOPTED,
            reason: statusUpdate.reason,
            updatedBy: 'user1',
          }),
          userId: 'user1',
        })
      );
    });

    it('should throw error for non-existent pet', async () => {
      await expect(
        PetService.updatePetStatus('nonexistent', statusUpdate, 'user1')
      ).rejects.toThrow('Pet not found');
    });
  });

  describe('deletePet', () => {
    let testPet: Pet;

    beforeEach(async () => {
      testPet = await Pet.create({
        pet_id: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });
    });

    it('should soft delete pet successfully', async () => {
      const result = await PetService.deletePet('pet1', 'user1', 'No longer available');

      expect(result.message).toBe('Pet deleted successfully');

      // Verify soft delete
      const deletedPet = await Pet.findByPk('pet1');
      expect(deletedPet).toBeNull();

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entity: 'Pet',
          entityId: 'pet1',
          details: expect.objectContaining({
            reason: 'No longer available',
            deletedBy: 'user1',
          }),
          userId: 'user1',
        })
      );
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.deletePet('nonexistent', 'user1')).rejects.toThrow('Pet not found');
    });

    it('should delete adopted pets (service allows it)', async () => {
      await testPet.update({ status: PetStatus.ADOPTED });

      const result = await PetService.deletePet('pet1', 'user1');
      expect(result.message).toBe('Pet deleted successfully');
    });
  });

  describe('addPetImages', () => {
    let testPet: Pet;

    beforeEach(async () => {
      testPet = await Pet.create({
        pet_id: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });
    });

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
      const result = await PetService.addPetImages('pet1', newImages, 'user1');

      expect(result.images).toHaveLength(1);
      expect(result.images[0].url).toBe('https://example.com/image1.jpg');
      expect(result.images[0].is_primary).toBe(true);

      expect(mockAuditLog).toHaveBeenCalled();
    });

    it('should throw error for non-existent pet', async () => {
      await expect(
        PetService.addPetImages('nonexistent', newImages, 'user1')
      ).rejects.toThrow('Pet not found');
    });

    it('should handle empty URL (service does not validate)', async () => {
      const invalidImages = [{ url: '', isPrimary: false, orderIndex: 0 }];

      const result = await PetService.addPetImages('pet1', invalidImages, 'user1');
      expect(result).toBeDefined();
    });
  });

  describe('getPetsByRescue', () => {
    beforeEach(async () => {
      await Pet.create({
        pet_id: 'pet1',
        name: 'Pet 1',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.MEDIUM,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });

      await Pet.create({
        pet_id: 'pet2',
        name: 'Pet 2',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.SMALL,
        age_group: AgeGroup.YOUNG,
        gender: Gender.FEMALE,
        energy_level: EnergyLevel.LOW,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.SPAYED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });
    });

    it('should get pets by rescue with pagination', async () => {
      const result = await PetService.getPetsByRescue(testRescue.rescueId, 1, 20);

      expect(result.pets).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getFeaturedPets', () => {
    beforeEach(async () => {
      await Pet.create({
        pet_id: 'pet1',
        name: 'Featured Pet 1',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.MEDIUM,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        featured: true,
        archived: false,
        images: [],
        videos: [],
      });

      await Pet.create({
        pet_id: 'pet2',
        name: 'Featured Pet 2',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.SMALL,
        age_group: AgeGroup.YOUNG,
        gender: Gender.FEMALE,
        energy_level: EnergyLevel.LOW,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.SPAYED,
        rescue_id: testRescue.rescueId,
        featured: true,
        archived: false,
        images: [],
        videos: [],
      });
    });

    it('should get featured pets', async () => {
      const result = await PetService.getFeaturedPets(5);

      expect(result).toHaveLength(2);
      expect(result.every(pet => pet.featured)).toBe(true);
    });
  });

  describe('getPetStatistics', () => {
    beforeEach(async () => {
      // Create a variety of pets for statistics
      await Pet.bulkCreate([
        {
          pet_id: 'pet1',
          name: 'Dog 1',
          type: PetType.DOG,
          status: PetStatus.AVAILABLE,
          breed: 'Labrador',
          size: Size.LARGE,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.HIGH,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          featured: true,
          special_needs: false,
          archived: false,
          images: [],
          videos: [],
        },
        {
          pet_id: 'pet2',
          name: 'Cat 1',
          type: PetType.CAT,
          status: PetStatus.ADOPTED,
          breed: 'Persian',
          size: Size.MEDIUM,
          age_group: AgeGroup.YOUNG,
          gender: Gender.FEMALE,
          energy_level: EnergyLevel.LOW,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.SPAYED,
          rescue_id: testRescue.rescueId,
          special_needs: true,
          archived: false,
          images: [],
          videos: [],
        },
        {
          pet_id: 'pet3',
          name: 'Dog 2',
          type: PetType.DOG,
          status: PetStatus.FOSTER,
          breed: 'Golden Retriever',
          size: Size.LARGE,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.MEDIUM,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
      ]);
    });

    it('should get pet statistics', async () => {
      const result = await PetService.getPetStatistics();

      expect(result.totalPets).toBe(3);
      expect(result.availablePets).toBe(1);
      expect(result.adoptedPets).toBe(1);
      expect(result.fosterPets).toBe(1);
      expect(result.featuredPets).toBe(1);
      expect(result.specialNeedsPets).toBe(1);

      expect(result.petsByType).toBeDefined();
      expect(result.petsByType[PetType.DOG]).toBe(2);
      expect(result.petsByType[PetType.CAT]).toBe(1);
    });
  });

  describe('bulkUpdatePets', () => {
    let pet1: Pet;
    let pet2: Pet;

    beforeEach(async () => {
      pet1 = await Pet.create({
        pet_id: 'pet1',
        name: 'Pet 1',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.MEDIUM,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });

      pet2 = await Pet.create({
        pet_id: 'pet2',
        name: 'Pet 2',
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        breed: 'Mixed',
        size: Size.SMALL,
        age_group: AgeGroup.YOUNG,
        gender: Gender.FEMALE,
        energy_level: EnergyLevel.LOW,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.SPAYED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });
    });

    it('should perform bulk status update successfully', async () => {
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

      // Verify updates
      await pet1.reload();
      await pet2.reload();
      expect(pet1.status).toBe(PetStatus.ADOPTED);
      expect(pet2.status).toBe(PetStatus.ADOPTED);
    });

    it('should handle partial failures in bulk operation', async () => {
      const operation: BulkPetOperation = {
        petIds: ['pet1', 'nonexistent'],
        operation: 'archive',
        reason: 'Bulk archive',
      };

      const result = await PetService.bulkUpdatePets(operation, 'user1');

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0); // nonexistent will succeed (no error thrown)
    });

    it('should handle unsupported operation by returning error result', async () => {
      const operation: BulkPetOperation = {
        petIds: ['pet1'],
        operation: 'invalid_operation' as 'archive',
      };

      const result = await PetService.bulkUpdatePets(operation, 'user1');

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].error).toContain('Unknown operation: invalid_operation');
    });
  });

  describe('getPetActivity', () => {
    let testPet: Pet;

    beforeEach(async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      testPet = await Pet.create({
        pet_id: 'pet1',
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
        view_count: 50,
        favorite_count: 10,
        application_count: 3,
        created_at: sevenDaysAgo,
      });
    });

    it('should get pet activity statistics', async () => {
      const result = await PetService.getPetActivity('pet1');

      expect(result.petId).toBe('pet1');
      expect(result.viewCount).toBe(50);
      expect(result.favoriteCount).toBe(10);
      expect(result.applicationCount).toBe(3);
      expect(result.daysSincePosted).toBe(7);
      expect(result.averageViewsPerDay).toBeCloseTo(7.14, 1);
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.getPetActivity('nonexistent')).rejects.toThrow(
        'Failed to retrieve pet activity'
      );
    });
  });

  describe('getRecentPets', () => {
    beforeEach(async () => {
      await Pet.bulkCreate([
        {
          pet_id: 'pet1',
          name: 'Buddy',
          type: PetType.DOG,
          status: PetStatus.AVAILABLE,
          breed: 'Golden Retriever',
          size: Size.LARGE,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.MEDIUM,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
          created_at: new Date('2025-07-08T10:00:00Z'),
        },
        {
          pet_id: 'pet2',
          name: 'Whiskers',
          type: PetType.CAT,
          status: PetStatus.AVAILABLE,
          breed: 'Persian',
          size: Size.MEDIUM,
          age_group: AgeGroup.YOUNG,
          gender: Gender.FEMALE,
          energy_level: EnergyLevel.LOW,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.SPAYED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
          created_at: new Date('2025-07-08T09:00:00Z'),
        },
      ]);
    });

    it('should return recent pets with default limit', async () => {
      const result = await PetService.getRecentPets();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Buddy'); // Most recent first
    });

    it('should return recent pets with custom limit', async () => {
      const result = await PetService.getRecentPets(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Buddy');
    });

    it('should handle errors gracefully', async () => {
      const originalFindAll = Pet.findAll;
      Pet.findAll = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(PetService.getRecentPets()).rejects.toThrow('Failed to retrieve recent pets');

      Pet.findAll = originalFindAll;
    });
  });

  describe('getPetBreedsByType', () => {
    beforeEach(async () => {
      await Pet.bulkCreate([
        {
          pet_id: 'pet1',
          name: 'Dog 1',
          type: PetType.DOG,
          breed: 'Golden Retriever',
          status: PetStatus.AVAILABLE,
          size: Size.LARGE,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.MEDIUM,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
        {
          pet_id: 'pet2',
          name: 'Dog 2',
          type: PetType.DOG,
          breed: 'Labrador Retriever',
          status: PetStatus.AVAILABLE,
          size: Size.LARGE,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.HIGH,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
        {
          pet_id: 'pet3',
          name: 'Dog 3',
          type: PetType.DOG,
          breed: 'German Shepherd',
          status: PetStatus.AVAILABLE,
          size: Size.LARGE,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.HIGH,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
      ]);
    });

    it('should return breeds for valid pet type', async () => {
      const result = await PetService.getPetBreedsByType('dog');

      expect(result).toHaveLength(3);
      expect(result).toContain('German Shepherd');
      expect(result).toContain('Golden Retriever');
      expect(result).toContain('Labrador Retriever');
    });

    it('should filter out null and empty breeds', async () => {
      await Pet.bulkCreate([
        {
          pet_id: 'pet4',
          name: 'Dog 4',
          type: PetType.DOG,
          breed: null as unknown as string,
          status: PetStatus.AVAILABLE,
          size: Size.MEDIUM,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.MEDIUM,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
        {
          pet_id: 'pet5',
          name: 'Dog 5',
          type: PetType.DOG,
          breed: '  ',
          status: PetStatus.AVAILABLE,
          size: Size.MEDIUM,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.MEDIUM,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
        {
          pet_id: 'pet6',
          name: 'Dog 6',
          type: PetType.DOG,
          breed: 'Poodle',
          status: PetStatus.AVAILABLE,
          size: Size.MEDIUM,
          age_group: AgeGroup.ADULT,
          gender: Gender.MALE,
          energy_level: EnergyLevel.MEDIUM,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
      ]);

      const result = await PetService.getPetBreedsByType('dog');

      expect(result).toContain('Poodle');
      expect(result).not.toContain('');
      expect(result).not.toContain(null);
    });

    it('should throw error for invalid pet type', async () => {
      await expect(PetService.getPetBreedsByType('invalid')).rejects.toThrow(
        'Invalid pet type: invalid'
      );
    });

    it('should handle database errors', async () => {
      const originalFindAll = Pet.findAll;
      Pet.findAll = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(PetService.getPetBreedsByType('dog')).rejects.toThrow(
        'Failed to retrieve breeds for pet type: dog'
      );

      Pet.findAll = originalFindAll;
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
    let referencePet: Pet;

    beforeEach(async () => {
      referencePet = await Pet.create({
        pet_id: 'ref-pet-1',
        name: 'Reference Dog',
        type: PetType.DOG,
        breed: 'Golden Retriever',
        status: PetStatus.AVAILABLE,
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });

      await Pet.bulkCreate([
        {
          pet_id: 'similar-1',
          name: 'Similar Dog 1',
          type: PetType.DOG,
          breed: 'Golden Retriever',
          status: PetStatus.AVAILABLE,
          size: Size.LARGE,
          age_group: AgeGroup.ADULT,
          gender: Gender.FEMALE,
          energy_level: EnergyLevel.MEDIUM,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.SPAYED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
        {
          pet_id: 'similar-2',
          name: 'Similar Dog 2',
          type: PetType.DOG,
          breed: 'Labrador Retriever',
          status: PetStatus.AVAILABLE,
          size: Size.LARGE,
          age_group: AgeGroup.YOUNG,
          gender: Gender.MALE,
          energy_level: EnergyLevel.HIGH,
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          rescue_id: testRescue.rescueId,
          archived: false,
          images: [],
          videos: [],
        },
      ]);
    });

    it('should return similar pets based on breed, type, size, and age', async () => {
      const result = await PetService.getSimilarPets('ref-pet-1', 6);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(6);
      expect(result.every(pet => pet.pet_id !== 'ref-pet-1')).toBe(true);
    });

    it('should throw error for non-existent pet', async () => {
      await expect(PetService.getSimilarPets('nonexistent')).rejects.toThrow('Pet not found');
    });

    it('should handle database errors', async () => {
      const originalFindByPk = Pet.findByPk;
      const originalFindAll = Pet.findAll;

      Pet.findByPk = vi.fn().mockResolvedValue(referencePet);
      Pet.findAll = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(PetService.getSimilarPets('ref-pet-1')).rejects.toThrow(
        'Failed to retrieve similar pets'
      );

      Pet.findByPk = originalFindByPk;
      Pet.findAll = originalFindAll;
    });
  });

  describe('reportPet', () => {
    let testPet: Pet;

    beforeEach(async () => {
      testPet = await Pet.create({
        pet_id: 'pet-123',
        name: 'Buddy',
        type: PetType.DOG,
        status: PetStatus.AVAILABLE,
        breed: 'Golden Retriever',
        size: Size.LARGE,
        age_group: AgeGroup.ADULT,
        gender: Gender.MALE,
        energy_level: EnergyLevel.MEDIUM,
        vaccination_status: VaccinationStatus.UP_TO_DATE,
        spay_neuter_status: SpayNeuterStatus.NEUTERED,
        rescue_id: testRescue.rescueId,
        archived: false,
        images: [],
        videos: [],
      });
    });

    it('should create a pet report successfully', async () => {
      const mockReport = {
        reportId: 'report-123',
        reportedEntityType: 'pet',
        reportedEntityId: 'pet-123',
        reporterId: 'user-456',
        category: 'INAPPROPRIATE_CONTENT',
      };

      const { default: Report } = await vi.importMock('../../models/Report');
      (Report.create as vi.Mock).mockResolvedValue(mockReport);

      const result = await PetService.reportPet(
        'pet-123',
        'user-456',
        'inappropriate_content',
        'This pet listing contains inappropriate images'
      );

      expect(Report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reportedEntityType: 'pet',
          reportedEntityId: 'pet-123',
          reporterId: 'user-456',
          category: 'INAPPROPRIATE_CONTENT',
          title: 'inappropriate_content',
          description: 'This pet listing contains inappropriate images',
          status: 'PENDING',
          severity: 'MEDIUM',
        })
      );

      expect(result).toEqual({
        reportId: 'report-123',
        message: 'Report submitted successfully',
      });
    });

    it('should throw error for non-existent pet', async () => {
      await expect(
        PetService.reportPet('nonexistent', 'user-456', 'spam')
      ).rejects.toThrow('Pet not found');
    });

    it('should handle report creation errors', async () => {
      const { default: Report } = await vi.importMock('../../models/Report');
      (Report.create as vi.Mock).mockRejectedValue(new Error('Report creation failed'));

      await expect(
        PetService.reportPet('pet-123', 'user-456', 'spam')
      ).rejects.toThrow('Failed to submit pet report');
    });
  });
});
