import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PetType, Size, Gender, PetStatus, AgeGroup } from '../models/Pet';
import PetService, { PetSearchFilters } from '../services/pet.service';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

export class PetController {
  private petService = PetService;

  // Validation rules
  static validateCreatePet = [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Pet name must be between 1 and 100 characters'),
    body('type')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Pet type must be between 1 and 50 characters'),
    body('breed')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Breed must be between 1 and 100 characters'),
    body('ageYears')
      .optional()
      .isInt({ min: 0, max: 30 })
      .withMessage('Age years must be between 0 and 30'),
    body('ageMonths')
      .optional()
      .isInt({ min: 0, max: 11 })
      .withMessage('Age months must be between 0 and 11'),
    body('gender')
      .isIn(['male', 'female', 'unknown'])
      .withMessage('Gender must be male, female, or unknown'),
    body('size')
      .isIn(['extra_small', 'small', 'medium', 'large', 'extra_large'])
      .withMessage('Size must be extra_small, small, medium, large, or extra_large'),
    body('color')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Color must be between 1 and 100 characters'),
    body('shortDescription')
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Short description must be between 10 and 500 characters'),
    body('longDescription')
      .optional()
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Long description must be between 10 and 5000 characters'),
    body('adoptionFee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Adoption fee must be a positive number'),
    body('energyLevel')
      .optional()
      .isIn(['low', 'medium', 'high', 'very_high'])
      .withMessage('Energy level must be low, medium, high, or very_high'),
    body('goodWithChildren')
      .optional()
      .isBoolean()
      .withMessage('Good with children must be a boolean'),
    body('goodWithCats').optional().isBoolean().withMessage('Good with cats must be a boolean'),
    body('goodWithDogs').optional().isBoolean().withMessage('Good with dogs must be a boolean'),
    body('houseTrained').optional().isBoolean().withMessage('House trained must be a boolean'),
    body('spayNeuterStatus')
      .optional()
      .isIn(['spayed', 'neutered', 'not_altered', 'unknown'])
      .withMessage('Spay/neuter status must be spayed, neutered, not_altered, or unknown'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('images.*').optional().isURL().withMessage('Each image must be a valid URL'),
  ];

  static validateUpdatePet = [
    param('petId').isString().withMessage('Valid pet ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Pet name must be between 1 and 100 characters'),
    body('type')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Pet type must be between 1 and 50 characters'),
    body('breed')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Breed must be between 1 and 100 characters'),
    body('ageYears')
      .optional()
      .isInt({ min: 0, max: 30 })
      .withMessage('Age years must be between 0 and 30'),
    body('ageMonths')
      .optional()
      .isInt({ min: 0, max: 11 })
      .withMessage('Age months must be between 0 and 11'),
    body('gender')
      .optional()
      .isIn(['male', 'female', 'unknown'])
      .withMessage('Gender must be male, female, or unknown'),
    body('size')
      .optional()
      .isIn(['extra_small', 'small', 'medium', 'large', 'extra_large'])
      .withMessage('Size must be extra_small, small, medium, large, or extra_large'),
    body('adoptionFee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Adoption fee must be a positive number'),
    body('energyLevel')
      .optional()
      .isIn(['low', 'medium', 'high', 'very_high'])
      .withMessage('Energy level must be low, medium, high, or very_high'),
    body('status')
      .optional()
      .isIn([
        'available',
        'pending',
        'adopted',
        'foster',
        'medical_hold',
        'behavioral_hold',
        'not_available',
        'deceased',
      ])
      .withMessage('Invalid status value'),
  ];

  static validatePetId = [param('petId').isString().withMessage('Valid pet ID is required')];

  static validateSearchPets = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('ageMin').optional().isInt({ min: 0 }).withMessage('Minimum age must be non-negative'),
    query('ageMax').optional().isInt({ min: 0 }).withMessage('Maximum age must be non-negative'),
    query('type')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Pet type must be between 1 and 50 characters'),
    query('breed')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Breed must be between 1 and 100 characters'),
    query('size')
      .optional()
      .isIn(['extra_small', 'small', 'medium', 'large', 'extra_large'])
      .withMessage('Size must be extra_small, small, medium, large, or extra_large'),
    query('gender')
      .optional()
      .isIn(['male', 'female', 'unknown'])
      .withMessage('Gender must be male, female, or unknown'),
    query('sortBy')
      .optional()
      .isIn(['name', 'age_years', 'created_at', 'adoption_fee'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('Sort order must be ASC or DESC'),
  ];

  // Search pets with filters and pagination
  searchPets = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const filters: PetSearchFilters = {
        search: req.query.search as string,
        type: req.query.type as PetType | undefined,
        breed: req.query.breed as string,
        size: req.query.size as Size | undefined,
        gender: req.query.gender as Gender | undefined,
        goodWithChildren:
          req.query.goodWithChildren === 'true'
            ? true
            : req.query.goodWithChildren === 'false'
              ? false
              : undefined,
        goodWithCats:
          req.query.goodWithCats === 'true'
            ? true
            : req.query.goodWithCats === 'false'
              ? false
              : undefined,
        goodWithDogs:
          req.query.goodWithDogs === 'true'
            ? true
            : req.query.goodWithDogs === 'false'
              ? false
              : undefined,
        houseTrained:
          req.query.houseTrained === 'true'
            ? true
            : req.query.houseTrained === 'false'
              ? false
              : undefined,
        rescueId: req.query.rescueId as string,
        status: req.query.status as PetStatus | undefined,
        ageMin: req.query.ageMin ? parseInt(req.query.ageMin as string) : undefined,
        ageMax: req.query.ageMax ? parseInt(req.query.ageMax as string) : undefined,
        adoptionFeeMin: req.query.adoptionFeeMin
          ? parseFloat(req.query.adoptionFeeMin as string)
          : undefined,
        adoptionFeeMax: req.query.adoptionFeeMax
          ? parseFloat(req.query.adoptionFeeMax as string)
          : undefined,
      };

      // If user is authenticated and is rescue staff, and no specific rescueId is provided,
      // automatically filter by their rescue
      const authenticatedReq = req as AuthenticatedRequest;
      if (authenticatedReq.user && !filters.rescueId) {
        try {
          const StaffMember = (await import('../models/StaffMember')).default;
          const staffMember = await StaffMember.findOne({
            where: {
              userId: authenticatedReq.user.userId,
              isDeleted: false,
              isVerified: true,
            },
          });

          if (staffMember) {
            filters.rescueId = staffMember.rescueId;
            logger.info('Auto-filtering pets by user rescue:', {
              userId: authenticatedReq.user.userId,
              rescueId: staffMember.rescueId,
            });
          }
        } catch (error) {
          // If there's an error getting staff member, just continue without filtering
          logger.warn('Could not determine user rescue for auto-filtering:', error);
        }
      }

      const options = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as string) || 'created_at',
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
      };

