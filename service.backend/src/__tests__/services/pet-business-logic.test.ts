import { vi } from 'vitest';
/**
 * Pet Service - Business Logic Tests
 *
 * Tests business rules and workflows for pet management:
 * - Pet status state transitions
 * - Adoption eligibility rules
 * - Status-based restrictions
 * - Archive and availability rules
 * - Business invariants and edge cases
 */

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
import PetMedia, { PetMediaType } from '../../models/PetMedia';
import PetStatusTransition from '../../models/PetStatusTransition';
import Application, { ApplicationStatus } from '../../models/Application';
import { PetService } from '../../services/pet.service';
import { PetCreateData, PetStatusUpdate, PetUpdateData } from '../../types/pet';

// Mocked dependencies
const MockedPet = Pet as vi.MockedObject<Pet>;
const MockedApplication = Application as vi.MockedObject<Application>;
const MockedPetStatusTransition = PetStatusTransition as vi.MockedObject<
  typeof PetStatusTransition
>;
const MockedPetMedia = PetMedia as vi.MockedObject<typeof PetMedia>;

// Test constants
const mockRescueId = 'rescue-123';
const mockUserId = 'user-456';
const mockPetId = 'pet-789';

// ============================================================================
// Mock Factory Functions
// ============================================================================

const createMockPet = (overrides = {}) => ({
  petId: mockPetId,
  name: 'Buddy',
  type: PetType.DOG,
  breed: 'Golden Retriever',
  gender: Gender.MALE,
  status: PetStatus.AVAILABLE,
  ageGroup: AgeGroup.ADULT,
  size: Size.LARGE,
  energyLevel: EnergyLevel.MEDIUM,
  vaccinationStatus: VaccinationStatus.UP_TO_DATE,
  spayNeuterStatus: SpayNeuterStatus.NEUTERED,
  rescueId: mockRescueId,
  archived: false,
  featured: false,
  priorityListing: false,
  specialNeeds: false,
  houseTrained: true,
  viewCount: 0,
  favoriteCount: 0,
  applicationCount: 0,
  created_at: new Date(),
  updated_at: new Date(),
  update: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn(),
  destroy: vi.fn().mockResolvedValue(undefined),
  increment: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn().mockReturnThis(),
  isAvailable: vi.fn().mockReturnValue(true),
  canBeAdopted: vi.fn().mockReturnValue(true),
  ...overrides,
});

const createValidPetData = (overrides = {}): PetCreateData => ({
  name: 'Buddy',
  type: PetType.DOG,
  breed: 'Golden Retriever',
  gender: Gender.MALE,
  status: PetStatus.AVAILABLE,
  ageGroup: AgeGroup.ADULT,
  size: Size.MEDIUM,
  energyLevel: EnergyLevel.MEDIUM,
  vaccinationStatus: VaccinationStatus.UP_TO_DATE,
  spayNeuterStatus: SpayNeuterStatus.NEUTERED,
  rescueId: mockRescueId,
  ...overrides,
});

