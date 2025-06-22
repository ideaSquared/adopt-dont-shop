import { col, fn, literal, Op, WhereOptions } from 'sequelize';
import Pet, { AgeGroup, PetStatus, PetType, Size } from '../models/Pet';
import Rescue from '../models/Rescue';
import UserFavorite from '../models/UserFavorite';
import { SequelizeOperatorFilter } from '../types/database';
import {
  BreedStats,
  BulkPetOperation,
  BulkPetOperationResult,
  MonthlyAdoptionStats,
  PetActivity,
  PetCreateData,
  PetImageData,
  PetSearchFilters,
  PetSearchOptions,
  PetStatistics,
  PetStatusUpdate,
  PetUpdateData,
} from '../types/pet';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

export class PetService {
  /**
   * Search pets with advanced filtering and sorting
   */
  static async searchPets(
    filters: PetSearchFilters = {},
    options: PetSearchOptions = {}
  ): Promise<{ pets: Pet[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        search,
        type,
        status,
        gender,
        size,
        ageGroup,
        energyLevel,
        breed,
        rescueId,
        goodWithChildren,
        goodWithDogs,
        goodWithCats,
        goodWithSmallAnimals,
        houseTrained,
        specialNeeds,
        featured,
        archived,
        vaccinationStatus,
        spayNeuterStatus,
        adoptionFeeMin,
        adoptionFeeMax,
        weightMin,
        weightMax,
        ageMin,
        ageMax,
        availableSince,
        availableUntil,
        tags,
        location,
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        includeArchived = false,
        includeAdopted = false,
      } = options;

      // Initialize where conditions
      let whereConditions: WhereOptions = {};

      // Basic filters
      if (type) {
        whereConditions.type = type;
      }
      if (status) {
        whereConditions.status = status;
      }
      if (gender) {
        whereConditions.gender = gender;
      }
      if (size) {
        whereConditions.size = size;
      }
      if (ageGroup) {
        whereConditions.age_group = ageGroup;
      }
      if (energyLevel) {
        whereConditions.energy_level = energyLevel;
      }
      if (rescueId) {
        whereConditions.rescue_id = rescueId;
      }
      if (vaccinationStatus) {
        whereConditions.vaccination_status = vaccinationStatus;
      }
      if (spayNeuterStatus) {
        whereConditions.spay_neuter_status = spayNeuterStatus;
      }

      // Boolean filters
      if (goodWithChildren !== undefined) {
        whereConditions.good_with_children = goodWithChildren;
      }
      if (goodWithDogs !== undefined) {
        whereConditions.good_with_dogs = goodWithDogs;
      }
      if (goodWithCats !== undefined) {
        whereConditions.good_with_cats = goodWithCats;
      }
      if (goodWithSmallAnimals !== undefined) {
        whereConditions.good_with_small_animals = goodWithSmallAnimals;
      }
      if (houseTrained !== undefined) {
        whereConditions.house_trained = houseTrained;
      }
      if (specialNeeds !== undefined) {
        whereConditions.special_needs = specialNeeds;
      }
      if (featured !== undefined) {
        whereConditions.featured = featured;
      }

      // Archive and adoption status
      if (!includeArchived) {
        whereConditions.archived = false;
      }
      if (!includeAdopted) {
        whereConditions.status = { [Op.ne]: PetStatus.ADOPTED };
      }

      // Range filters (applied before search)
      if (adoptionFeeMin !== undefined || adoptionFeeMax !== undefined) {
        const feeFilter: SequelizeOperatorFilter = {};
        if (adoptionFeeMin !== undefined) {
          feeFilter[Op.gte] = adoptionFeeMin;
        }
        if (adoptionFeeMax !== undefined) {
          feeFilter[Op.lte] = adoptionFeeMax;
        }
        whereConditions.adoption_fee = feeFilter;
      }

      if (weightMin !== undefined || weightMax !== undefined) {
        const weightFilter: SequelizeOperatorFilter = {};
        if (weightMin !== undefined) {
          weightFilter[Op.gte] = weightMin;
        }
        if (weightMax !== undefined) {
          weightFilter[Op.lte] = weightMax;
        }
        whereConditions.weight_kg = weightFilter;
      }

      // Date filters
      if (availableSince || availableUntil) {
        const dateFilter: SequelizeOperatorFilter = {};
        if (availableSince) {
          dateFilter[Op.gte] = availableSince;
        }
        if (availableUntil) {
          dateFilter[Op.lte] = availableUntil;
        }
        whereConditions.available_since = dateFilter;
      }

      // Tags filter
      if (tags && tags.length > 0) {
        whereConditions.tags = { [Op.overlap]: tags };
      }

      // Text search (applied last as it changes the structure)
      if (search) {
        whereConditions = {
          ...whereConditions,
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { breed: { [Op.iLike]: `%${search}%` } },
            { secondary_breed: { [Op.iLike]: `%${search}%` } },
            { short_description: { [Op.iLike]: `%${search}%` } },
            { long_description: { [Op.iLike]: `%${search}%` } },
            { tags: { [Op.overlap]: [search] } },
          ],
        };
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build order clause
      const orderClause: Array<[string, 'ASC' | 'DESC']> = [];
      orderClause.push(['featured', 'DESC']);
      orderClause.push(['priority_listing', 'DESC']);
      orderClause.push([sortBy, sortOrder]);

      // Execute query
      const { rows: pets, count: total } = await Pet.findAndCountAll({
        where: whereConditions,
        order: orderClause,
        limit,
        offset,
      });

      const totalPages = Math.ceil(total / limit);

      logger.info('Pet search completed', {
        filters,
        options,
        resultsCount: pets.length,
        totalCount: total,
      });

      return {
        pets,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Pet search failed:', error);
      throw new Error('Failed to search pets');
    }
  }

