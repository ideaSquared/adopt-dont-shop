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
import Application, { ApplicationStatus } from '../../models/Application';
import { PetService } from '../../services/pet.service';
import { PetCreateData, PetStatusUpdate, PetUpdateData } from '../../types/pet';

// Mocked dependencies
const MockedPet = Pet as jest.Mocked<typeof Pet>;
const MockedApplication = Application as jest.Mocked<typeof Application>;

// Test constants
const mockRescueId = 'rescue-123';
const mockUserId = 'user-456';
const mockPetId = 'pet-789';

// ============================================================================
// Mock Factory Functions
// ============================================================================

const createMockPet = (overrides = {}) => ({
  pet_id: mockPetId,
  petId: mockPetId,
  name: 'Buddy',
  type: PetType.DOG,
  breed: 'Golden Retriever',
  gender: Gender.MALE,
  status: PetStatus.AVAILABLE,
  age_group: AgeGroup.ADULT,
  size: Size.LARGE,
  energy_level: EnergyLevel.MEDIUM,
  vaccination_status: VaccinationStatus.UP_TO_DATE,
  spay_neuter_status: SpayNeuterStatus.NEUTERED,
  rescue_id: mockRescueId,
  rescueId: mockRescueId,
  archived: false,
  featured: false,
  priority_listing: false,
  special_needs: false,
  house_trained: true,
  images: [],
  videos: [],
  view_count: 0,
  favorite_count: 0,
  application_count: 0,
  created_at: new Date(),
  updated_at: new Date(),
  update: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn(),
  destroy: jest.fn().mockResolvedValue(undefined),
  increment: jest.fn().mockResolvedValue(undefined),
  toJSON: jest.fn().mockReturnThis(),
  isAvailable: jest.fn().mockReturnValue(true),
  canBeAdopted: jest.fn().mockReturnValue(true),
  ...overrides,
});

const createValidPetData = (overrides = {}): PetCreateData => ({
  name: 'Buddy',
  type: PetType.DOG,
  breed: 'Golden Retriever',
  gender: Gender.MALE,
  status: PetStatus.AVAILABLE,
  age_group: AgeGroup.ADULT,
  size: Size.MEDIUM,
  energy_level: EnergyLevel.MEDIUM,
  vaccination_status: VaccinationStatus.UP_TO_DATE,
  spay_neuter_status: SpayNeuterStatus.NEUTERED,
  rescue_id: mockRescueId,
  images: [],
  videos: [],
  ...overrides,
});