      const result = await this.petService.searchPets(filters, options);

      res.status(200).json({
        success: true,
        data: result.pets,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1,
        },
      });
    } catch (error) {
      logger.error('Search pets failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search pets',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Create a new pet
  createPet = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const pet = await this.petService.createPet(req.body, req.body.rescueId, req.user!.userId);

      res.status(201).json({
        success: true,
        message: 'Pet created successfully',
        data: pet,
      });
    } catch (error) {
      logger.error('Create pet failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create pet',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get pet by ID
  getPetById = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = (req as AuthenticatedRequest).user?.userId;
      const pet = await this.petService.getPetById(req.params.petId, userId);

      if (!pet) {
        return res.status(404).json({
          success: false,
          message: 'Pet not found',
        });
      }

      res.status(200).json({
        success: true,
        data: pet,
      });
    } catch (error) {
      logger.error('Get pet by ID failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pet',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Update pet
  updatePet = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const pet = await this.petService.updatePet(req.params.petId, req.body, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Pet updated successfully',
        data: pet,
      });
    } catch (error) {
      logger.error('Update pet failed:', error);
      const statusCode = error instanceof Error && error.message === 'Pet not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to update pet',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Delete pet
  deletePet = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const reason = req.body.reason;
      const result = await this.petService.deletePet(req.params.petId, req.user!.userId, reason);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Delete pet failed:', error);
      const statusCode = error instanceof Error && error.message === 'Pet not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to delete pet',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Update pet images
  updatePetImages = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const images = req.body.images || [];
      const pet = await this.petService.updatePetImages(req.params.petId, images, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Pet images updated successfully',
        data: pet,
      });
    } catch (error) {
      logger.error('Update pet images failed:', error);
      const statusCode = error instanceof Error && error.message === 'Pet not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to update pet images',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Remove pet image
  removePetImage = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const pet = await this.petService.removePetImage(
        req.params.petId,
        req.params.imageId,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Pet image removed successfully',
        data: pet,
      });
    } catch (error) {
      logger.error('Remove pet image failed:', error);
      const statusCode =
        error instanceof Error &&
        (error.message === 'Pet not found' || error.message === 'Image not found')
          ? 404
          : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to remove pet image',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get pets by rescue
  getPetsByRescue = async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await this.petService.getPetsByRescue(req.params.rescueId, page, limit);

      res.status(200).json({
        success: true,
        data: result.pets,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1,
        },
      });
    } catch (error) {
      logger.error('Get pets by rescue failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pets by rescue',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get pets for the authenticated user's rescue
  getMyRescuePets = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Import StaffMember model to get rescue ID
      const StaffMember = (await import('../models/StaffMember')).default;

      // Find the user's rescue association
      const staffMember = await StaffMember.findOne({
        where: {
          userId: user.userId,
          isDeleted: false,
          isVerified: true,
        },
      });

      if (!staffMember) {
        return res.status(403).json({
          success: false,
          message: 'User is not associated with a rescue organization',
        });
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const type = req.query.type as string;
      const size = req.query.size as string;
      const breed = req.query.breed as string;
      const ageGroup = req.query.ageGroup as string;
      const gender = req.query.gender as string;
      const sortBy = (req.query.sortBy as string) || 'created_at';
      const sortOrder = (req.query.sortOrder as string) || 'DESC';

      // Use the searchPets method with rescue filter
      const result = await this.petService.searchPets(
        {
          rescueId: staffMember.rescueId,
          status: status as PetStatus,
          search,
          type: type as PetType,
          size: size as Size,
          breed,
          ageGroup: ageGroup as AgeGroup,
          gender: gender as Gender,
        },
        {
          page,
          limit,
          sortBy,
          sortOrder: sortOrder as 'ASC' | 'DESC',
        }
      );

      res.status(200).json({
        success: true,
        data: result.pets,
        meta: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1,
        },
      });
    } catch (error) {
      logger.error('Get my rescue pets failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve your rescue pets',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Update pet status
  updatePetStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const statusUpdate = {
        status: req.body.status,
        reason: req.body.reason,
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
        notes: req.body.notes,
      };

      const pet = await this.petService.updatePetStatus(
        req.params.petId,
        statusUpdate,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Pet status updated successfully',
        data: pet,
      });
    } catch (error) {
      logger.error('Update pet status failed:', error);
      const statusCode = error instanceof Error && error.message === 'Pet not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to update pet status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get featured pets
  getFeaturedPets = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const pets = await this.petService.getFeaturedPets(limit);

      res.status(200).json({
        success: true,
        data: pets,
      });
    } catch (error) {
      logger.error('Get featured pets failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve featured pets',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get pet statistics
  getPetStatistics = async (req: Request, res: Response) => {
    try {
      const rescueId = req.query.rescueId as string;
      const stats = await this.petService.getPetStatistics(rescueId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get pet statistics failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pet statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get pet activity
  getPetActivity = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const petId = req.params.petId;
      const activity = await this.petService.getPetActivity(petId);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      logger.error('Error getting pet activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pet activity',
      });
    }
  };

  // Favorite pets functionality
  addToFavorites = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const petId = req.params.petId;
      const userId = req.user!.userId;

      await this.petService.addToFavorites(userId, petId);

      res.json({
        success: true,
        message: 'Pet added to favorites',
      });
    } catch (error) {
      logger.error('Error adding pet to favorites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add pet to favorites',
      });
    }
  };

  removeFromFavorites = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const petId = req.params.petId;
      const userId = req.user!.userId;

      await this.petService.removeFromFavorites(userId, petId);

      res.json({
        success: true,
        message: 'Pet removed from favorites',
      });
    } catch (error) {
      logger.error('Error removing pet from favorites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove pet from favorites',
      });
    }
  };

  getUserFavorites = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const favorites = await this.petService.getUserFavorites(userId, { page, limit });

      res.json({
        success: true,
        data: favorites,
      });
    } catch (error) {
      logger.error('Error getting user favorites:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user favorites',
      });
    }
  };

  checkFavoriteStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { petId } = req.params;

      const isFavorite = await this.petService.checkFavoriteStatus(userId, petId);

      res.json({
        success: true,
        data: { isFavorite },
      });
    } catch (error) {
      logger.error('Error checking favorite status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check favorite status',
      });
    }
  };

  /**
   * Get recent pets
   */
  getRecentPets = async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;

      if (limit < 1 || limit > 50) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be between 1 and 50',
        });
      }

      const pets = await this.petService.getRecentPets(limit);

      res.json({
        success: true,
        data: pets,
        message: 'Recent pets retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting recent pets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recent pets',
      });
    }
  };

  /**
   * Get pet breeds by type
   */
  static validatePetType = [
    param('type')
      .trim()
      .isIn(['dog', 'cat', 'rabbit', 'bird', 'reptile', 'small_mammal', 'fish', 'other'])
      .withMessage('Invalid pet type'),
  ];

  getPetBreedsByType = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { type } = req.params;
      const breeds = await this.petService.getPetBreedsByType(type);

      res.json({
        success: true,
        data: breeds,
        message: `Breeds for ${type} retrieved successfully`,
      });
    } catch (error) {
      logger.error(`Error getting breeds for type ${req.params.type}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pet breeds',
      });
    }
  };

  /**
   * Get all pet types
   */
  getPetTypes = async (req: Request, res: Response) => {
    try {
      const types = await this.petService.getPetTypes();

      res.json({
        success: true,
        data: types,
        message: 'Pet types retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting pet types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pet types',
      });
    }
  };

  /**
   * Get similar pets
   */
  getSimilarPets = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { petId } = req.params;
      const limit = parseInt(req.query.limit as string) || 6;

      if (limit < 1 || limit > 20) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be between 1 and 20',
        });
      }

      const similarPets = await this.petService.getSimilarPets(petId, limit);

      res.json({
        success: true,
        data: similarPets,
        message: 'Similar pets retrieved successfully',
      });
    } catch (error) {
      logger.error(`Error getting similar pets for ${req.params.petId}:`, error);
      res.status(404).json({
        success: false,
        message:
          error instanceof Error && error.message === 'Pet not found'
            ? 'Pet not found'
            : 'Failed to retrieve similar pets',
      });
    }
  };

  /**
   * Report a pet
   */
  static validateReportPet = [
    param('petId').isString().withMessage('Valid pet ID is required'),
    body('reason')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Reason must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
  ];

  reportPet = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = req.user!.userId;
      const { petId } = req.params;
      const { reason, description } = req.body;

      const result = await this.petService.reportPet(petId, userId, reason, description);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Pet reported successfully',
      });
    } catch (error) {
      logger.error(`Error reporting pet ${req.params.petId}:`, error);
      res.status(404).json({
        success: false,
        message:
          error instanceof Error && error.message === 'Pet not found'
            ? 'Pet not found'
            : 'Failed to submit pet report',
      });
    }
  };
}

export default PetController;