  /**
   * Get pet by ID with full details
   */
  static async getPetById(petId: string, userId?: string): Promise<Pet | null> {
    try {
      const pet = await Pet.findByPk(petId);

      if (!pet) {
        logger.warn('Pet not found', { petId });
        return null;
      }

      // Increment view count
      await pet.increment('view_count');

      // Log pet view
      if (userId) {
        await AuditLogService.log({
          action: 'VIEW',
          entity: 'Pet',
          entityId: petId,
          details: { userId },
          userId,
        });
      }

      logger.info('Pet retrieved successfully', { petId, userId });
      return pet;
    } catch (error) {
      logger.error('Get pet by ID failed:', error);
      throw new Error('Failed to retrieve pet');
    }
  }

  /**
   * Create a new pet
   */
  static async createPet(
    petData: PetCreateData,
    rescueId: string,
    createdBy: string
  ): Promise<Pet> {
    const startTime = Date.now();

    try {
      const { initialImages, initialVideos, ...petAttributes } = petData;

      // Prepare images with required fields
      const images = (initialImages || []).map((img, index) => ({
        image_id: `img_${Date.now()}_${index}`,
        url: img.url,
        thumbnail_url: img.thumbnailUrl,
        caption: img.caption,
        is_primary: img.isPrimary || false,
        order_index: img.orderIndex || index,
        uploaded_at: new Date(),
      }));

      // Prepare videos with required fields
      const videos = (initialVideos || []).map((vid, index) => ({
        video_id: `vid_${Date.now()}_${index}`,
        url: vid.url,
        thumbnail_url: vid.thumbnailUrl,
        caption: vid.caption,
        duration_seconds: vid.durationSeconds,
        uploaded_at: new Date(),
      }));

      // Create pet
      const pet = await Pet.create({
        ...petAttributes,
        rescue_id: rescueId,
        images,
        videos,
      });

      // Log pet creation with performance metrics
      await AuditLogService.log({
        action: 'CREATE',
        entity: 'Pet',
        entityId: pet.pet_id,
        details: {
          rescueId,
          createdBy,
          petData: JSON.parse(JSON.stringify(petAttributes)),
        },
        userId: createdBy,
      });

      loggerHelpers &&
        loggerHelpers.logBusiness &&
        loggerHelpers.logBusiness(
          'Pet Created',
          {
            petId: pet.pet_id,
            rescueId,
            createdBy,
          },
          createdBy
        );

      return pet;
    } catch (error) {
      logger.error('Pet creation failed:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        createdBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Update pet information
   */
  static async updatePet(
    petId: string,
    updateData: PetUpdateData,
    updatedBy: string
  ): Promise<Pet> {
    const startTime = Date.now();

    try {
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      // Store original data for audit
      const originalData = pet.toJSON();

      // Convert camelCase to snake_case for database
      const dbUpdateData: Record<string, unknown> = {};
      if (updateData.shortDescription !== undefined) {
        dbUpdateData.short_description = updateData.shortDescription;
      }
      if (updateData.longDescription !== undefined) {
        dbUpdateData.long_description = updateData.longDescription;
      }
      if (updateData.ageYears !== undefined) {
        dbUpdateData.age_years = updateData.ageYears;
      }
      if (updateData.ageMonths !== undefined) {
        dbUpdateData.age_months = updateData.ageMonths;
      }
      if (updateData.ageGroup !== undefined) {
        dbUpdateData.age_group = updateData.ageGroup;
      }
      if (updateData.secondaryBreed !== undefined) {
        dbUpdateData.secondary_breed = updateData.secondaryBreed;
      }
      if (updateData.weightKg !== undefined) {
        dbUpdateData.weight_kg = updateData.weightKg;
      }
      if (updateData.microchipId !== undefined) {
        dbUpdateData.microchip_id = updateData.microchipId;
      }
      if (updateData.priorityListing !== undefined) {
        dbUpdateData.priority_listing = updateData.priorityListing;
      }
      if (updateData.adoptionFee !== undefined) {
        dbUpdateData.adoption_fee = updateData.adoptionFee;
      }
      if (updateData.specialNeeds !== undefined) {
        dbUpdateData.special_needs = updateData.specialNeeds;
      }
      if (updateData.specialNeedsDescription !== undefined) {
        dbUpdateData.special_needs_description = updateData.specialNeedsDescription;
      }
      if (updateData.houseTrained !== undefined) {
        dbUpdateData.house_trained = updateData.houseTrained;
      }
      if (updateData.goodWithChildren !== undefined) {
        dbUpdateData.good_with_children = updateData.goodWithChildren;
      }
      if (updateData.goodWithDogs !== undefined) {
        dbUpdateData.good_with_dogs = updateData.goodWithDogs;
      }
      if (updateData.goodWithCats !== undefined) {
        dbUpdateData.good_with_cats = updateData.goodWithCats;
      }
      if (updateData.goodWithSmallAnimals !== undefined) {
        dbUpdateData.good_with_small_animals = updateData.goodWithSmallAnimals;
      }
      if (updateData.energyLevel !== undefined) {
        dbUpdateData.energy_level = updateData.energyLevel;
      }
      if (updateData.exerciseNeeds !== undefined) {
        dbUpdateData.exercise_needs = updateData.exerciseNeeds;
      }
      if (updateData.groomingNeeds !== undefined) {
        dbUpdateData.grooming_needs = updateData.groomingNeeds;
      }
      if (updateData.trainingNotes !== undefined) {
        dbUpdateData.training_notes = updateData.trainingNotes;
      }
      if (updateData.medicalNotes !== undefined) {
        dbUpdateData.medical_notes = updateData.medicalNotes;
      }
      if (updateData.behavioralNotes !== undefined) {
        dbUpdateData.behavioral_notes = updateData.behavioralNotes;
      }
      if (updateData.surrenderReason !== undefined) {
        dbUpdateData.surrender_reason = updateData.surrenderReason;
      }
      if (updateData.intakeDate !== undefined) {
        dbUpdateData.intake_date = updateData.intakeDate;
      }
      if (updateData.vaccinationStatus !== undefined) {
        dbUpdateData.vaccination_status = updateData.vaccinationStatus;
      }
      if (updateData.vaccinationDate !== undefined) {
        dbUpdateData.vaccination_date = updateData.vaccinationDate;
      }
      if (updateData.spayNeuterStatus !== undefined) {
        dbUpdateData.spay_neuter_status = updateData.spayNeuterStatus;
      }
      if (updateData.spayNeuterDate !== undefined) {
        dbUpdateData.spay_neuter_date = updateData.spayNeuterDate;
      }
      if (updateData.lastVetCheckup !== undefined) {
        dbUpdateData.last_vet_checkup = updateData.lastVetCheckup;
      }

      // Handle simple field mappings
      const simpleFields = [
        'name',
        'gender',
        'status',
        'breed',
        'size',
        'color',
        'markings',
        'featured',
        'temperament',
        'tags',
        'location',
      ];
      simpleFields.forEach(field => {
        if ((updateData as any)[field] !== undefined) {
          dbUpdateData[field] = (updateData as any)[field];
        }
      });

      // Update pet
      await pet.update(dbUpdateData);

      // Log the update with performance metrics
      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'Pet',
        entityId: petId,
        details: {
          originalData: JSON.parse(JSON.stringify(originalData)),
          updateData: JSON.parse(JSON.stringify(dbUpdateData)),
          updatedBy,
        },
        userId: updatedBy,
      });

      loggerHelpers &&
        loggerHelpers.logBusiness &&
        loggerHelpers.logBusiness(
          'Pet Updated',
          {
            petId,
            updatedBy,
            duration: Date.now() - startTime,
            updatedFields: Object.keys(dbUpdateData),
          },
          updatedBy
        );

      return pet.reload();
    } catch (error) {
      logger.error('Pet update failed:', {
        error: error instanceof Error ? error.message : String(error),
        petId,
        updatedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Update pet status
   */
  static async updatePetStatus(
    petId: string,
    statusUpdate: PetStatusUpdate,
    updatedBy: string
  ): Promise<Pet> {
    const startTime = Date.now();

    try {
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      const originalStatus = pet.status;

      // Update status and related fields
      await pet.update({
        status: statusUpdate.status,
        ...(statusUpdate.effectiveDate && { available_since: statusUpdate.effectiveDate }),
        ...(statusUpdate.status === PetStatus.ADOPTED && { adopted_date: new Date() }),
        ...(statusUpdate.status === PetStatus.FOSTER && { foster_start_date: new Date() }),
      });

      // Log status update
      await AuditLogService.log({
        action: 'UPDATE_STATUS',
        entity: 'Pet',
        entityId: petId,
        details: {
          originalStatus,
          newStatus: statusUpdate.status,
          reason: statusUpdate.reason || null,
          updatedBy,
        },
        userId: updatedBy,
      });

      loggerHelpers &&
        loggerHelpers.logBusiness &&
        loggerHelpers.logBusiness(
          'Pet Status Updated',
          {
            petId,
            originalStatus,
            newStatus: statusUpdate.status,
            updatedBy,
            duration: Date.now() - startTime,
          },
          updatedBy
        );

      return pet.reload();
    } catch (error) {
      logger.error('Pet status update failed:', {
        error: error instanceof Error ? error.message : String(error),
        petId,
        updatedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Delete pet (soft delete)
   */
  static async deletePet(
    petId: string,
    deletedBy: string,
    reason?: string
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      // Soft delete the pet
      await pet.destroy();

      // Log deletion
      await AuditLogService.log({
        action: 'DELETE',
        entity: 'Pet',
        entityId: petId,
        details: {
          reason: reason || null,
          deletedBy,
          petData: JSON.parse(JSON.stringify(pet.toJSON())),
        },
        userId: deletedBy,
      });

      loggerHelpers &&
        loggerHelpers.logBusiness &&
        loggerHelpers.logBusiness(
          'Pet Deleted',
          {
            petId,
            deletedBy,
            reason,
            duration: Date.now() - startTime,
          },
          deletedBy
        );

      return { message: 'Pet deleted successfully' };
    } catch (error) {
      logger.error('Pet deletion failed:', {
        error: error instanceof Error ? error.message : String(error),
        petId,
        deletedBy,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Add images to pet
   */
  static async addPetImages(petId: string, images: PetImageData[], addedBy: string): Promise<Pet> {
    try {
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      // Generate image IDs and prepare image data
      const newImages = images.map((img, index) => ({
        image_id: `img_${Date.now()}_${index}`,
        url: img.url,
        thumbnail_url: img.thumbnailUrl,
        caption: img.caption,
        is_primary: img.isPrimary || false,
        order_index: img.orderIndex || pet.images.length + index,
        uploaded_at: new Date(),
      }));

      // Add to existing images
      const updatedImages = [...pet.images, ...newImages];

      await pet.update({ images: updatedImages });

      // Log image addition
      await AuditLogService.log({
        action: 'ADD_IMAGES',
        entity: 'Pet',
        entityId: petId,
        details: {
          addedImages: JSON.parse(JSON.stringify(newImages)),
          addedBy,
        },
        userId: addedBy,
      });

      logger.info('Pet images added successfully', { petId, imageCount: images.length, addedBy });

      return pet.reload();
    } catch (error) {
      logger.error('Add pet images failed:', error);
      throw error;
    }
  }

  /**
   * Update pet images
   */
  static async updatePetImages(
    petId: string,
    images: PetImageData[],
    updatedBy: string
  ): Promise<Pet> {
    try {
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      // Replace all images
      const newImages = images.map((img, index) => ({
        image_id: img.imageId || `img_${Date.now()}_${index}`,
        url: img.url,
        thumbnail_url: img.thumbnailUrl,
        caption: img.caption,
        is_primary: img.isPrimary || false,
        order_index: img.orderIndex || index,
        uploaded_at: new Date(),
      }));

      await pet.update({ images: newImages });

      // Log image update
      await AuditLogService.log({
        action: 'UPDATE_IMAGES',
        entity: 'Pet',
        entityId: petId,
        details: {
          newImages: JSON.parse(JSON.stringify(newImages)),
          updatedBy,
        },
        userId: updatedBy,
      });

      logger.info('Pet images updated successfully', {
        petId,
        imageCount: images.length,
        updatedBy,
      });

      return pet.reload();
    } catch (error) {
      logger.error('Update pet images failed:', error);
      throw error;
    }
  }

  /**
   * Remove pet image
   */
  static async removePetImage(petId: string, imageId: string, removedBy: string): Promise<Pet> {
    try {
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      const originalImages = pet.images;
      const updatedImages = pet.images.filter(img => img.image_id !== imageId);

      if (originalImages.length === updatedImages.length) {
        throw new Error('Image not found');
      }

      await pet.update({ images: updatedImages });

      // Log image removal
      await AuditLogService.log({
        action: 'REMOVE_IMAGE',
        entity: 'Pet',
        entityId: petId,
        details: {
          imageId,
          removedBy,
        },
        userId: removedBy,
      });

      logger.info('Pet image removed successfully', { petId, imageId, removedBy });

      return pet.reload();
    } catch (error) {
      logger.error('Remove pet image failed:', error);
      throw error;
    }
  }

  /**
   * Get pets by rescue
   */
  static async getPetsByRescue(
    rescueId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ pets: Pet[]; total: number; page: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;

      const { rows: pets, count: total } = await Pet.findAndCountAll({
        where: { rescue_id: rescueId, archived: false },
        order: [
          ['featured', 'DESC'],
          ['priority_listing', 'DESC'],
          ['created_at', 'DESC'],
        ],
        limit,
        offset,
      });

      const totalPages = Math.ceil(total / limit);

      logger.info('Pets by rescue retrieved successfully', { rescueId, total });

      return {
        pets,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Get pets by rescue failed:', error);
      throw new Error('Failed to retrieve pets by rescue');
    }
  }

  /**
   * Get featured pets
   */
  static async getFeaturedPets(limit: number = 10): Promise<Pet[]> {
    try {
      const pets = await Pet.findAll({
        where: {
          featured: true,
          archived: false,
          status: { [Op.in]: [PetStatus.AVAILABLE, PetStatus.FOSTER] },
        },
        order: [
          ['priority_listing', 'DESC'],
          ['created_at', 'DESC'],
        ],
        limit,
      });

      logger.info('Featured pets retrieved successfully', { count: pets.length });

      return pets;
    } catch (error) {
      logger.error('Get featured pets failed:', error);
      throw new Error('Failed to retrieve featured pets');
    }
  }

  /**
   * Get pet statistics
   */
  static async getPetStatistics(rescueId?: string): Promise<PetStatistics> {
    try {
      const whereClause = rescueId ? { rescue_id: rescueId } : {};

      // Get basic counts
      const [totalPets, availablePets, adoptedPets, fosterPets, featuredPets, specialNeedsPets] =
        await Promise.all([
          Pet.count({ where: whereClause }),
          Pet.count({ where: { ...whereClause, status: PetStatus.AVAILABLE } }),
          Pet.count({ where: { ...whereClause, status: PetStatus.ADOPTED } }),
          Pet.count({ where: { ...whereClause, status: PetStatus.FOSTER } }),
          Pet.count({ where: { ...whereClause, featured: true } }),
          Pet.count({ where: { ...whereClause, special_needs: true } }),
        ]);

      // Get counts by type
      const petsByType = await this.getPetCountByType(rescueId);
      const petsByStatus = await this.getPetCountByStatus(rescueId);
      const petsBySize = await this.getPetCountBySize(rescueId);
      const petsByAgeGroup = await this.getPetCountByAgeGroup(rescueId);

      // Get adoption time average
      const averageAdoptionTime = await this.getAverageAdoptionTime(rescueId);

      // Get monthly adoption stats and popular breeds
      const monthlyAdoptions: MonthlyAdoptionStats[] = [];
      const popularBreeds: BreedStats[] = [];

      logger.info('Pet statistics retrieved successfully', { rescueId, totalPets });

      return {
        totalPets,
        availablePets,
        adoptedPets,
        fosterPets,
        featuredPets,
        specialNeedsPets,
        petsByType,
        petsByStatus,
        petsBySize,
        petsByAgeGroup,
        averageAdoptionTime,
        monthlyAdoptions,
        popularBreeds,
      };
    } catch (error) {
      logger.error('Get pet statistics failed:', error);
      throw new Error('Failed to retrieve pet statistics');
    }
  }

  /**
   * Get pet activity data
   */
  static async getPetActivity(petId: string): Promise<PetActivity> {
    try {
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      // Calculate days since posted
      const daysSincePosted = Math.floor(
        (new Date().getTime() - pet.created_at.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate average views per day
      const averageViewsPerDay = daysSincePosted > 0 ? pet.view_count / daysSincePosted : 0;

      logger.info('Pet activity retrieved successfully', { petId });

      return {
        petId,
        viewCount: pet.view_count,
        favoriteCount: pet.favorite_count,
        applicationCount: pet.application_count,
        recentViews: [],
        recentApplications: [],
        daysSincePosted,
        averageViewsPerDay,
      };
    } catch (error) {
      logger.error('Get pet activity failed:', error);
      throw new Error('Failed to retrieve pet activity');
    }
  }

  /**
   * Bulk operations on pets
   */
  static async bulkUpdatePets(
    operation: BulkPetOperation,
    updatedBy: string
  ): Promise<BulkPetOperationResult> {
    try {
      const { petIds, operation: operationType, data, reason } = operation;
      const results: BulkPetOperationResult = {
        successCount: 0,
        failedCount: 0,
        errors: [],
      };

      for (const petId of petIds) {
        try {
          switch (operationType) {
            case 'update_status':
              if (data) {
                await this.updatePetStatus(petId, data as unknown as PetStatusUpdate, updatedBy);
              }
              break;
            case 'archive':
              await Pet.update({ archived: true }, { where: { pet_id: petId } });
              break;
            case 'feature':
              if (data && typeof data.featured === 'boolean') {
                await Pet.update({ featured: data.featured }, { where: { pet_id: petId } });
              }
              break;
            case 'delete':
              await this.deletePet(petId, updatedBy, reason);
              break;
            default:
              throw new Error(`Unknown operation: ${operationType}`);
          }
          results.successCount++;
        } catch (error) {
          results.failedCount++;
          results.errors.push({
            petId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Log bulk operation
      await AuditLogService.log({
        action: 'BULK_OPERATION',
        entity: 'Pet',
        entityId: 'bulk',
        details: {
          operation: operationType,
          petIds,
          data: data || null,
          reason: reason || null,
          results: JSON.parse(JSON.stringify(results)),
          updatedBy,
        },
        userId: updatedBy,
      });

      logger.info('Bulk pet operation completed', {
        operationType,
        totalPets: petIds.length,
        successCount: results.successCount,
        failedCount: results.failedCount,
        updatedBy,
      });

      return results;
    } catch (error) {
      logger.error('Bulk pet operation failed:', error);
      throw error;
    }
  }

  // Private helper methods for statistics
  private static async getPetCountByType(rescueId?: string): Promise<Record<PetType, number>> {
    const whereClause = rescueId ? { rescue_id: rescueId } : {};
    const results = await Pet.findAll({
      where: whereClause,
      attributes: ['type', [fn('COUNT', col('pet_id')), 'count']],
      group: ['type'],
      raw: true,
    });

    const counts: Record<PetType, number> = {} as Record<PetType, number>;
    Object.values(PetType).forEach(type => {
      counts[type] = 0;
    });

    (results as unknown as Array<{ type: PetType; count: string }>).forEach(result => {
      counts[result.type] = parseInt(result.count);
    });

    return counts;
  }

  private static async getPetCountByStatus(rescueId?: string): Promise<Record<PetStatus, number>> {
    const whereClause = rescueId ? { rescue_id: rescueId } : {};
    const results = await Pet.findAll({
      where: whereClause,
      attributes: ['status', [fn('COUNT', col('pet_id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const counts: Record<PetStatus, number> = {} as Record<PetStatus, number>;
    Object.values(PetStatus).forEach(status => {
      counts[status] = 0;
    });

    (results as unknown as Array<{ status: PetStatus; count: string }>).forEach(result => {
      counts[result.status] = parseInt(result.count);
    });

    return counts;
  }

  private static async getPetCountBySize(rescueId?: string): Promise<Record<Size, number>> {
    const whereClause = rescueId ? { rescue_id: rescueId } : {};
    const results = await Pet.findAll({
      where: whereClause,
      attributes: ['size', [fn('COUNT', col('pet_id')), 'count']],
      group: ['size'],
      raw: true,
    });

    const counts: Record<Size, number> = {} as Record<Size, number>;
    Object.values(Size).forEach(size => {
      counts[size] = 0;
    });

    (results as unknown as Array<{ size: Size; count: string }>).forEach(result => {
      counts[result.size] = parseInt(result.count);
    });

    return counts;
  }

  private static async getPetCountByAgeGroup(rescueId?: string): Promise<Record<AgeGroup, number>> {
    const whereClause = rescueId ? { rescue_id: rescueId } : {};
    const results = await Pet.findAll({
      where: whereClause,
      attributes: ['age_group', [fn('COUNT', col('pet_id')), 'count']],
      group: ['age_group'],
      raw: true,
    });

    const counts: Record<AgeGroup, number> = {} as Record<AgeGroup, number>;
    Object.values(AgeGroup).forEach(ageGroup => {
      counts[ageGroup] = 0;
    });

    (results as unknown as Array<{ age_group: AgeGroup; count: string }>).forEach(result => {
      counts[result.age_group] = parseInt(result.count);
    });

    return counts;
  }

  private static async getAverageAdoptionTime(rescueId?: string): Promise<number> {
    try {
      const whereClause = rescueId
        ? { rescue_id: rescueId, status: PetStatus.ADOPTED }
        : { status: PetStatus.ADOPTED };

      const result = await Pet.findOne({
        where: whereClause,
        attributes: [
          [
            fn('AVG', literal('EXTRACT(epoch FROM (adopted_date - available_since)) / 86400')),
            'avg_days',
          ],
        ],
        raw: true,
      });

      return Math.round(parseFloat((result as { avg_days: string } | null)?.avg_days || '0'));
    } catch (error) {
      logger.error('Calculate average adoption time failed:', error);
      return 0;
    }
  }

  static async getPets(
    filters: {
      rescueId?: string;
      type?: PetType;
      status?: PetStatus;
      breed?: string;
      age?: string;
      size?: Size;
      gender?: 'male' | 'female';
      goodWithKids?: boolean;
      goodWithPets?: boolean;
      energyLevel?: 'low' | 'medium' | 'high';
      trainingLevel?: 'none' | 'basic' | 'advanced';
      location?: string;
      adoptionFeeMin?: number;
      adoptionFeeMax?: number;
      weightMin?: number;
      weightMax?: number;
      createdAfter?: Date;
      createdBefore?: Date;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'created_at' | 'name' | 'age' | 'adoption_fee';
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{
    pets: Pet[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        rescueId,
        type,
        status,
        breed,
        age,
        size,
        gender,
        goodWithKids,
        goodWithPets,
        energyLevel,
        trainingLevel,
        location,
        adoptionFeeMin,
        adoptionFeeMax,
        weightMin,
        weightMax,
        createdAfter,
        createdBefore,
        search,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = filters;

      // Build where clause
      const whereClause: WhereOptions = {};

      if (rescueId) {
        whereClause.rescue_id = rescueId;
      }
      if (type) {
        whereClause.type = type;
      }
      if (status) {
        whereClause.status = status;
      }
      if (breed) {
        whereClause.breed = { [Op.iLike]: `%${breed}%` };
      }
      if (size) {
        whereClause.size = size;
      }
      if (gender) {
        whereClause.gender = gender;
      }
      if (goodWithKids !== undefined) {
        whereClause.good_with_children = goodWithKids;
      }
      if (goodWithPets !== undefined) {
        whereClause[Op.or as any] = [
          { good_with_dogs: goodWithPets },
          { good_with_cats: goodWithPets },
        ];
      }
      if (energyLevel) {
        whereClause.energy_level = energyLevel;
      }
      if (location) {
        whereClause.location = { [Op.iLike]: `%${location}%` };
      }

      // Numeric range filters
      if (adoptionFeeMin !== undefined || adoptionFeeMax !== undefined) {
        const feeFilter: any = {};
        if (adoptionFeeMin !== undefined) {
          feeFilter[Op.gte] = adoptionFeeMin;
        }
        if (adoptionFeeMax !== undefined) {
          feeFilter[Op.lte] = adoptionFeeMax;
        }
        whereClause.adoption_fee = feeFilter;
      }

      if (weightMin !== undefined || weightMax !== undefined) {
        const weightFilter: any = {};
        if (weightMin !== undefined) {
          weightFilter[Op.gte] = weightMin;
        }
        if (weightMax !== undefined) {
          weightFilter[Op.lte] = weightMax;
        }
        whereClause.weight_kg = weightFilter;
      }

      // Date range filters
      if (createdAfter || createdBefore) {
        const dateFilter: any = {};
        if (createdAfter) {
          dateFilter[Op.gte] = createdAfter;
        }
        if (createdBefore) {
          dateFilter[Op.lte] = createdBefore;
        }
        whereClause.created_at = dateFilter;
      }

      // Search functionality
      if (search) {
        whereClause[Op.or as any] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { breed: { [Op.iLike]: `%${search}%` } },
          { short_description: { [Op.iLike]: `%${search}%` } },
          { long_description: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const offset = (page - 1) * limit;

      const { rows: pets, count: total } = await Pet.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Rescue,
            as: 'rescue',
            attributes: ['id', 'name', 'city', 'state'],
          },
        ],
        limit,
        offset,
        order: [[sortBy, sortOrder]],
      });

      const totalPages = Math.ceil(total / limit);

      return {
        pets,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error getting pets:', error);
      throw new Error('Failed to retrieve pets');
    }
  }

  // Favorite pets functionality
  static async addToFavorites(userId: string, petId: string): Promise<void> {
    try {
      // Check if pet exists
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      // Check if already favorited
      const existingFavorite = await UserFavorite.findOne({
        where: { user_id: userId, pet_id: petId },
      });

      if (existingFavorite) {
        throw new Error('Pet is already in favorites');
      }

      await UserFavorite.create({
        user_id: userId,
        pet_id: petId,
        created_at: new Date(),
      });

      logger.info(`Pet ${petId} added to favorites for user ${userId}`);
    } catch (error) {
      logger.error('Error adding pet to favorites:', error);
      throw error;
    }
  }

  static async removeFromFavorites(userId: string, petId: string): Promise<void> {
    try {
      const favorite = await UserFavorite.findOne({
        where: { user_id: userId, pet_id: petId },
      });

      if (!favorite) {
        throw new Error('Pet is not in favorites');
      }

      await favorite.destroy();

      logger.info(`Pet ${petId} removed from favorites for user ${userId}`);
    } catch (error) {
      logger.error('Error removing pet from favorites:', error);
      throw error;
    }
  }

  static async getUserFavorites(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ pets: Pet[]; total: number; page: number; totalPages: number }> {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const { rows: favorites, count: total } = await UserFavorite.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: Pet,
            as: 'pet',
            include: [
              {
                model: Rescue,
                as: 'rescue',
                attributes: ['id', 'name', 'city', 'state'],
              },
            ],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const pets = favorites.map((favorite: any) => favorite.pet);
      const totalPages = Math.ceil(total / limit);

      return {
        pets,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error getting user favorites:', error);
      throw new Error('Failed to retrieve user favorites');
    }
  }

  static async checkFavoriteStatus(userId: string, petId: string): Promise<boolean> {
    try {
      const favorite = await UserFavorite.findOne({
        where: { user_id: userId, pet_id: petId },
      });

      return !!favorite;
    } catch (error) {
      logger.error('Error checking favorite status:', error);
      throw new Error('Failed to check favorite status');
    }
  }
}

export default PetService;

// Export the types for use in controllers
export {
  BulkPetOperation,
  BulkPetOperationResult,
  PetActivity,
  PetCreateData,
  PetImageData,
  PetSearchFilters,
  PetStatistics,
  PetStatusUpdate,
  PetUpdateData,
};