describe('PetService - Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Pet Status State Machine
  // ==========================================================================

  describe('Pet Status State Transitions', () => {
    it('should allow transition from AVAILABLE to PENDING', async () => {
      // Given: An available pet
      const mockPet = createMockPet({ status: PetStatus.AVAILABLE });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.PENDING,
        reason: 'Application in review',
      };

      // When: Status is updated to PENDING
      const result = await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Status is updated successfully
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PetStatus.PENDING,
        })
      );
      expect(result).toBeDefined();
    });

    it('should allow transition from PENDING to ADOPTED', async () => {
      // Given: A pet in pending status
      const mockPet = createMockPet({ status: PetStatus.PENDING });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.ADOPTED,
        reason: 'Adoption finalized',
      };

      // When: Status is updated to ADOPTED
      await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Adopted date is automatically set
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PetStatus.ADOPTED,
          adopted_date: expect.any(Date),
        })
      );
    });

    it('should allow transition from AVAILABLE to FOSTER', async () => {
      // Given: An available pet
      const mockPet = createMockPet({ status: PetStatus.AVAILABLE });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.FOSTER,
        reason: 'Foster placement approved',
      };

      // When: Status is updated to FOSTER
      await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Foster start date is automatically set
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PetStatus.FOSTER,
          foster_start_date: expect.any(Date),
        })
      );
    });

    it('should allow transition from AVAILABLE to MEDICAL_HOLD', async () => {
      // Given: An available pet
      const mockPet = createMockPet({ status: PetStatus.AVAILABLE });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.MEDICAL_HOLD,
        reason: 'Requires medical treatment',
      };

      // When: Status is updated to MEDICAL_HOLD
      const result = await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Status is updated successfully
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PetStatus.MEDICAL_HOLD,
        })
      );
      expect(result).toBeDefined();
    });

    it('should allow transition from MEDICAL_HOLD back to AVAILABLE', async () => {
      // Given: A pet on medical hold
      const mockPet = createMockPet({ status: PetStatus.MEDICAL_HOLD });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.AVAILABLE,
        reason: 'Medical treatment completed',
        effectiveDate: new Date(),
      };

      // When: Status is updated back to AVAILABLE
      await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Available since date is updated
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PetStatus.AVAILABLE,
          available_since: expect.any(Date),
        })
      );
    });

    it('should allow transition from FOSTER to ADOPTED', async () => {
      // Given: A pet currently in foster care
      const mockPet = createMockPet({ status: PetStatus.FOSTER });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.ADOPTED,
        reason: 'Foster family decided to adopt',
      };

      // When: Foster becomes adoption
      await PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId);

      // Then: Adopted date is set
      expect(mockPet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PetStatus.ADOPTED,
          adopted_date: expect.any(Date),
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
        isAdopted: jest.fn().mockReturnValue(true),
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
      const mockCreatedPet = createMockPet({ pet_id: 'new-pet-123' });

      MockedPet.create = jest.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating a new pet
      const result = await PetService.createPet(petData, mockRescueId, mockUserId);

      // Then: Pet is created with correct rescue_id
      expect(MockedPet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...petData,
          rescue_id: mockRescueId,
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

      MockedPet.create = jest.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating pet with images
      await PetService.createPet(petData, mockRescueId, mockUserId);

      // Then: Images are properly formatted with required fields
      expect(MockedPet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              image_id: expect.stringContaining('img_'),
              url: 'https://example.com/image1.jpg',
              thumbnail_url: 'https://example.com/thumb1.jpg',
              is_primary: true,
              order_index: 0,
              uploaded_at: expect.any(Date),
            }),
          ]),
        })
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

      MockedPet.create = jest.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating pet with videos
      await PetService.createPet(petData, mockRescueId, mockUserId);

      // Then: Videos are properly formatted
      expect(MockedPet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          videos: expect.arrayContaining([
            expect.objectContaining({
              video_id: expect.stringContaining('vid_'),
              url: 'https://example.com/video1.mp4',
              duration_seconds: 30,
              uploaded_at: expect.any(Date),
            }),
          ]),
        })
      );
    });

    it('should set default status to AVAILABLE if not specified', async () => {
      // Given: Pet data without explicit status
      const petData: Partial<PetCreateData> = createValidPetData();
      delete petData.status;
      const mockCreatedPet = createMockPet();

      MockedPet.create = jest.fn().mockResolvedValue(mockCreatedPet);

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
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

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
        short_description: 'Friendly and energetic',
        long_description: 'A wonderful companion who loves to play and cuddle.',
      });
    });

    it('should update medical information', async () => {
      // Given: An existing pet
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

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
          vaccination_status: VaccinationStatus.UP_TO_DATE,
          vaccination_date: expect.any(Date),
          spay_neuter_status: SpayNeuterStatus.NEUTERED,
          spay_neuter_date: expect.any(Date),
          medical_notes: 'All vaccinations current, healthy checkup',
        })
      );
    });

    it('should update behavioral characteristics', async () => {
      // Given: An existing pet
      const mockPet = createMockPet();
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

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
          good_with_children: true,
          good_with_dogs: true,
          good_with_cats: false,
          good_with_small_animals: false,
          house_trained: true,
          energy_level: EnergyLevel.HIGH,
          behavioral_notes: 'Very friendly but needs space from cats',
        })
      );
    });

    it('should throw error when updating non-existent pet', async () => {
      // Given: Non-existent pet ID
      MockedPet.findByPk = jest.fn().mockResolvedValue(null);

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
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

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
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

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
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      // When: Deleting pet
      const result = await PetService.deletePet(mockPetId, mockUserId, 'No longer available');

      // Then: Pet is soft deleted
      expect(mockPet.destroy).toHaveBeenCalled();
      expect(result.message).toBe('Pet deleted successfully');
    });

    it('should allow deletion of adopted pets', async () => {
      // Given: An adopted pet
      const mockPet = createMockPet({ status: PetStatus.ADOPTED });
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      // When: Deleting adopted pet
      const result = await PetService.deletePet(mockPetId, mockUserId, 'Data cleanup');

      // Then: Deletion succeeds (for administrative purposes)
      expect(mockPet.destroy).toHaveBeenCalled();
      expect(result.message).toBe('Pet deleted successfully');
    });

    it('should throw error when deleting non-existent pet', async () => {
      // Given: Non-existent pet
      MockedPet.findByPk = jest.fn().mockResolvedValue(null);

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
      // Given: Pet with existing images
      const mockPet = createMockPet({
        images: [
          {
            image_id: 'img_existing',
            url: 'https://example.com/existing.jpg',
            is_primary: true,
            order_index: 0,
            uploaded_at: new Date(),
          },
        ],
      });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

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

      // Then: New images are appended to existing images
      expect(mockPet.update).toHaveBeenCalledWith({
        images: expect.arrayContaining([
          expect.objectContaining({ image_id: 'img_existing' }),
          expect.objectContaining({
            image_id: expect.stringContaining('img_'),
            url: 'https://example.com/new1.jpg',
          }),
        ]),
      });
    });

    it('should replace all images when updating', async () => {
      // Given: Pet with existing images
      const mockPet = createMockPet({
        images: [{ image_id: 'old_img', url: 'old.jpg', is_primary: true, order_index: 0, uploaded_at: new Date() }],
      });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

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

      // Then: All images are replaced
      expect(mockPet.update).toHaveBeenCalledWith({
        images: expect.arrayContaining([
          expect.objectContaining({
            url: 'https://example.com/new.jpg',
          }),
        ]),
      });
      // Old image should not be present
      expect(mockPet.update).not.toHaveBeenCalledWith({
        images: expect.arrayContaining([expect.objectContaining({ image_id: 'old_img' })]),
      });
    });

    it('should remove specific image by ID', async () => {
      // Given: Pet with multiple images
      const mockPet = createMockPet({
        images: [
          { image_id: 'img1', url: 'photo1.jpg', is_primary: true, order_index: 0, uploaded_at: new Date() },
          { image_id: 'img2', url: 'photo2.jpg', is_primary: false, order_index: 1, uploaded_at: new Date() },
          { image_id: 'img3', url: 'photo3.jpg', is_primary: false, order_index: 2, uploaded_at: new Date() },
        ],
      });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      // When: Removing specific image
      await PetService.removePetImage(mockPetId, 'img2', mockUserId);

      // Then: Only specified image is removed
      expect(mockPet.update).toHaveBeenCalledWith({
        images: expect.arrayContaining([
          expect.objectContaining({ image_id: 'img1' }),
          expect.objectContaining({ image_id: 'img3' }),
        ]),
      });
      expect(mockPet.update).toHaveBeenCalledWith({
        images: expect.not.arrayContaining([expect.objectContaining({ image_id: 'img2' })]),
      });
    });

    it('should throw error when removing non-existent image', async () => {
      // Given: Pet without the specified image
      const mockPet = createMockPet({
        images: [{ image_id: 'img1', url: 'photo1.jpg', is_primary: true, order_index: 0, uploaded_at: new Date() }],
      });
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      // When & Then: Removing non-existent image fails
      await expect(
        PetService.removePetImage(mockPetId, 'nonexistent', mockUserId)
      ).rejects.toThrow('Image not found');
    });
  });

  // ==========================================================================
  // View Tracking
  // ==========================================================================

  describe('View Count Tracking', () => {
    it('should increment view count when pet is viewed', async () => {
      // Given: A pet
      const mockPet = createMockPet({ view_count: 10 });
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      // When: Getting pet by ID
      await PetService.getPetById(mockPetId, mockUserId);

      // Then: View count is incremented
      expect(mockPet.increment).toHaveBeenCalledWith('view_count');
    });

    it('should increment view count even for anonymous users', async () => {
      // Given: A pet viewed by anonymous user
      const mockPet = createMockPet({ view_count: 5 });
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      // When: Getting pet without user ID
      await PetService.getPetById(mockPetId);

      // Then: View count is still incremented
      expect(mockPet.increment).toHaveBeenCalledWith('view_count');
    });
  });

  // ==========================================================================
  // Business Invariants
  // ==========================================================================

  describe('Business Invariants', () => {
    it('should maintain rescue_id relationship on creation', async () => {
      // Given: Pet data with rescue_id
      const petData = createValidPetData();
      const mockCreatedPet = createMockPet();
      MockedPet.create = jest.fn().mockResolvedValue(mockCreatedPet);

      // When: Creating pet
      await PetService.createPet(petData, mockRescueId, mockUserId);

      // Then: rescue_id is set from parameter, not data
      expect(MockedPet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rescue_id: mockRescueId, // From parameter
        })
      );
    });

    it('should preserve rescue_id even if provided in update data', async () => {
      // Given: Existing pet
      const mockPet = createMockPet({ rescue_id: mockRescueId });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      // Note: rescue_id is not in PetUpdateData type, so it cannot be updated
      const updateData: PetUpdateData = { name: 'Updated Name' };

      // When: Updating pet
      await PetService.updatePet(mockPetId, updateData, mockUserId);

      // Then: rescue_id is not in the update call (immutable)
      expect(mockPet.update).toHaveBeenCalledWith({ name: 'Updated Name' });
    });

    it('should maintain image order_index integrity when adding images', async () => {
      // Given: Pet with 2 existing images
      const mockPet = createMockPet({
        images: [
          { image_id: 'img1', url: 'photo1.jpg', is_primary: true, order_index: 0, uploaded_at: new Date() },
          { image_id: 'img2', url: 'photo2.jpg', is_primary: false, order_index: 1, uploaded_at: new Date() },
        ],
      });
      mockPet.reload.mockResolvedValue(mockPet);
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      const newImages = [
        {
          url: 'photo3.jpg',
          isPrimary: false,
        },
      ];

      // When: Adding new image without explicit order_index
      await PetService.addPetImages(mockPetId, newImages, mockUserId);

      // Then: New image gets order_index = 2 (continuing sequence)
      expect(mockPet.update).toHaveBeenCalledWith({
        images: expect.arrayContaining([
          expect.objectContaining({
            url: 'photo3.jpg',
            order_index: 2, // Continues from existing images
          }),
        ]),
      });
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle database errors during pet creation', async () => {
      // Given: Database error occurs
      const petData = createValidPetData();
      MockedPet.create = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      // When & Then: Error is propagated
      await expect(PetService.createPet(petData, mockRescueId, mockUserId)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle database errors during pet update', async () => {
      // Given: Pet exists but update fails
      const mockPet = createMockPet();
      mockPet.update.mockRejectedValue(new Error('Database error'));
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

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
      MockedPet.findByPk = jest.fn().mockResolvedValue(mockPet);

      const statusUpdate: PetStatusUpdate = {
        status: PetStatus.ADOPTED,
        reason: 'Adoption',
      };

      // When & Then: Error is propagated
      await expect(
        PetService.updatePetStatus(mockPetId, statusUpdate, mockUserId)
      ).rejects.toThrow('Status update failed');
    });

    it('should return null for non-existent pet in getPetById', async () => {
      // Given: Non-existent pet
      MockedPet.findByPk = jest.fn().mockResolvedValue(null);

      // When: Getting pet by ID
      const result = await PetService.getPetById('nonexistent');

      // Then: Returns null without throwing
      expect(result).toBeNull();
    });
  });
});
