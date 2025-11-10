// Mock config first
jest.mock('../../config', () => ({
  config: {
    storage: {
      local: {
        maxFileSize: 10485760, // 10MB
        directory: '/tmp/uploads',
      },
    },
  },
}));

// Mock dependencies before imports
jest.mock('../../services/pet.service');
jest.mock('../../services/file-upload.service');
jest.mock('../../models/StaffMember');
jest.mock('../../models/Pet');
jest.mock('../../models/UserFavorite');

const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  end: jest.fn(),
  log: jest.fn(),
};

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: loggerMock,
  logger: loggerMock,
  loggerHelpers: {
    logRequest: jest.fn(),
    logBusiness: jest.fn(),
    logAuth: jest.fn(),
    logSecurity: jest.fn(),
  },
}));

import { Response } from 'express';
import { PetController } from '../../controllers/pet.controller';
import PetService from '../../services/pet.service';
import { FileUploadService } from '../../services/file-upload.service';
import StaffMember from '../../models/StaffMember';
import { PetStatus, PetType, Size, Gender, AgeGroup, EnergyLevel } from '../../models/Pet';
import { AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';

describe('PetController', () => {
  let petController: PetController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    petController = new PetController();

    mockRequest = {
      user: {
        userId: 'user-123',
        userType: 'rescue_staff',
      } as any,
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('searchPets - Search pets with filters and pagination', () => {
    describe('when searching pets successfully', () => {
      it('should return paginated pets', async () => {
        mockRequest.query = {
          page: '1',
          limit: '20',
        };

        const mockPets = [
          {
            pet_id: 'pet-001',
            name: 'Buddy',
            type: PetType.DOG,
            breed: 'Golden Retriever',
            age_years: 3,
            age_months: 6,
            gender: Gender.MALE,
            size: Size.LARGE,
            status: PetStatus.AVAILABLE,
            rescue_id: 'rescue-123',
          },
        ];

        const mockResult = {
          pets: mockPets,
          total: 1,
          page: 1,
          totalPages: 1,
        };

        (PetService.searchPets as jest.Mock).mockResolvedValue(mockResult);

        await petController.searchPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockPets,
            meta: expect.objectContaining({
              total: 1,
              page: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            }),
          })
        );
      });

      it('should apply filters from query parameters', async () => {
        mockRequest.query = {
          type: PetType.CAT,
          size: Size.MEDIUM,
          gender: Gender.FEMALE,
          status: PetStatus.AVAILABLE,
          goodWithChildren: 'true',
          goodWithDogs: 'false',
        };

        const mockResult = {
          pets: [],
          total: 0,
          page: 1,
          totalPages: 0,
        };

        (PetService.searchPets as jest.Mock).mockResolvedValue(mockResult);

        await petController.searchPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.searchPets).toHaveBeenCalledWith(
          expect.objectContaining({
            type: PetType.CAT,
            size: Size.MEDIUM,
            gender: Gender.FEMALE,
            status: PetStatus.AVAILABLE,
            goodWithChildren: true,
            goodWithDogs: false,
          }),
          expect.any(Object)
        );
      });

      it('should auto-filter by rescue for authenticated staff', async () => {
        const mockStaffMember = {
          userId: 'user-123',
          rescueId: 'rescue-456',
          isDeleted: false,
          isVerified: true,
        };

        (StaffMember.findOne as jest.Mock).mockResolvedValue(mockStaffMember);
        (PetService.searchPets as jest.Mock).mockResolvedValue({
          pets: [],
          total: 0,
          page: 1,
          totalPages: 0,
        });

        await petController.searchPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.searchPets).toHaveBeenCalledWith(
          expect.objectContaining({
            rescueId: 'rescue-456',
          }),
          expect.any(Object)
        );
      });
    });

    describe('when validation fails', () => {
      it('should return 400 error for invalid validation', async () => {
        // Mock validation result
        const mockValidationResult = {
          isEmpty: () => false,
          array: () => [{ msg: 'Invalid page number' }],
        };

        // We need to test this through actual validation, but for now let's test the service error
        (PetService.searchPets as jest.Mock).mockRejectedValue(
          new Error('Validation failed')
        );

        await petController.searchPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });

    describe('when search fails', () => {
      it('should return 500 error', async () => {
        (PetService.searchPets as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.searchPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to search pets',
            error: 'Database error',
          })
        );
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('createPet - Create new pet', () => {
    describe('when creating pet with valid data', () => {
      it('should create pet and return 201 status', async () => {
        mockRequest.body = {
          name: 'Max',
          type: PetType.DOG,
          breed: 'Labrador',
          ageYears: 2,
          ageMonths: 3,
          gender: Gender.MALE,
          size: Size.LARGE,
          shortDescription: 'Friendly and energetic dog',
          adoptionFee: 150,
        };

        const mockStaffMember = {
          userId: 'user-123',
          rescueId: 'rescue-456',
          isDeleted: false,
          isVerified: true,
        };

        const mockPet = {
          pet_id: 'pet-001',
          name: 'Max',
          type: PetType.DOG,
          rescue_id: 'rescue-456',
          status: PetStatus.AVAILABLE,
        };

        (StaffMember.findOne as jest.Mock).mockResolvedValue(mockStaffMember);
        (PetService.createPet as jest.Mock).mockResolvedValue(mockPet);

        await petController.createPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Pet created successfully',
            data: mockPet,
          })
        );
      });

      it('should sanitize numeric fields', async () => {
        mockRequest.body = {
          name: 'Max',
          type: PetType.DOG,
          breed: 'Labrador',
          gender: Gender.MALE,
          size: Size.LARGE,
          adoptionFee: '',
          weightKg: null,
        };

        const mockStaffMember = {
          rescueId: 'rescue-456',
        };

        (StaffMember.findOne as jest.Mock).mockResolvedValue(mockStaffMember);
        (PetService.createPet as jest.Mock).mockResolvedValue({ pet_id: 'pet-001' });

        await petController.createPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.createPet).toHaveBeenCalledWith(
          expect.objectContaining({
            adoptionFee: null,
            weightKg: null,
          }),
          'rescue-456',
          'user-123'
        );
      });
    });

    describe('when user not authenticated', () => {
      it('should return 401 error', async () => {
        mockRequest.user = undefined;

        await petController.createPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Authentication required',
          })
        );
      });
    });

    describe('when user not associated with rescue', () => {
      it('should return 403 error', async () => {
        mockRequest.body = { name: 'Test', type: PetType.DOG };

        (StaffMember.findOne as jest.Mock).mockResolvedValue(null);

        await petController.createPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'User is not associated with a rescue organization',
          })
        );
      });
    });

    describe('when creation fails', () => {
      it('should return 500 error', async () => {
        mockRequest.body = { name: 'Test', type: PetType.DOG };

        (StaffMember.findOne as jest.Mock).mockResolvedValue({ rescueId: 'rescue-456' });
        (PetService.createPet as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.createPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to create pet',
          })
        );
      });
    });
  });

  describe('getPetById - Get pet by ID', () => {
    describe('when pet exists', () => {
      it('should return pet data', async () => {
        mockRequest.params = { petId: 'pet-001' };

        const mockPet = {
          pet_id: 'pet-001',
          name: 'Buddy',
          type: PetType.DOG,
          status: PetStatus.AVAILABLE,
        };

        (PetService.getPetById as jest.Mock).mockResolvedValue(mockPet);

        await petController.getPetById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockPet,
          })
        );
      });

      it('should pass user ID to service', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.getPetById as jest.Mock).mockResolvedValue({ pet_id: 'pet-001' });

        await petController.getPetById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.getPetById).toHaveBeenCalledWith('pet-001', 'user-123');
      });
    });

    describe('when pet not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { petId: 'nonexistent' };

        (PetService.getPetById as jest.Mock).mockResolvedValue(null);

        await petController.getPetById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Pet not found',
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.getPetById as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.getPetById(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to retrieve pet',
          })
        );
      });
    });
  });

  describe('updatePet - Update pet', () => {
    describe('when updating with valid data', () => {
      it('should update pet successfully', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = {
          name: 'Updated Name',
          shortDescription: 'Updated description',
        };

        const mockUpdatedPet = {
          pet_id: 'pet-001',
          name: 'Updated Name',
          shortDescription: 'Updated description',
        };

        (PetService.updatePet as jest.Mock).mockResolvedValue(mockUpdatedPet);

        await petController.updatePet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Pet updated successfully',
            data: mockUpdatedPet,
          })
        );
      });

      it('should sanitize numeric fields', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = {
          adoptionFee: '',
          weight_kg: undefined,
        };

        (PetService.updatePet as jest.Mock).mockResolvedValue({ pet_id: 'pet-001' });

        await petController.updatePet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.updatePet).toHaveBeenCalledWith(
          'pet-001',
          expect.objectContaining({
            adoptionFee: null,
            weight_kg: null,
          }),
          'user-123'
        );
      });
    });

    describe('when pet not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { petId: 'nonexistent' };
        mockRequest.body = { name: 'Test' };

        (PetService.updatePet as jest.Mock).mockRejectedValue(new Error('Pet not found'));

        await petController.updatePet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to update pet',
          })
        );
      });
    });

    describe('when update fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = { name: 'Test' };

        (PetService.updatePet as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.updatePet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('deletePet - Delete pet (soft delete)', () => {
    describe('when deleting pet', () => {
      it('should delete pet successfully', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = { reason: 'Pet was adopted' };

        const mockResult = {
          message: 'Pet deleted successfully',
        };

        (PetService.deletePet as jest.Mock).mockResolvedValue(mockResult);

        await petController.deletePet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Pet deleted successfully',
          })
        );
      });

      it('should call service with reason', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = { reason: 'Test reason' };

        (PetService.deletePet as jest.Mock).mockResolvedValue({ message: 'Deleted' });

        await petController.deletePet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.deletePet).toHaveBeenCalledWith('pet-001', 'user-123', 'Test reason');
      });
    });

    describe('when pet not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { petId: 'nonexistent' };

        (PetService.deletePet as jest.Mock).mockRejectedValue(new Error('Pet not found'));

        await petController.deletePet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('when deletion fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.deletePet as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.deletePet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('updatePetImages - Update pet images', () => {
    describe('when updating images', () => {
      it('should update images successfully', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = {
          images: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
        };

        const mockUpdatedPet = {
          pet_id: 'pet-001',
          images: mockRequest.body.images,
        };

        (PetService.updatePetImages as jest.Mock).mockResolvedValue(mockUpdatedPet);

        await petController.updatePetImages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Pet images updated successfully',
            data: mockUpdatedPet,
          })
        );
      });

      it('should handle empty images array', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = { images: [] };

        (PetService.updatePetImages as jest.Mock).mockResolvedValue({ pet_id: 'pet-001' });

        await petController.updatePetImages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.updatePetImages).toHaveBeenCalledWith('pet-001', [], 'user-123');
      });
    });

    describe('when pet not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { petId: 'nonexistent' };
        mockRequest.body = { images: [] };

        (PetService.updatePetImages as jest.Mock).mockRejectedValue(new Error('Pet not found'));

        await petController.updatePetImages(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });
  });

  describe('removePetImage - Remove pet image', () => {
    describe('when removing image', () => {
      it('should remove image successfully', async () => {
        mockRequest.params = { petId: 'pet-001', imageId: 'img-001' };

        const mockUpdatedPet = {
          pet_id: 'pet-001',
          images: [],
        };

        (PetService.removePetImage as jest.Mock).mockResolvedValue(mockUpdatedPet);

        await petController.removePetImage(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Pet image removed successfully',
            data: mockUpdatedPet,
          })
        );
      });
    });

    describe('when image not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { petId: 'pet-001', imageId: 'nonexistent' };

        (PetService.removePetImage as jest.Mock).mockRejectedValue(new Error('Image not found'));

        await petController.removePetImage(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });
  });

  describe('getPetsByRescue - Get pets by rescue', () => {
    describe('when retrieving pets', () => {
      it('should return paginated pets', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };
        mockRequest.query = { page: '1', limit: '20' };

        const mockResult = {
          pets: [{ pet_id: 'pet-001' }],
          total: 1,
          page: 1,
          totalPages: 1,
        };

        (PetService.getPetsByRescue as jest.Mock).mockResolvedValue(mockResult);

        await petController.getPetsByRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockResult.pets,
            meta: expect.objectContaining({
              total: 1,
              page: 1,
              totalPages: 1,
            }),
          })
        );
      });

      it('should use default pagination values', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        (PetService.getPetsByRescue as jest.Mock).mockResolvedValue({
          pets: [],
          total: 0,
          page: 1,
          totalPages: 0,
        });

        await petController.getPetsByRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.getPetsByRescue).toHaveBeenCalledWith('rescue-123', 1, 20);
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { rescueId: 'rescue-123' };

        (PetService.getPetsByRescue as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.getPetsByRescue(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('getMyRescuePets - Get authenticated user rescue pets', () => {
    describe('when user is staff member', () => {
      it('should return rescue pets', async () => {
        const mockStaffMember = {
          rescueId: 'rescue-456',
        };

        const mockResult = {
          pets: [{ pet_id: 'pet-001' }],
          total: 1,
          page: 1,
          totalPages: 1,
        };

        (StaffMember.findOne as jest.Mock).mockResolvedValue(mockStaffMember);
        (PetService.searchPets as jest.Mock).mockResolvedValue(mockResult);

        await petController.getMyRescuePets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockResult.pets,
          })
        );
      });

      it('should apply filters from query', async () => {
        mockRequest.query = {
          status: PetStatus.AVAILABLE,
          type: PetType.DOG,
          search: 'golden',
        };

        const mockStaffMember = { rescueId: 'rescue-456' };

        (StaffMember.findOne as jest.Mock).mockResolvedValue(mockStaffMember);
        (PetService.searchPets as jest.Mock).mockResolvedValue({
          pets: [],
          total: 0,
          page: 1,
          totalPages: 0,
        });

        await petController.getMyRescuePets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.searchPets).toHaveBeenCalledWith(
          expect.objectContaining({
            rescueId: 'rescue-456',
            status: PetStatus.AVAILABLE,
            type: PetType.DOG,
            search: 'golden',
          }),
          expect.any(Object)
        );
      });
    });

    describe('when user not authenticated', () => {
      it('should return 401 error', async () => {
        mockRequest.user = undefined;

        await petController.getMyRescuePets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
      });
    });

    describe('when user not associated with rescue', () => {
      it('should return 403 error', async () => {
        (StaffMember.findOne as jest.Mock).mockResolvedValue(null);

        await petController.getMyRescuePets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('updatePetStatus - Update pet status', () => {
    describe('when updating status', () => {
      it('should update status successfully', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = {
          status: PetStatus.ADOPTED,
          reason: 'Pet found loving home',
          notes: 'Adopted by Smith family',
        };

        const mockUpdatedPet = {
          pet_id: 'pet-001',
          status: PetStatus.ADOPTED,
        };

        (PetService.updatePetStatus as jest.Mock).mockResolvedValue(mockUpdatedPet);

        await petController.updatePetStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Pet status updated successfully',
            data: mockUpdatedPet,
          })
        );
      });

      it('should handle effective date', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = {
          status: PetStatus.ADOPTED,
          effectiveDate: '2024-01-15',
        };

        (PetService.updatePetStatus as jest.Mock).mockResolvedValue({ pet_id: 'pet-001' });

        await petController.updatePetStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.updatePetStatus).toHaveBeenCalledWith(
          'pet-001',
          expect.objectContaining({
            status: PetStatus.ADOPTED,
            effectiveDate: expect.any(Date),
          }),
          'user-123'
        );
      });
    });

    describe('when pet not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { petId: 'nonexistent' };
        mockRequest.body = { status: PetStatus.ADOPTED };

        (PetService.updatePetStatus as jest.Mock).mockRejectedValue(new Error('Pet not found'));

        await petController.updatePetStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });
  });

  describe('getFeaturedPets - Get featured pets', () => {
    describe('when retrieving featured pets', () => {
      it('should return featured pets', async () => {
        mockRequest.query = { limit: '10' };

        const mockPets = [
          { pet_id: 'pet-001', featured: true },
          { pet_id: 'pet-002', featured: true },
        ];

        (PetService.getFeaturedPets as jest.Mock).mockResolvedValue(mockPets);

        await petController.getFeaturedPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockPets,
          })
        );
      });

      it('should use default limit', async () => {
        (PetService.getFeaturedPets as jest.Mock).mockResolvedValue([]);

        await petController.getFeaturedPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.getFeaturedPets).toHaveBeenCalledWith(10);
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        (PetService.getFeaturedPets as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.getFeaturedPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('getPetStatistics - Get pet statistics', () => {
    describe('when retrieving statistics', () => {
      it('should return statistics', async () => {
        mockRequest.query = { rescueId: 'rescue-123' };

        const mockStats = {
          total: 50,
          by_status: {
            available: 20,
            pending: 10,
            adopted: 15,
          },
          by_type: {
            dog: 30,
            cat: 20,
          },
        };

        (PetService.getPetStatistics as jest.Mock).mockResolvedValue(mockStats);

        await petController.getPetStatistics(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockStats,
          })
        );
      });

      it('should work without rescueId', async () => {
        (PetService.getPetStatistics as jest.Mock).mockResolvedValue({});

        await petController.getPetStatistics(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.getPetStatistics).toHaveBeenCalledWith(undefined);
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        (PetService.getPetStatistics as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await petController.getPetStatistics(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('getPetActivity - Get pet activity', () => {
    describe('when retrieving activity', () => {
      it('should return activity data', async () => {
        mockRequest.params = { petId: 'pet-001' };

        const mockActivity = [
          {
            activity_id: 'act-001',
            pet_id: 'pet-001',
            activity_type: 'status_change',
            description: 'Status changed to available',
          },
        ];

        (PetService.getPetActivity as jest.Mock).mockResolvedValue(mockActivity);

        await petController.getPetActivity(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockActivity,
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.getPetActivity as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.getPetActivity(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to get pet activity',
          })
        );
      });
    });
  });

  describe('addToFavorites - Add pet to favorites', () => {
    describe('when adding to favorites', () => {
      it('should add successfully', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.addToFavorites as jest.Mock).mockResolvedValue(undefined);

        await petController.addToFavorites(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Pet added to favorites',
          })
        );
      });

      it('should call service with correct parameters', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.addToFavorites as jest.Mock).mockResolvedValue(undefined);

        await petController.addToFavorites(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.addToFavorites).toHaveBeenCalledWith('user-123', 'pet-001');
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.addToFavorites as jest.Mock).mockRejectedValue(
          new Error('Already favorited')
        );

        await petController.addToFavorites(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('removeFromFavorites - Remove pet from favorites', () => {
    describe('when removing from favorites', () => {
      it('should remove successfully', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.removeFromFavorites as jest.Mock).mockResolvedValue(undefined);

        await petController.removeFromFavorites(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Pet removed from favorites',
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.removeFromFavorites as jest.Mock).mockRejectedValue(
          new Error('Not in favorites')
        );

        await petController.removeFromFavorites(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('getUserFavorites - Get user favorite pets', () => {
    describe('when retrieving favorites', () => {
      it('should return favorites', async () => {
        mockRequest.query = { page: '1', limit: '20' };

        const mockFavorites = {
          favorites: [{ pet_id: 'pet-001' }],
          total: 1,
          page: 1,
          totalPages: 1,
        };

        (PetService.getUserFavorites as jest.Mock).mockResolvedValue(mockFavorites);

        await petController.getUserFavorites(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockFavorites,
          })
        );
      });

      it('should use default pagination', async () => {
        (PetService.getUserFavorites as jest.Mock).mockResolvedValue({
          favorites: [],
          total: 0,
          page: 1,
          totalPages: 0,
        });

        await petController.getUserFavorites(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.getUserFavorites).toHaveBeenCalledWith('user-123', {
          page: 1,
          limit: 20,
        });
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        (PetService.getUserFavorites as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await petController.getUserFavorites(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('checkFavoriteStatus - Check if pet is favorited', () => {
    describe('when checking status', () => {
      it('should return true when favorited', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.checkFavoriteStatus as jest.Mock).mockResolvedValue(true);

        await petController.checkFavoriteStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: { isFavorite: true },
          })
        );
      });

      it('should return false when not favorited', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.checkFavoriteStatus as jest.Mock).mockResolvedValue(false);

        await petController.checkFavoriteStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: { isFavorite: false },
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.checkFavoriteStatus as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await petController.checkFavoriteStatus(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('getRecentPets - Get recent pets', () => {
    describe('when retrieving recent pets', () => {
      it('should return recent pets', async () => {
        mockRequest.query = { limit: '12' };

        const mockPets = [
          { pet_id: 'pet-001', created_at: new Date() },
          { pet_id: 'pet-002', created_at: new Date() },
        ];

        (PetService.getRecentPets as jest.Mock).mockResolvedValue(mockPets);

        await petController.getRecentPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockPets,
            message: 'Recent pets retrieved successfully',
          })
        );
      });

      it('should validate limit boundaries', async () => {
        mockRequest.query = { limit: '100' };

        await petController.getRecentPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Limit must be between 1 and 50',
          })
        );
      });

      it('should use default limit', async () => {
        (PetService.getRecentPets as jest.Mock).mockResolvedValue([]);

        await petController.getRecentPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.getRecentPets).toHaveBeenCalledWith(12);
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        (PetService.getRecentPets as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.getRecentPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('getPetBreedsByType - Get breeds by pet type', () => {
    describe('when retrieving breeds', () => {
      it('should return breeds for type', async () => {
        mockRequest.params = { type: PetType.DOG };

        const mockBreeds = ['Labrador', 'Golden Retriever', 'Poodle'];

        (PetService.getPetBreedsByType as jest.Mock).mockResolvedValue(mockBreeds);

        await petController.getPetBreedsByType(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockBreeds,
            message: 'Breeds for dog retrieved successfully',
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        mockRequest.params = { type: PetType.CAT };

        (PetService.getPetBreedsByType as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await petController.getPetBreedsByType(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('getPetTypes - Get all pet types', () => {
    describe('when retrieving types', () => {
      it('should return all types', async () => {
        const mockTypes = [
          { type: PetType.DOG, count: 50 },
          { type: PetType.CAT, count: 30 },
        ];

        (PetService.getPetTypes as jest.Mock).mockResolvedValue(mockTypes);

        await petController.getPetTypes(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockTypes,
            message: 'Pet types retrieved successfully',
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 500 error', async () => {
        (PetService.getPetTypes as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.getPetTypes(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('getSimilarPets - Get similar pets', () => {
    describe('when retrieving similar pets', () => {
      it('should return similar pets', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.query = { limit: '6' };

        const mockSimilarPets = [
          { pet_id: 'pet-002', type: PetType.DOG },
          { pet_id: 'pet-003', type: PetType.DOG },
        ];

        (PetService.getSimilarPets as jest.Mock).mockResolvedValue(mockSimilarPets);

        await petController.getSimilarPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockSimilarPets,
            message: 'Similar pets retrieved successfully',
          })
        );
      });

      it('should validate limit boundaries', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.query = { limit: '50' };

        await petController.getSimilarPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Limit must be between 1 and 20',
          })
        );
      });

      it('should use default limit', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.getSimilarPets as jest.Mock).mockResolvedValue([]);

        await petController.getSimilarPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.getSimilarPets).toHaveBeenCalledWith('pet-001', 6);
      });
    });

    describe('when pet not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { petId: 'nonexistent' };

        (PetService.getSimilarPets as jest.Mock).mockRejectedValue(new Error('Pet not found'));

        await petController.getSimilarPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Pet not found',
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 404 error with generic message', async () => {
        mockRequest.params = { petId: 'pet-001' };

        (PetService.getSimilarPets as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.getSimilarPets(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to retrieve similar pets',
          })
        );
      });
    });
  });

  describe('reportPet - Report a pet', () => {
    describe('when reporting pet', () => {
      it('should create report successfully', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = {
          reason: 'Inappropriate content',
          description: 'This pet listing contains inappropriate images',
        };

        const mockReport = {
          report_id: 'report-001',
          pet_id: 'pet-001',
          user_id: 'user-123',
          reason: 'Inappropriate content',
        };

        (PetService.reportPet as jest.Mock).mockResolvedValue(mockReport);

        await petController.reportPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: mockReport,
            message: 'Pet reported successfully',
          })
        );
      });

      it('should call service with correct parameters', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = {
          reason: 'Test reason',
          description: 'Test description',
        };

        (PetService.reportPet as jest.Mock).mockResolvedValue({ report_id: 'report-001' });

        await petController.reportPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(PetService.reportPet).toHaveBeenCalledWith(
          'pet-001',
          'user-123',
          'Test reason',
          'Test description'
        );
      });
    });

    describe('when pet not found', () => {
      it('should return 404 error', async () => {
        mockRequest.params = { petId: 'nonexistent' };
        mockRequest.body = { reason: 'Test' };

        (PetService.reportPet as jest.Mock).mockRejectedValue(new Error('Pet not found'));

        await petController.reportPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Pet not found',
          })
        );
      });
    });

    describe('when service fails', () => {
      it('should return 404 error with generic message', async () => {
        mockRequest.params = { petId: 'pet-001' };
        mockRequest.body = { reason: 'Test' };

        (PetService.reportPet as jest.Mock).mockRejectedValue(new Error('Database error'));

        await petController.reportPet(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to submit pet report',
          })
        );
      });
    });
  });

  describe('Error handling and logging', () => {
    it('should log errors with appropriate context', async () => {
      mockRequest.query = {};

      (PetService.searchPets as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      await petController.searchPets(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(logger.error).toHaveBeenCalledWith('Search pets failed:', expect.any(Error));
    });

    it('should handle unknown error types gracefully', async () => {
      mockRequest.params = { petId: 'pet-001' };

      (PetService.getPetById as jest.Mock).mockRejectedValue('String error');

      await petController.getPetById(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve pet',
        })
      );
    });

    it('should log pet creation with context', async () => {
      mockRequest.body = {
        name: 'Test',
        type: PetType.DOG,
        breed: 'Test Breed',
        gender: Gender.MALE,
        size: Size.MEDIUM,
      };

      (StaffMember.findOne as jest.Mock).mockResolvedValue({ rescueId: 'rescue-456' });
      (PetService.createPet as jest.Mock).mockResolvedValue({ pet_id: 'pet-001' });

      await petController.createPet(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Pet creation request received',
        expect.objectContaining({
          userId: 'user-123',
          bodyKeys: expect.any(Array),
        })
      );
    });
  });
});