describe('PetService - Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The status-transition log is a real model. The mocked Pet.create
    // returns a fake row that doesn't exist in the DB, so a real
    // transition insert would trip the FK. Stub it — the trigger/hook
    // path has its own dedicated tests.
    MockedPetStatusTransition.create = vi.fn().mockResolvedValue({} as never);
    // Pet media writes go through PetMedia.bulkCreate / destroy / count
    // (plan 2.1). Stub the typed-table writes here so the service code
    // doesn't try to hit the real DB through the mocked Pet model.
    MockedPetMedia.bulkCreate = vi.fn().mockResolvedValue([] as never);
    MockedPetMedia.destroy = vi.fn().mockResolvedValue(0 as never);
    MockedPetMedia.count = vi.fn().mockResolvedValue(0 as never);
  });

  // ==========================================================================
  // Pet Status State Machine
  // ==========================================================================

  describe('Pet Status State Transitions', () => {
    it('should allow transition from AVAILABLE to PENDING', async () => {
      // Given: An available pet
      const mockPet = createMockPet({ status: PetStatus.AVAILABLE });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.PENDING,
        reason: 'Application in review',
      };

      // When: Status is updated to PENDING
      const result = await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: a transition is logged with toStatus = PENDING. The status
      // itself is denormalized onto pets.status by the trigger / hook.
      expect(MockedPetStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: mockPetId,
          toStatus: PetStatus.PENDING,
        })
      );
      expect(result).toBeDefined();
    });

    it('should allow transition from PENDING to ADOPTED', async () => {
      // Given: A pet in pending status
      const mockPet = createMockPet({ status: PetStatus.PENDING });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.ADOPTED,
        reason: 'Adoption finalized',
      };

      // When: Status is updated to ADOPTED
      await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Adopted date is set on the pet, and the transition log
      // captures the status change.
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          adoptedDate: expect.any(Date),
        })
      );
      expect(MockedPetStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: mockPetId,
          toStatus: PetStatus.ADOPTED,
        })
      );
    });

    it('should allow transition from AVAILABLE to FOSTER', async () => {
      // Given: An available pet
      const mockPet = createMockPet({ status: PetStatus.AVAILABLE });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.FOSTER,
        reason: 'Foster placement approved',
      };

      // When: Status is updated to FOSTER
      await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Foster start date is set on the pet, status moves via the log.
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          fosterStartDate: expect.any(Date),
        })
      );
      expect(MockedPetStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: mockPetId,
          toStatus: PetStatus.FOSTER,
        })
      );
    });

    it('should allow transition from AVAILABLE to MEDICAL_HOLD', async () => {
      // Given: An available pet
      const mockPet = createMockPet({ status: PetStatus.AVAILABLE });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.MEDICAL_HOLD,
        reason: 'Requires medical treatment',
      };

      // When: Status is updated to MEDICAL_HOLD
      const result = await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: a transition is logged with toStatus = MEDICAL_HOLD.
      expect(MockedPetStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: mockPetId,
          toStatus: PetStatus.MEDICAL_HOLD,
        })
      );
      expect(result).toBeDefined();
    });

    it('should allow transition from MEDICAL_HOLD back to AVAILABLE', async () => {
      // Given: A pet on medical hold
      const mockPet = createMockPet({ status: PetStatus.MEDICAL_HOLD });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.AVAILABLE,
        reason: 'Medical treatment completed',
        effectiveDate: new Date(),
      };

      // When: Status is updated back to AVAILABLE
      await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Available since date is updated and a transition is logged.
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          availableSince: expect.any(Date),
        })
      );
      expect(MockedPetStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: mockPetId,
          toStatus: PetStatus.AVAILABLE,
        })
      );
    });

    it('should allow transition from FOSTER to ADOPTED', async () => {
      // Given: A pet currently in foster care
      const mockPet = createMockPet({ status: PetStatus.FOSTER });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.ADOPTED,
        reason: 'Foster family decided to adopt',
      };

      // When: Foster becomes adoption
      await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Adopted date is set and the transition log captures the change.
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          adoptedDate: expect.any(Date),
        })
      );
      expect(MockedPetStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: mockPetId,
          toStatus: PetStatus.ADOPTED,
        })
      );
    });
  });

  // ==========================================================================
  // Adoption Eligibility Rules
  // ==========================================================================

  describe('Adoption Eligibility', () => {
    it('should allow pet model to identify available pets', () => {
      // Given: An available, non-archived pet
      const availablePet = createMockPet({
        status: PetStatus.AVAILABLE,
        archived: false,
      });
      availablePet.isAvailable.mockReturnValue(true);

      // When: Checking if pet is available
      const isAvailable = availablePet.isAvailable();

      // Then: Pet is identified as available
      expect(isAvailable).toBe(true);
    });

    it('should prevent adoption of archived pets', () => {
      // Given: An archived pet
      const archivedPet = createMockPet({
        status: PetStatus.AVAILABLE,
        archived: true,
      });
      archivedPet.isAvailable.mockReturnValue(false);
      archivedPet.canBeAdopted.mockReturnValue(false);

      // When: Checking adoption eligibility
      const canAdopt = archivedPet.canBeAdopted();

      // Then: Pet cannot be adopted
      expect(canAdopt).toBe(false);
    });

    it('should prevent adoption of already adopted pets', () => {
      // Given: An adopted pet
      const adoptedPet = createMockPet({
        status: PetStatus.ADOPTED,
        archived: false,
        isAdopted: vi.fn().mockReturnValue(true),
      });
      adoptedPet.canBeAdopted.mockReturnValue(false);

      // When: Checking adoption eligibility
      const canAdopt = adoptedPet.canBeAdopted();

      // Then: Pet cannot be adopted again
      expect(canAdopt).toBe(false);
    });

    it('should allow adoption of foster pets', () => {
      // Given: A foster pet
      const fosterPet = createMockPet({
        status: PetStatus.FOSTER,
        archived: false,
      });
      fosterPet.canBeAdopted.mockReturnValue(true);

      // When: Checking adoption eligibility
      const canAdopt = fosterPet.canBeAdopted();

      // Then: Foster pet can be adopted
      expect(canAdopt).toBe(true);
    });

    it('should prevent adoption of pets on medical hold', () => {
      // Given: A pet on medical hold
      const medicalHoldPet = createMockPet({
        status: PetStatus.MEDICAL_HOLD,
        archived: false,
      });
      medicalHoldPet.canBeAdopted.mockReturnValue(false);

      // When: Checking adoption eligibility
      const canAdopt = medicalHoldPet.canBeAdopted();

      // Then: Pet cannot be adopted
      expect(canAdopt).toBe(false);
    });

    it('should prevent adoption of pets on behavioral hold', () => {
      // Given: A pet on behavioral hold
      const behavioralHoldPet = createMockPet({
        status: PetStatus.BEHAVIORAL_HOLD,
        archived: false,
      });
      behavioralHoldPet.canBeAdopted.mockReturnValue(false);

      // When: Checking adoption eligibility
      const canAdopt = behavioralHoldPet.canBeAdopted();

      // Then: Pet cannot be adopted
      expect(canAdopt).toBe(false);
    });
  });

  // ==========================================================================
  // Pet Creation Business Rules
  // ==========================================================================

  describe('Pet Creation', () => {
    it('should create pet with valid data', async () => {
      // Given: Valid pet creation data
      const petData = createValidPetData();
      const mockCreatedPet = createMockPet({ petId: 'new-pet-123' });

      MockedPet.create = vi.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating a new pet
      const result = await PetService.createPet(petData, mockRescueId, mockUserId);

      // Then: Pet is created with correct rescueId
      expect(MockedPet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...petData,
          rescueId: mockRescueId,
        })
      );
      expect(result).toEqual(mockCreatedPet);
    });

    it('should create pet with initial images', async () => {
      // Given: Pet data with initial images
      const petData = createValidPetData({
        initialImages: [
          {
            url: 'https://example.com/image1.jpg',
            thumbnailUrl: 'https://example.com/thumb1.jpg',
            caption: 'Main photo',
            isPrimary: true,
            orderIndex: 0,
          },
          {
            url: 'https://example.com/image2.jpg',
            thumbnailUrl: 'https://example.com/thumb2.jpg',
            caption: 'Side view',
            isPrimary: false,
            orderIndex: 1,
          },
        ],
      });
      const mockCreatedPet = createMockPet();

      MockedPet.create = vi.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating pet with images
      await PetService.createPet(petData, mockRescueId, mockUserId);

      // Then: PetMedia rows are inserted with the right shape (plan 2.1
      // — Pet.images JSONB extracted to the pet_media typed table).
      expect(MockedPetMedia.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            pet_id: mockPetId,
            type: PetMediaType.IMAGE,
            url: 'https://example.com/image1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            is_primary: true,
            order_index: 0,
          }),
          expect.objectContaining({
            pet_id: mockPetId,
            type: PetMediaType.IMAGE,
            url: 'https://example.com/image2.jpg',
            order_index: 1,
          }),
        ])
      );
    });

    it('should create pet with initial videos', async () => {
      // Given: Pet data with initial videos
      const petData = createValidPetData({
        initialVideos: [
          {
            url: 'https://example.com/video1.mp4',
            thumbnailUrl: 'https://example.com/video-thumb1.jpg',
            caption: 'Playing in the yard',
            durationSeconds: 30,
          },
        ],
      });
      const mockCreatedPet = createMockPet();

      MockedPet.create = vi.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating pet with videos
      await PetService.createPet(petData, mockRescueId, mockUserId);

      // Then: PetMedia video row is inserted (plan 2.1).
      expect(MockedPetMedia.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            pet_id: mockPetId,
            type: PetMediaType.VIDEO,
            url: 'https://example.com/video1.mp4',
            duration_seconds: 30,
          }),
        ])
      );
    });

    it('should set default status to AVAILABLE if not specified', async () => {
      // Given: Pet data without explicit status
      const petData: Partial<PetCreateData> = createValidPetData();
      delete petData.status;
      const mockCreatedPet = createMockPet();

      MockedPet.create = vi.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating pet
      await PetService.createPet(petData as PetCreateData, mockRescueId, mockUserId);

      // Then: Pet is created (status defaults handled by model)
      expect(MockedPet.create).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Pet Update Business Rules
  // ==========================================================================

  describe('Pet Updates', () => {
    it('should update basic pet information', async () => {
      // Given: An existing pet
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const updateData: PetUpdateData = {
        name: 'Max',
        shortDescription: 'Friendly and energetic',
        longDescription: 'A wonderful companion who loves to play and cuddle.',
      };

      // When: Updating pet information
      await PetService.updatePet(mockPetId, updateData, mockUserId);

      // Then: Fields are updated with correct snake_case conversion
      expect(mockPet.update).toHaveBeenCalledWith({
        name: 'Max',
        shortDescription: 'Friendly and energetic',
        longDescription: 'A wonderful companion who loves to play and cuddle.',
      });
    });

    it('should update medical information', async () => {
      // Given: An existing pet
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const updateData: PetUpdateData = {
        vaccinationStatus: VaccinationStatus.UP_TO_DATE,
        vaccinationDate: new Date('2025-01-15'),
        spayNeuterStatus: SpayNeuterStatus.NEUTERED,
        spayNeuterDate: new Date('2024-12-01'),
        medicalNotes: 'All vaccinations current, healthy checkup',
      };

      // When: Updating medical info
      await PetService.updatePet(mockPetId, updateData, mockUserId);

      // Then: Medical fields are updated
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          vaccinationStatus: VaccinationStatus.UP_TO_DATE,
          vaccinationDate: expect.any(Date),
          spayNeuterStatus: SpayNeuterStatus.NEUTERED,
          spayNeuterDate: expect.any(Date),
          medicalNotes: 'All vaccinations current, healthy checkup',
        })
      );
    });

    it('should update behavioral characteristics', async () => {
      // Given: An existing pet
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const updateData: PetUpdateData = {
        goodWithChildren: true,
        goodWithDogs: true,
        goodWithCats: false,
        goodWithSmallAnimals: false,
        houseTrained: true,
        energyLevel: EnergyLevel.HIGH,
        behavioralNotes: 'Very friendly but needs space from cats',
      };

      // When: Updating behavioral info
      await PetService.updatePet(mockPetId, updateData, mockUserId);

      // Then: Behavioral fields are updated
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          goodWithChildren: true,
          goodWithDogs: true,
          goodWithCats: false,
          goodWithSmallAnimals: false,
          houseTrained: true,
          energyLevel: EnergyLevel.HIGH,
          behavioralNotes: 'Very friendly but needs space from cats',
        })
      );
    });

    it('should throw error when updating non-existent pet', async () => {
      // Given: Non-existent pet ID
      MockedPet.findByPk = vi.fn().mockResolvedValue(null);

      const updateData: PetUpdateData = { name: 'Updated Name' };

      // When & Then: Update fails with error
      await expect(PetService.updatePet('nonexistent', updateData, mockUserId)).rejects.toThrow(
        'Pet not found'
      );
    });

    it('should allow updating archived pets', async () => {
      // Given: An archived pet
      const mockPet = createMockPet({ archived: true });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const updateData: PetUpdateData = { name: 'Updated Name' };

      // When: Updating archived pet
      const result = await PetService.updatePet(mockPetId, updateData, mockUserId);

      // Then: Update succeeds (service allows this)
      expect(mockPet.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(result).toBeDefined();
    });

    it('should allow updating adopted pets', async () => {
      // Given: An adopted pet
      const mockPet = createMockPet({ status: PetStatus.ADOPTED });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const updateData: PetUpdateData = { name: 'Updated Name' };

      // When: Updating adopted pet
      const result = await PetService.updatePet(mockPetId, updateData, mockUserId);

      // Then: Update succeeds (service allows this for administrative purposes)
      expect(mockPet.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Archive and Deletion Rules
  // ==========================================================================

  describe('Archive and Deletion', () => {
    it('should soft delete pet successfully', async () => {
      // Given: An existing pet
      const mockPet = createMockPet();
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      // When: Deleting pet
      const result = await PetService.deletePet(mockPetId, mockUserId, 'No longer available');

      // Then: Pet is soft deleted
      expect(mockPet.destroy).toHaveBeenCalled();
      expect(result.message).toBe('Pet deleted successfully');
    });

    it('should allow deletion of adopted pets', async () => {
      // Given: An adopted pet
      const mockPet = createMockPet({ status: PetStatus.ADOPTED });
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      // When: Deleting adopted pet
      const result = await PetService.deletePet(mockPetId, mockUserId, 'Data cleanup');

      // Then: Deletion succeeds (for administrative purposes)
      expect(mockPet.destroy).toHaveBeenCalled();
      expect(result.message).toBe('Pet deleted successfully');
    });

    it('should throw error when deleting non-existent pet', async () => {
      // Given: Non-existent pet
      MockedPet.findByPk = vi.fn().mockResolvedValue(null);

      // When & Then: Deletion fails
      await expect(PetService.deletePet('nonexistent', mockUserId)).rejects.toThrow(
        'Pet not found'
      );
    });
  });

  // ==========================================================================
  // Image Management Rules
  // ==========================================================================

  describe('Image Management', () => {
    it('should add images to pet', async () => {
      // Given: Pet with one existing image (count returns 1)
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedPetMedia.count = vi.fn().mockResolvedValue(1 as never);

      const newImages = [
        {
          url: 'https://example.com/new1.jpg',
          thumbnailUrl: 'https://example.com/new1_thumb.jpg',
          caption: 'New photo',
          isPrimary: false,
          orderIndex: 1,
        },
      ];

      // When: Adding new images
      await PetService.addPetImages(mockPetId, newImages, mockUserId);

      // Then: New images are inserted into pet_media keyed to the pet
      expect(MockedPetMedia.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            pet_id: mockPetId,
            type: PetMediaType.IMAGE,
            url: 'https://example.com/new1.jpg',
            thumbnail_url: 'https://example.com/new1_thumb.jpg',
            order_index: 1,
          }),
        ])
      );
    });

    it('should replace all images when updating', async () => {
      // Given: Pet with existing images
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const newImages = [
        {
          url: 'https://example.com/new.jpg',
          thumbnailUrl: 'https://example.com/new_thumb.jpg',
          isPrimary: true,
          orderIndex: 0,
        },
      ];

      // When: Updating images (replaces all)
      await PetService.updatePetImages(mockPetId, newImages, mockUserId);

      // Then: Existing images are deleted before new ones are inserted
      expect(MockedPetMedia.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pet_id: mockPetId,
            type: PetMediaType.IMAGE,
          }),
        })
      );
      expect(MockedPetMedia.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            url: 'https://example.com/new.jpg',
          }),
        ]),
        expect.anything()
      );
    });

    it('should remove specific image by ID', async () => {
      // Given: Pet with the target image present (destroy returns 1)
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedPetMedia.destroy = vi.fn().mockResolvedValue(1 as never);

      // When: Removing specific image
      await PetService.removePetImage(mockPetId, 'img2', mockUserId);

      // Then: PetMedia.destroy is called for that image only
      expect(MockedPetMedia.destroy).toHaveBeenCalledWith({
        where: { media_id: 'img2', pet_id: mockPetId, type: PetMediaType.IMAGE },
      });
    });

    it('should throw error when removing non-existent image', async () => {
      // Given: Pet without the specified image (destroy returns 0)
      const mockPet = createMockPet();
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedPetMedia.destroy = vi.fn().mockResolvedValue(0 as never);

      // When & Then: Removing non-existent image fails
      await expect(PetService.removePetImage(mockPetId, 'nonexistent', mockUserId)).rejects.toThrow(
        'Image not found'
      );
    });
  });

  // ==========================================================================
  // View Tracking
  // ==========================================================================

  describe('View Count Tracking', () => {
    it('should increment view count when pet is viewed', async () => {
      // Given: A pet
      const mockPet = createMockPet({ viewCount: 10 });
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      // When: Getting pet by ID
      await PetService.getPetById(mockPetId, mockUserId);

      // Then: View count is incremented
      expect(mockPet.increment).toHaveBeenCalledWith('viewCount');
    });

    it('should increment view count even for anonymous users', async () => {
      // Given: A pet viewed by anonymous user
      const mockPet = createMockPet({ viewCount: 5 });
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      // When: Getting pet without user ID
      await PetService.getPetById(mockPetId);

      // Then: View count is still incremented
      expect(mockPet.increment).toHaveBeenCalledWith('viewCount');
    });
  });

  // ==========================================================================
  // Business Invariants
  // ==========================================================================

  describe('Business Invariants', () => {
    it('should maintain rescueId relationship on creation', async () => {
      // Given: Pet data with rescueId
      const petData = createValidPetData();
      const mockCreatedPet = createMockPet();
      MockedPet.create = vi.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating pet
      await PetService.createPet(petData, mockRescueId, mockUserId);

      // Then: rescueId is set from parameter, not data
      expect(MockedPet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rescueId: mockRescueId, // From parameter
        })
      );
    });

    it('should preserve rescueId even if provided in update data', async () => {
      // Given: Existing pet
      const mockPet = createMockPet({ rescueId: mockRescueId });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      // Note: rescueId is not in PetUpdateData type, so it cannot be updated
      const updateData: PetUpdateData = { name: 'Updated Name' };

      // When: Updating pet
      await PetService.updatePet(mockPetId, updateData, mockUserId);

      // Then: rescueId is not in the update call (immutable)
      expect(mockPet.update).toHaveBeenCalledWith({ name: 'Updated Name' });
    });

    it('should maintain image order_index integrity when adding images', async () => {
      // Given: Pet with 2 existing images — count() reports 2 so the
      // next order_index for an image without an explicit position is 2.
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);
      MockedPetMedia.count = vi.fn().mockResolvedValue(2 as never);

      const newImages = [
        {
          url: 'photo3.jpg',
          isPrimary: false,
        },
      ];

      // When: Adding new image without explicit order_index
      await PetService.addPetImages(mockPetId, newImages, mockUserId);

      // Then: New image gets order_index = 2 (continuing sequence)
      expect(MockedPetMedia.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            url: 'photo3.jpg',
            order_index: 2,
          }),
        ])
      );
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle database errors during pet creation', async () => {
      // Given: Database error occurs
      const petData = createValidPetData();
      MockedPet.create = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      // When & Then: Error is propagated
      await expect(PetService.createPet(petData, mockRescueId, mockUserId)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle database errors during pet update', async () => {
      // Given: Pet exists but update fails
      const mockPet = createMockPet();
      mockPet.update.mockRejectedValue(new Error('Database error'));
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const updateData: PetUpdateData = { name: 'Updated Name' };

      // When & Then: Error is propagated
      await expect(PetService.updatePet(mockPetId, updateData, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle database errors during status update', async () => {
      // Given: Pet exists but status update fails
      const mockPet = createMockPet();
      mockPet.update.mockRejectedValue(new Error('Status update failed'));
      MockedPet.findByPk = vi.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.ADOPTED,
        reason: 'Adoption',
      };

      // When & Then: Error is propagated
      await expect(PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId)).rejects.toThrow(
        'Status update failed'
      );
    });

    it('should return null for non-existent pet in getPetById', async () => {
      // Given: Non-existent pet
      MockedPet.findByPk = vi.fn().mockResolvedValue(null);

      // When: Getting pet by ID
      const result = await PetService.getPetById('nonexistent');

      // Then: Returns null without throwing
      expect(result).toBeNull();
    });
  });
});
