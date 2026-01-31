import { col, fn, literal, Op, WhereOptions } from 'sequelize';
import Pet, { AgeGroup, PetStatus, PetType, Size } from '../models/Pet';
import Rescue from '../models/Rescue';
import UserFavorite from '../models/UserFavorite';
import Report, { ReportCategory, ReportStatus, ReportSeverity } from '../models/Report';
import sequelize from '../sequelize';
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

/**
 * Helper to get the appropriate LIKE operator based on database dialect
 * PostgreSQL supports case-insensitive iLike, SQLite needs uppercase conversion
 */
const getLikeOp = () => {
  return sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
};

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
      if (breed) {
        whereConditions.breed = { [getLikeOp()]: `%${breed}%` };
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
      if (!includeAdopted && !status) {
        // Only apply the "not adopted" filter if no specific status is requested
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

      // Tags filter (PostgreSQL only - SQLite doesn't support overlap)
      if (tags && tags.length > 0 && sequelize.getDialect() === 'postgres') {
        whereConditions.tags = { [Op.overlap]: tags };
      }

      // Text search (applied last as it changes the structure)
      if (search) {
        const searchConditions: WhereOptions[] = [
          { name: { [getLikeOp()]: `%${search}%` } },
          { breed: { [getLikeOp()]: `%${search}%` } },
          { secondary_breed: { [getLikeOp()]: `%${search}%` } },
          { short_description: { [getLikeOp()]: `%${search}%` } },
          { long_description: { [getLikeOp()]: `%${search}%` } },
        ];

        // Only add tags search for PostgreSQL (SQLite doesn't support overlap operator)
        if (sequelize.getDialect() === 'postgres') {
          searchConditions.push({ tags: { [Op.overlap]: [search] } });
        }

        whereConditions = {
          ...whereConditions,
          [Op.or]: searchConditions,
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

      if (loggerHelpers && loggerHelpers.logBusiness) {
        loggerHelpers.logBusiness(
          'Pet Created',
          {
            petId: pet.pet_id,
            rescueId,
            createdBy,
          },
          createdBy
        );
      }

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

      // Normalize input: the API accepts both camelCase and snake_case field names.
      // The frontend service sends snake_case, so we normalize to camelCase first,
      // then convert to snake_case for the database.
      const snakeToCamelMapping: Record<string, string> = {
        short_description: 'shortDescription',
        long_description: 'longDescription',
        age_years: 'ageYears',
        age_months: 'ageMonths',
        age_group: 'ageGroup',
        secondary_breed: 'secondaryBreed',
        weight_kg: 'weightKg',
        microchip_id: 'microchipId',
        priority_listing: 'priorityListing',
        adoption_fee: 'adoptionFee',
        special_needs: 'specialNeeds',
        special_needs_description: 'specialNeedsDescription',
        house_trained: 'houseTrained',
        good_with_children: 'goodWithChildren',
        good_with_dogs: 'goodWithDogs',
        good_with_cats: 'goodWithCats',
        good_with_small_animals: 'goodWithSmallAnimals',
        energy_level: 'energyLevel',
        exercise_needs: 'exerciseNeeds',
        grooming_needs: 'groomingNeeds',
        training_notes: 'trainingNotes',
        medical_notes: 'medicalNotes',
        behavioral_notes: 'behavioralNotes',
        surrender_reason: 'surrenderReason',
        intake_date: 'intakeDate',
        vaccination_status: 'vaccinationStatus',
        vaccination_date: 'vaccinationDate',
        spay_neuter_status: 'spayNeuterStatus',
        spay_neuter_date: 'spayNeuterDate',
        last_vet_checkup: 'lastVetCheckup',
      };

      const rawData = updateData as Record<string, unknown>;
      const normalizedData: Record<string, unknown> = { ...rawData };

      for (const [snakeKey, camelKey] of Object.entries(snakeToCamelMapping)) {
        if (rawData[snakeKey] !== undefined && rawData[camelKey] === undefined) {
          normalizedData[camelKey] = rawData[snakeKey];
          delete normalizedData[snakeKey];
        }
      }

      // Convert camelCase to snake_case for database
      const dbUpdateData: Record<string, unknown> = {};
      if (normalizedData.shortDescription !== undefined) {
        dbUpdateData.short_description = normalizedData.shortDescription;
      }
      if (normalizedData.longDescription !== undefined) {
        dbUpdateData.long_description = normalizedData.longDescription;
      }
      if (normalizedData.ageYears !== undefined) {
        dbUpdateData.age_years = normalizedData.ageYears;
      }
      if (normalizedData.ageMonths !== undefined) {
        dbUpdateData.age_months = normalizedData.ageMonths;
      }
      if (normalizedData.ageGroup !== undefined) {
        dbUpdateData.age_group = normalizedData.ageGroup;
      }
      if (normalizedData.secondaryBreed !== undefined) {
        dbUpdateData.secondary_breed = normalizedData.secondaryBreed;
      }
      if (normalizedData.weightKg !== undefined) {
        dbUpdateData.weight_kg = normalizedData.weightKg;
      }
      if (normalizedData.microchipId !== undefined) {
        dbUpdateData.microchip_id = normalizedData.microchipId;
      }
      if (normalizedData.priorityListing !== undefined) {
        dbUpdateData.priority_listing = normalizedData.priorityListing;
      }
      if (normalizedData.adoptionFee !== undefined) {
        dbUpdateData.adoption_fee = normalizedData.adoptionFee;
      }
      if (normalizedData.specialNeeds !== undefined) {
        dbUpdateData.special_needs = normalizedData.specialNeeds;
      }
      if (normalizedData.specialNeedsDescription !== undefined) {
        dbUpdateData.special_needs_description = normalizedData.specialNeedsDescription;
      }
      if (normalizedData.houseTrained !== undefined) {
        dbUpdateData.house_trained = normalizedData.houseTrained;
      }
      if (normalizedData.goodWithChildren !== undefined) {
        dbUpdateData.good_with_children = normalizedData.goodWithChildren;
      }
      if (normalizedData.goodWithDogs !== undefined) {
        dbUpdateData.good_with_dogs = normalizedData.goodWithDogs;
      }
      if (normalizedData.goodWithCats !== undefined) {
        dbUpdateData.good_with_cats = normalizedData.goodWithCats;
      }
      if (normalizedData.goodWithSmallAnimals !== undefined) {
        dbUpdateData.good_with_small_animals = normalizedData.goodWithSmallAnimals;
      }
      if (normalizedData.energyLevel !== undefined) {
        dbUpdateData.energy_level = normalizedData.energyLevel;
      }
      if (normalizedData.exerciseNeeds !== undefined) {
        dbUpdateData.exercise_needs = normalizedData.exerciseNeeds;
      }
      if (normalizedData.groomingNeeds !== undefined) {
        dbUpdateData.grooming_needs = normalizedData.groomingNeeds;
      }
      if (normalizedData.trainingNotes !== undefined) {
        dbUpdateData.training_notes = normalizedData.trainingNotes;
      }
      if (normalizedData.medicalNotes !== undefined) {
        dbUpdateData.medical_notes = normalizedData.medicalNotes;
      }
      if (normalizedData.behavioralNotes !== undefined) {
        dbUpdateData.behavioral_notes = normalizedData.behavioralNotes;
      }
      if (normalizedData.surrenderReason !== undefined) {
        dbUpdateData.surrender_reason = normalizedData.surrenderReason;
      }
      if (normalizedData.intakeDate !== undefined) {
        dbUpdateData.intake_date = normalizedData.intakeDate;
      }
      if (normalizedData.vaccinationStatus !== undefined) {
        dbUpdateData.vaccination_status = normalizedData.vaccinationStatus;
      }
      if (normalizedData.vaccinationDate !== undefined) {
        dbUpdateData.vaccination_date = normalizedData.vaccinationDate;
      }
      if (normalizedData.spayNeuterStatus !== undefined) {
        dbUpdateData.spay_neuter_status = normalizedData.spayNeuterStatus;
      }
      if (normalizedData.spayNeuterDate !== undefined) {
        dbUpdateData.spay_neuter_date = normalizedData.spayNeuterDate;
      }
      if (normalizedData.lastVetCheckup !== undefined) {
        dbUpdateData.last_vet_checkup = normalizedData.lastVetCheckup;
      }

      // Handle simple field mappings (fields where column name matches key)
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
      ] as const;

      simpleFields.forEach(field => {
        const value = normalizedData[field];
        if (value !== undefined) {
          dbUpdateData[field] = value;
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

      if (loggerHelpers && loggerHelpers.logBusiness) {
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
      }

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

      if (loggerHelpers && loggerHelpers.logBusiness) {
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
      }

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

      if (loggerHelpers && loggerHelpers.logBusiness) {
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
      }

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
      const petsByType = await PetService.getPetCountByType(rescueId);
      const petsByStatus = await PetService.getPetCountByStatus(rescueId);
      const petsBySize = await PetService.getPetCountBySize(rescueId);
      const petsByAgeGroup = await PetService.getPetCountByAgeGroup(rescueId);

      // Get adoption time average
      const averageAdoptionTime = await PetService.getAverageAdoptionTime(rescueId);

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

      // Database-agnostic date difference calculation
      // SQLite: julianday() returns days
      // PostgreSQL: EXTRACT(epoch FROM ...) / 86400 returns days
      const dialect = sequelize.getDialect();
      const dateDiffExpression =
        dialect === 'sqlite'
          ? literal('julianday(adopted_date) - julianday(available_since)')
          : literal('EXTRACT(epoch FROM (adopted_date - available_since)) / 86400');

      const result = await Pet.findOne({
        where: whereClause,
        attributes: [[fn('AVG', dateDiffExpression), 'avg_days']],
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
        whereClause.breed = { [getLikeOp()]: `%${breed}%` };
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
        (whereClause as Record<symbol, unknown>)[Op.or] = [
          { good_with_dogs: goodWithPets },
          { good_with_cats: goodWithPets },
        ];
      }
      if (energyLevel) {
        whereClause.energy_level = energyLevel;
      }
      if (location) {
        whereClause.location = { [getLikeOp()]: `%${location}%` };
      }

      // Numeric range filters
      if (adoptionFeeMin !== undefined || adoptionFeeMax !== undefined) {
        const feeFilter: SequelizeOperatorFilter = {};
        if (adoptionFeeMin !== undefined) {
          feeFilter[Op.gte] = adoptionFeeMin;
        }
        if (adoptionFeeMax !== undefined) {
          feeFilter[Op.lte] = adoptionFeeMax;
        }
        whereClause.adoption_fee = feeFilter;
      }

      if (weightMin !== undefined || weightMax !== undefined) {
        const weightFilter: SequelizeOperatorFilter = {};
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
        const dateFilter: SequelizeOperatorFilter = {};
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
        (whereClause as Record<symbol, unknown>)[Op.or] = [
          { name: { [getLikeOp()]: `%${search}%` } },
          { breed: { [getLikeOp()]: `%${search}%` } },
          { short_description: { [getLikeOp()]: `%${search}%` } },
          { long_description: { [getLikeOp()]: `%${search}%` } },
        ];
      }

      const offset = (page - 1) * limit;

      const { rows: pets, count: total } = await Pet.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['rescueId', 'name', 'city', 'state'],
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

      // Check if already favorited (including soft-deleted records)
      const existingFavorite = await UserFavorite.findOne({
        where: { user_id: userId, pet_id: petId },
        paranoid: false, // Include soft-deleted records
      });

      if (existingFavorite && !existingFavorite.deleted_at) {
        // Already favorited and not soft-deleted
        throw new Error('Pet is already in favorites');
      }

      if (existingFavorite && existingFavorite.deleted_at) {
        // Restore soft-deleted favorite
        await existingFavorite.restore();
        logger.info(`Pet ${petId} favorite restored for user ${userId}`);
      } else {
        // Create new favorite
        await UserFavorite.create({
          user_id: userId,
          pet_id: petId,
          created_at: new Date(),
        });
        logger.info(`Pet ${petId} added to favorites for user ${userId}`);
      }
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

      interface UserFavoriteWithPet extends UserFavorite {
        Pet: Pet;
      }

      const { rows: favorites, count: total } = await UserFavorite.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: Pet,
            as: 'Pet',
            include: [
              {
                model: Rescue,
                as: 'Rescue',
                attributes: ['rescueId', 'name', 'city', 'state'],
              },
            ],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const pets = (favorites as UserFavoriteWithPet[]).map(favorite => favorite.Pet);
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

  /**
   * Get recent pets (recently added)
   */
  static async getRecentPets(limit: number = 12): Promise<Pet[]> {
    try {
      const pets = await Pet.findAll({
        where: {
          status: PetStatus.AVAILABLE,
          archived: false,
        },
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['rescueId', 'name', 'city', 'state'],
          },
        ],
        order: [['created_at', 'DESC']],
        limit,
      });

      logger.info(`Retrieved ${pets.length} recent pets`);
      return pets;
    } catch (error) {
      logger.error('Error getting recent pets:', error);
      throw new Error('Failed to retrieve recent pets');
    }
  }

  /**
   * Get pet breeds by type
   */
  static async getPetBreedsByType(type: string): Promise<string[]> {
    try {
      const validType = type.toLowerCase();

      // Validate pet type
      if (!Object.values(PetType).includes(validType as PetType)) {
        throw new Error(`Invalid pet type: ${type}`);
      }

      const breeds = await Pet.findAll({
        attributes: ['breed'],
        where: {
          type: validType,
          archived: false,
        },
        group: ['breed'],
        order: [['breed', 'ASC']],
      });

      const breedNames = breeds
        .map(pet => pet.breed)
        .filter((breed): breed is string => breed !== null && breed.trim() !== '')
        .sort();

      logger.info(`Retrieved ${breedNames.length} breeds for type ${type}`);
      return breedNames;
    } catch (error) {
      // Re-throw validation errors as-is
      if (error instanceof Error && error.message.includes('Invalid pet type:')) {
        throw error;
      }
      logger.error(`Error getting breeds for type ${type}:`, error);
      throw new Error(`Failed to retrieve breeds for pet type: ${type}`);
    }
  }

  /**
   * Get all available pet types
   */
  static async getPetTypes(): Promise<string[]> {
    try {
      const types = Object.values(PetType);
      logger.info(`Retrieved ${types.length} pet types`);
      return types;
    } catch (error) {
      logger.error('Error getting pet types:', error);
      throw new Error('Failed to retrieve pet types');
    }
  }

  /**
   * Get similar pets based on breed, type, size, and age
   */
  static async getSimilarPets(petId: string, limit: number = 6): Promise<Pet[]> {
    try {
      // First get the reference pet
      const referencePet = await Pet.findByPk(petId);
      if (!referencePet) {
        throw new Error('Pet not found');
      }

      // Find similar pets with priority scoring
      const similarPets = await Pet.findAll({
        where: {
          pet_id: { [Op.ne]: petId }, // Exclude the reference pet
          status: PetStatus.AVAILABLE,
          archived: false,
          [Op.or]: [
            { breed: referencePet.breed }, // Same breed (highest priority)
            { type: referencePet.type }, // Same type
            { size: referencePet.size }, // Same size
            { age_group: referencePet.age_group }, // Same age group
          ],
        },
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['rescueId', 'name', 'city', 'state'],
          },
        ],
        order: [
          // Prioritize exact breed matches first
          [sequelize.literal(`CASE WHEN breed = '${referencePet.breed}' THEN 0 ELSE 1 END`), 'ASC'],
          // Then by type matches
          [sequelize.literal(`CASE WHEN type = '${referencePet.type}' THEN 0 ELSE 1 END`), 'ASC'],
          // Finally by creation date (newest first)
          ['created_at', 'DESC'],
        ],
        limit,
      });

      logger.info(`Found ${similarPets.length} similar pets for pet ${petId}`);
      return similarPets;
    } catch (error) {
      // Re-throw "Pet not found" errors as-is
      if (error instanceof Error && error.message === 'Pet not found') {
        throw error;
      }
      logger.error(`Error getting similar pets for ${petId}:`, error);
      throw new Error('Failed to retrieve similar pets');
    }
  }

  /**
   * Report a pet for inappropriate content or other issues
   */
  static async reportPet(
    petId: string,
    reportedBy: string,
    reason: string,
    description?: string
  ): Promise<{ reportId: string; message: string }> {
    try {
      // Verify pet exists
      const pet = await Pet.findByPk(petId);
      if (!pet) {
        throw new Error('Pet not found');
      }

      // Create the report
      const report = await Report.create({
        reportedEntityType: 'pet',
        reportedEntityId: petId,
        reporterId: reportedBy,
        category: ReportCategory.INAPPROPRIATE_CONTENT, // Default category for pet reports
        title: reason,
        description: description || 'No description provided',
        status: ReportStatus.PENDING,
        severity: ReportSeverity.MEDIUM, // Default severity
        evidence: [], // Required field, empty array for now
      });

      logger.info(`Pet ${petId} reported by user ${reportedBy} for reason: ${reason}`);

      return {
        reportId: report.reportId,
        message: 'Report submitted successfully',
      };
    } catch (error) {
      // Re-throw "Pet not found" errors as-is
      if (error instanceof Error && error.message === 'Pet not found') {
        throw error;
      }
      logger.error(`Error reporting pet ${petId}:`, error);
      throw new Error('Failed to submit pet report');
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
