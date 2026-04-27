import { col, fn, literal, Op, WhereOptions } from 'sequelize';
import Breed from '../models/Breed';
import Pet, { AgeGroup, PetStatus, PetType, Size } from '../models/Pet';
import PetMedia, { PetMediaType } from '../models/PetMedia';
import PetStatusTransition from '../models/PetStatusTransition';
import { validateSortField } from '../utils/sort-validation';
import Rescue from '../models/Rescue';
import UserFavorite from '../models/UserFavorite';
import Report, { ReportCategory, ReportStatus, ReportSeverity } from '../models/Report';
import sequelize from '../sequelize';
import { SequelizeOperatorFilter } from '../types/database';
import {
  calculateDistance,
  extractCoordinates,
  isValidCoordinates,
  milesToKilometers,
} from '../utils/geolocation';
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

const PET_SEARCH_SORT_FIELDS = [
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
  'name',
  'ageYears',
  'adoptionFeeMinor',
  'distance',
] as const;
const PET_RESCUE_LIST_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'age',
  'adoptionFeeMinor',
] as const;

/**
 * Helper to get the appropriate LIKE operator based on database dialect
 * PostgreSQL supports case-insensitive iLike, SQLite needs uppercase conversion
 */
const getLikeOp = () => {
  return sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
};

/**
 * Plan 2.4 — breed is now an FK into the breeds lookup table. Callers
 * still pass a free-form breed name (the API contract didn't change);
 * resolve it to a list of breed_ids the service can use as an IN-list
 * filter. Returns an empty array when no breeds match — the caller
 * should treat that as "no results", not "no filter".
 */
const resolveBreedIdsByName = async (name: string): Promise<string[]> => {
  const rows = await Breed.findAll({
    where: { name: { [getLikeOp()]: `%${name}%` } },
    attributes: ['breed_id'],
  });
  // Filter out undefined/null breed_ids defensively. In some integration
  // test contexts Sequelize's auto-mock surfaces phantom rows whose
  // attribute getters return undefined; we never want those in the
  // IN-list (they'd render as `breedId IN (NULL, NULL)`, which matches
  // nothing semantically but produces noise).
  return rows.map(b => b.breed_id).filter((id): id is string => Boolean(id));
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
        latitude,
        longitude,
        maxDistance,
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
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
      // Plan 2.4 — breed is an FK into the breeds table. Resolve the
      // caller's free-form name to breed_ids; the actual WHERE
      // contribution is merged in after all simple filters so it can
      // share the [Op.or] slot with the text search if both are set.
      const breedIdsForFilter = breed ? await resolveBreedIdsByName(breed) : null;
      if (ageGroup) {
        whereConditions.ageGroup = ageGroup;
      }
      if (energyLevel) {
        whereConditions.energyLevel = energyLevel;
      }
      if (rescueId) {
        whereConditions.rescueId = rescueId;
      }
      if (vaccinationStatus) {
        whereConditions.vaccinationStatus = vaccinationStatus;
      }
      if (spayNeuterStatus) {
        whereConditions.spayNeuterStatus = spayNeuterStatus;
      }

      // Boolean filters
      if (goodWithChildren !== undefined) {
        whereConditions.goodWithChildren = goodWithChildren;
      }
      if (goodWithDogs !== undefined) {
        whereConditions.goodWithDogs = goodWithDogs;
      }
      if (goodWithCats !== undefined) {
        whereConditions.goodWithCats = goodWithCats;
      }
      if (goodWithSmallAnimals !== undefined) {
        whereConditions.goodWithSmallAnimals = goodWithSmallAnimals;
      }
      if (houseTrained !== undefined) {
        whereConditions.houseTrained = houseTrained;
      }
      if (specialNeeds !== undefined) {
        whereConditions.specialNeeds = specialNeeds;
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

      // Range filters (applied before search). Filter values are in major
      // units for ergonomics; the column is in minor units (pence/cents).
      if (adoptionFeeMin !== undefined || adoptionFeeMax !== undefined) {
        const feeFilter: SequelizeOperatorFilter = {};
        if (adoptionFeeMin !== undefined) {
          feeFilter[Op.gte] = Math.round(adoptionFeeMin * 100);
        }
        if (adoptionFeeMax !== undefined) {
          feeFilter[Op.lte] = Math.round(adoptionFeeMax * 100);
        }
        whereConditions.adoptionFeeMinor = feeFilter;
      }

      if (weightMin !== undefined || weightMax !== undefined) {
        const weightFilter: SequelizeOperatorFilter = {};
        if (weightMin !== undefined) {
          weightFilter[Op.gte] = weightMin;
        }
        if (weightMax !== undefined) {
          weightFilter[Op.lte] = weightMax;
        }
        whereConditions.weightKg = weightFilter;
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
        whereConditions.availableSince = dateFilter;
      }

      // Tags filter (PostgreSQL only - SQLite doesn't support overlap)
      if (tags && tags.length > 0 && sequelize.getDialect() === 'postgres') {
        whereConditions.tags = { [Op.overlap]: tags };
      }

      // Plan 2.4 — breed filter and the text-search OR may both want
      // to set [Op.or] on the where; bundle them as separate AND-ed
      // OR groups so they coexist instead of overwriting each other.
      const andClauses: WhereOptions[] = [];

      if (breedIdsForFilter !== null) {
        if (breedIdsForFilter.length === 0) {
          whereConditions.breedId = '__never_matches__';
        } else {
          andClauses.push({
            [Op.or]: [
              { breedId: { [Op.in]: breedIdsForFilter } },
              { secondaryBreedId: { [Op.in]: breedIdsForFilter } },
            ],
          });
        }
      }

      // Text search (applied last as it changes the structure).
      // Plan 2.4 — breed names live in the breeds lookup table now.
      // Resolve the search term against breed names up-front so the
      // OR can include breedId / secondaryBreedId IN-lists alongside
      // the name / description LIKE clauses.
      if (search) {
        const searchBreedIds = await resolveBreedIdsByName(search);
        const searchConditions: WhereOptions[] = [
          { name: { [getLikeOp()]: `%${search}%` } },
          { shortDescription: { [getLikeOp()]: `%${search}%` } },
          { longDescription: { [getLikeOp()]: `%${search}%` } },
        ];
        if (searchBreedIds.length > 0) {
          searchConditions.push({ breedId: { [Op.in]: searchBreedIds } });
          searchConditions.push({ secondaryBreedId: { [Op.in]: searchBreedIds } });
        }

        // Only add tags search for PostgreSQL (SQLite doesn't support overlap operator)
        if (sequelize.getDialect() === 'postgres') {
          searchConditions.push({ tags: { [Op.overlap]: [search] } });
        }

        andClauses.push({ [Op.or]: searchConditions });
      }

      if (andClauses.length > 0) {
        whereConditions = {
          ...whereConditions,
          [Op.and]: andClauses,
        };
      }

      // Distance-based filtering (PostgreSQL with PostGIS only)
      const hasValidLocation =
        latitude !== undefined &&
        longitude !== undefined &&
        isValidCoordinates(latitude, longitude);

      const isPostgres = sequelize.getDialect() === 'postgres';

      if (hasValidLocation && isPostgres && maxDistance !== undefined && maxDistance > 0) {
        const radiusKm = milesToKilometers(maxDistance);
        const radiusMeters = radiusKm * 1000;

        // ST_DWithin filters pets within the given radius
        whereConditions = {
          ...whereConditions,
          [Op.and]: [
            ...(Array.isArray((whereConditions as Record<symbol, unknown>)[Op.and])
              ? ((whereConditions as Record<symbol, unknown>)[Op.and] as WhereOptions[])
              : []),
            literal(
              `ST_DWithin(location, ST_SetSRID(ST_MakePoint(${Number(longitude)}, ${Number(latitude)}), 4326)::geography, ${Number(radiusMeters)})`
            ),
          ],
        };
      }

      // Calculate offset
      const offset = (page - 1) * limit;
      const safeSortBy = validateSortField(sortBy, PET_SEARCH_SORT_FIELDS, 'createdAt');

      // Build order clause
      const orderClause: Array<[string, 'ASC' | 'DESC'] | ReturnType<typeof literal>> = [];
      orderClause.push(['featured', 'DESC'] as [string, 'ASC' | 'DESC']);
      orderClause.push(['priorityListing', 'DESC'] as [string, 'ASC' | 'DESC']);

      // Distance-based sorting
      if (safeSortBy === 'distance' && hasValidLocation && isPostgres) {
        orderClause.push(
          literal(
            `ST_Distance(location, ST_SetSRID(ST_MakePoint(${Number(longitude)}, ${Number(latitude)}), 4326)::geography) ASC`
          )
        );
      } else {
        orderClause.push([safeSortBy, sortOrder] as [string, 'ASC' | 'DESC']);
      }

      // Execute query
      const queryOptions: Record<string, unknown> = {
        where: whereConditions,
        order: orderClause,
        limit,
        offset,
      };

      const { rows: pets, count: total } = await Pet.findAndCountAll(queryOptions);

      // Compute distance in JS using Haversine.
      // extractCoordinates handles GeoJSON objects, WKB hex strings (returned by
      // PostGIS when Sequelize's type parser isn't registered for the OID), and
      // JSON strings, so this works regardless of how the location was serialised.
      type PetWithDistance = (typeof pets)[number] & { distance?: number };
      const petsWithDistance: PetWithDistance[] = hasValidLocation
        ? pets.map(pet => {
            const coords = extractCoordinates(pet.location);
            if (!coords) {
              return pet;
            }
            const dist = calculateDistance(
              Number(latitude),
              Number(longitude),
              coords.lat,
              coords.lng,
              'miles'
            );
            return Object.assign(Object.create(Object.getPrototypeOf(pet)), pet, {
              distance: Math.round(dist * 10) / 10,
            });
          })
        : pets;

      const totalPages = Math.ceil(total / limit);

      logger.info('Pet search completed', {
        filters,
        options,
        resultsCount: pets.length,
        totalCount: total,
      });

      return {
        pets: petsWithDistance,
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
      await pet.increment('viewCount');

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

      // Create pet first; media rows reference the new pet_id (plan 2.1).
      const pet = await Pet.create({
        ...petAttributes,
        rescueId,
      });

      // Initial gallery — images and videos are rows in pet_media now,
      // not JSONB on the parent.
      if ((initialImages?.length ?? 0) > 0) {
        await PetMedia.bulkCreate(
          (initialImages ?? []).map((img, index) => ({
            pet_id: pet.petId,
            type: PetMediaType.IMAGE,
            url: img.url,
            thumbnail_url: img.thumbnailUrl ?? null,
            caption: img.caption ?? null,
            is_primary: img.isPrimary || false,
            order_index: img.orderIndex ?? index,
            duration_seconds: null,
            uploaded_at: new Date(),
          }))
        );
      }

      if ((initialVideos?.length ?? 0) > 0) {
        await PetMedia.bulkCreate(
          (initialVideos ?? []).map((vid, index) => ({
            pet_id: pet.petId,
            type: PetMediaType.VIDEO,
            url: vid.url,
            thumbnail_url: vid.thumbnailUrl ?? null,
            caption: vid.caption ?? null,
            is_primary: false,
            order_index: index,
            duration_seconds: vid.durationSeconds ?? null,
            uploaded_at: new Date(),
          }))
        );
      }

      // Seed the transition log with the initial status. The trigger /
      // hook would otherwise re-set pets.status to its default — a no-op
      // here, but the row is what makes "history complete" structural.
      await PetStatusTransition.create({
        petId: pet.petId,
        fromStatus: null,
        toStatus: pet.status,
        transitionedBy: createdBy,
        reason: 'Initial listing',
      });

      // Log pet creation with performance metrics
      await AuditLogService.log({
        action: 'CREATE',
        entity: 'Pet',
        entityId: pet.petId,
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
            petId: pet.petId,
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
        shortDescription: 'shortDescription',
        longDescription: 'longDescription',
        ageYears: 'ageYears',
        ageMonths: 'ageMonths',
        ageGroup: 'ageGroup',
        secondaryBreedId: 'secondaryBreedId',
        weightKg: 'weightKg',
        microchipId: 'microchipId',
        priorityListing: 'priorityListing',
        adoptionFeeMinor: 'adoptionFeeMinor',
        adoptionFeeCurrency: 'adoptionFeeCurrency',
        specialNeeds: 'specialNeeds',
        specialNeedsDescription: 'specialNeedsDescription',
        houseTrained: 'houseTrained',
        goodWithChildren: 'goodWithChildren',
        goodWithDogs: 'goodWithDogs',
        goodWithCats: 'goodWithCats',
        goodWithSmallAnimals: 'goodWithSmallAnimals',
        energyLevel: 'energyLevel',
        exerciseNeeds: 'exerciseNeeds',
        groomingNeeds: 'groomingNeeds',
        trainingNotes: 'trainingNotes',
        medicalNotes: 'medicalNotes',
        behavioralNotes: 'behavioralNotes',
        surrenderReason: 'surrenderReason',
        intakeDate: 'intakeDate',
        vaccinationStatus: 'vaccinationStatus',
        vaccinationDate: 'vaccinationDate',
        spayNeuterStatus: 'spayNeuterStatus',
        spayNeuterDate: 'spayNeuterDate',
        lastVetCheckup: 'lastVetCheckup',
      };

      const rawData = updateData as Record<string, unknown>;
      const normalizedData: Record<string, unknown> = { ...rawData };

      for (const [snakeKey, camelKey] of Object.entries(snakeToCamelMapping)) {
        if (rawData[snakeKey] !== undefined && rawData[camelKey] === undefined) {
          normalizedData[camelKey] = rawData[snakeKey];
          delete normalizedData[snakeKey];
        }
      }

      // Build update data using camelCase attribute names (Sequelize maps to DB columns via field:)
      const dbUpdateData: Record<string, unknown> = {};
      if (normalizedData.shortDescription !== undefined) {
        dbUpdateData.shortDescription = normalizedData.shortDescription;
      }
      if (normalizedData.longDescription !== undefined) {
        dbUpdateData.longDescription = normalizedData.longDescription;
      }
      if (normalizedData.ageYears !== undefined) {
        dbUpdateData.ageYears = normalizedData.ageYears;
      }
      if (normalizedData.ageMonths !== undefined) {
        dbUpdateData.ageMonths = normalizedData.ageMonths;
      }
      if (normalizedData.ageGroup !== undefined) {
        dbUpdateData.ageGroup = normalizedData.ageGroup;
      }
      if (normalizedData.secondaryBreedId !== undefined) {
        dbUpdateData.secondaryBreedId = normalizedData.secondaryBreedId;
      }
      if (normalizedData.weightKg !== undefined) {
        dbUpdateData.weightKg = normalizedData.weightKg;
      }
      if (normalizedData.microchipId !== undefined) {
        dbUpdateData.microchipId = normalizedData.microchipId;
      }
      if (normalizedData.priorityListing !== undefined) {
        dbUpdateData.priorityListing = normalizedData.priorityListing;
      }
      if (normalizedData.adoptionFeeMinor !== undefined) {
        dbUpdateData.adoptionFeeMinor = normalizedData.adoptionFeeMinor;
      }
      if (normalizedData.adoptionFeeCurrency !== undefined) {
        dbUpdateData.adoptionFeeCurrency = normalizedData.adoptionFeeCurrency;
      }
      if (normalizedData.specialNeeds !== undefined) {
        dbUpdateData.specialNeeds = normalizedData.specialNeeds;
      }
      if (normalizedData.specialNeedsDescription !== undefined) {
        dbUpdateData.specialNeedsDescription = normalizedData.specialNeedsDescription;
      }
      if (normalizedData.houseTrained !== undefined) {
        dbUpdateData.houseTrained = normalizedData.houseTrained;
      }
      if (normalizedData.goodWithChildren !== undefined) {
        dbUpdateData.goodWithChildren = normalizedData.goodWithChildren;
      }
      if (normalizedData.goodWithDogs !== undefined) {
        dbUpdateData.goodWithDogs = normalizedData.goodWithDogs;
      }
      if (normalizedData.goodWithCats !== undefined) {
        dbUpdateData.goodWithCats = normalizedData.goodWithCats;
      }
      if (normalizedData.goodWithSmallAnimals !== undefined) {
        dbUpdateData.goodWithSmallAnimals = normalizedData.goodWithSmallAnimals;
      }
      if (normalizedData.energyLevel !== undefined) {
        dbUpdateData.energyLevel = normalizedData.energyLevel;
      }
      if (normalizedData.exerciseNeeds !== undefined) {
        dbUpdateData.exerciseNeeds = normalizedData.exerciseNeeds;
      }
      if (normalizedData.groomingNeeds !== undefined) {
        dbUpdateData.groomingNeeds = normalizedData.groomingNeeds;
      }
      if (normalizedData.trainingNotes !== undefined) {
        dbUpdateData.trainingNotes = normalizedData.trainingNotes;
      }
      if (normalizedData.medicalNotes !== undefined) {
        dbUpdateData.medicalNotes = normalizedData.medicalNotes;
      }
      if (normalizedData.behavioralNotes !== undefined) {
        dbUpdateData.behavioralNotes = normalizedData.behavioralNotes;
      }
      if (normalizedData.surrenderReason !== undefined) {
        dbUpdateData.surrenderReason = normalizedData.surrenderReason;
      }
      if (normalizedData.intakeDate !== undefined) {
        dbUpdateData.intakeDate = normalizedData.intakeDate;
      }
      if (normalizedData.vaccinationStatus !== undefined) {
        dbUpdateData.vaccinationStatus = normalizedData.vaccinationStatus;
      }
      if (normalizedData.vaccinationDate !== undefined) {
        dbUpdateData.vaccinationDate = normalizedData.vaccinationDate;
      }
      if (normalizedData.spayNeuterStatus !== undefined) {
        dbUpdateData.spayNeuterStatus = normalizedData.spayNeuterStatus;
      }
      if (normalizedData.spayNeuterDate !== undefined) {
        dbUpdateData.spayNeuterDate = normalizedData.spayNeuterDate;
      }
      if (normalizedData.lastVetCheckup !== undefined) {
        dbUpdateData.lastVetCheckup = normalizedData.lastVetCheckup;
      }

      // Handle simple field mappings (fields where attribute name matches key)
      const simpleFields = [
        'name',
        'gender',
        'status',
        'breedId',
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

      // Update side-effect columns directly; the status itself is owned by
      // the transition log + trigger / hook (see PetStatusTransition).
      const sideEffects: Record<string, unknown> = {};
      if (statusUpdate.effectiveDate) {
        sideEffects.availableSince = statusUpdate.effectiveDate;
      }
      if (statusUpdate.status === PetStatus.ADOPTED) {
        sideEffects.adoptedDate = new Date();
      }
      if (statusUpdate.status === PetStatus.FOSTER) {
        sideEffects.fosterStartDate = new Date();
      }
      if (Object.keys(sideEffects).length > 0) {
        await pet.update(sideEffects);
      }

      // Append the transition; the AFTER INSERT trigger (Postgres) /
      // afterCreate hook (SQLite) propagates to_status onto pets.status.
      await PetStatusTransition.create({
        petId,
        fromStatus: originalStatus,
        toStatus: statusUpdate.status,
        transitionedBy: updatedBy,
        reason: statusUpdate.reason || null,
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

      // Existing image count drives the default order_index for the
      // appended rows so they fall after the current gallery (plan 2.1).
      const existingCount = await PetMedia.count({
        where: { pet_id: petId, type: PetMediaType.IMAGE },
      });

      const created = await PetMedia.bulkCreate(
        images.map((img, index) => ({
          pet_id: petId,
          type: PetMediaType.IMAGE,
          url: img.url,
          thumbnail_url: img.thumbnailUrl ?? null,
          caption: img.caption ?? null,
          is_primary: img.isPrimary || false,
          order_index: img.orderIndex ?? existingCount + index,
          duration_seconds: null,
          uploaded_at: new Date(),
        }))
      );

      // Log image addition
      await AuditLogService.log({
        action: 'ADD_IMAGES',
        entity: 'Pet',
        entityId: petId,
        details: {
          addedImages: created.map(m => JSON.parse(JSON.stringify(m.toJSON()))),
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

      // Replace all images: delete-then-insert inside a transaction so a
      // failed bulkCreate doesn't leave the pet with no media.
      const created = await sequelize.transaction(async tx => {
        await PetMedia.destroy({
          where: { pet_id: petId, type: PetMediaType.IMAGE },
          transaction: tx,
        });
        return PetMedia.bulkCreate(
          images.map((img, index) => ({
            pet_id: petId,
            type: PetMediaType.IMAGE,
            url: img.url,
            thumbnail_url: img.thumbnailUrl ?? null,
            caption: img.caption ?? null,
            is_primary: img.isPrimary || false,
            order_index: img.orderIndex ?? index,
            duration_seconds: null,
            uploaded_at: new Date(),
          })),
          { transaction: tx }
        );
      });

      // Log image update
      await AuditLogService.log({
        action: 'UPDATE_IMAGES',
        entity: 'Pet',
        entityId: petId,
        details: {
          newImages: created.map(m => JSON.parse(JSON.stringify(m.toJSON()))),
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

      const deleted = await PetMedia.destroy({
        where: { media_id: imageId, pet_id: petId, type: PetMediaType.IMAGE },
      });

      if (deleted === 0) {
        throw new Error('Image not found');
      }

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
        where: { rescueId, archived: false },
        order: [
          ['featured', 'DESC'],
          ['priorityListing', 'DESC'],
          ['createdAt', 'DESC'],
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
          ['priorityListing', 'DESC'],
          ['createdAt', 'DESC'],
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
      const whereClause = rescueId ? { rescueId } : {};

      // Get basic counts
      const [totalPets, availablePets, adoptedPets, fosterPets, featuredPets, specialNeedsPets] =
        await Promise.all([
          Pet.count({ where: whereClause }),
          Pet.count({ where: { ...whereClause, status: PetStatus.AVAILABLE } }),
          Pet.count({ where: { ...whereClause, status: PetStatus.ADOPTED } }),
          Pet.count({ where: { ...whereClause, status: PetStatus.FOSTER } }),
          Pet.count({ where: { ...whereClause, featured: true } }),
          Pet.count({ where: { ...whereClause, specialNeeds: true } }),
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
        (new Date().getTime() - pet.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate average views per day
      const averageViewsPerDay = daysSincePosted > 0 ? pet.viewCount / daysSincePosted : 0;

      logger.info('Pet activity retrieved successfully', { petId });

      return {
        petId,
        viewCount: pet.viewCount,
        favoriteCount: pet.favoriteCount,
        applicationCount: pet.applicationCount,
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
              await Pet.update({ archived: true }, { where: { petId } });
              break;
            case 'feature':
              if (data && typeof data.featured === 'boolean') {
                await Pet.update({ featured: data.featured }, { where: { petId } });
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
    const whereClause = rescueId ? { rescueId } : {};
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
    const whereClause = rescueId ? { rescueId } : {};
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
    const whereClause = rescueId ? { rescueId } : {};
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
    const whereClause = rescueId ? { rescueId } : {};
    const results = await Pet.findAll({
      where: whereClause,
      attributes: ['ageGroup', [fn('COUNT', col('pet_id')), 'count']],
      group: ['ageGroup'],
      raw: true,
    });

    const counts: Record<AgeGroup, number> = {} as Record<AgeGroup, number>;
    Object.values(AgeGroup).forEach(ageGroup => {
      counts[ageGroup] = 0;
    });

    (results as unknown as Array<{ ageGroup: AgeGroup; count: string }>).forEach(result => {
      counts[result.ageGroup] = parseInt(result.count);
    });

    return counts;
  }

  private static async getAverageAdoptionTime(rescueId?: string): Promise<number> {
    try {
      const whereClause = rescueId
        ? { rescueId, status: PetStatus.ADOPTED }
        : { status: PetStatus.ADOPTED };

      // Database-agnostic date difference calculation
      // SQLite: julianday() returns days
      // PostgreSQL: EXTRACT(epoch FROM ...) / 86400 returns days
      const dialect = sequelize.getDialect();
      const dateDiffExpression =
        dialect === 'sqlite'
          ? literal('julianday(adoptedDate) - julianday(availableSince)')
          : literal('EXTRACT(epoch FROM (adoptedDate - availableSince)) / 86400');

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
      sortBy?: 'createdAt' | 'name' | 'age' | 'adoptionFeeMinor';
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
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = filters;

      const safeSortBy = validateSortField(sortBy, PET_RESCUE_LIST_SORT_FIELDS, 'createdAt');

      // Build where clause
      const whereClause: WhereOptions = {};

      if (rescueId) {
        whereClause.rescueId = rescueId;
      }
      if (type) {
        whereClause.type = type;
      }
      if (status) {
        whereClause.status = status;
      }
      // Plan 2.4 — resolve free-form breed name to FK ids before filtering.
      if (breed) {
        const breedIds = await resolveBreedIdsByName(breed);
        if (breedIds.length === 0) {
          whereClause.breedId = '__never_matches__';
        } else {
          (whereClause as Record<symbol, unknown>)[Op.or] = [
            { breedId: { [Op.in]: breedIds } },
            { secondaryBreedId: { [Op.in]: breedIds } },
          ];
        }
      }
      if (size) {
        whereClause.size = size;
      }
      if (gender) {
        whereClause.gender = gender;
      }
      if (goodWithKids !== undefined) {
        whereClause.goodWithChildren = goodWithKids;
      }
      if (goodWithPets !== undefined) {
        (whereClause as Record<symbol, unknown>)[Op.or] = [
          { goodWithDogs: goodWithPets },
          { goodWithCats: goodWithPets },
        ];
      }
      if (energyLevel) {
        whereClause.energyLevel = energyLevel;
      }
      if (location) {
        whereClause.location = { [getLikeOp()]: `%${location}%` };
      }

      // Numeric range filters. Filter values arrive in major units; the
      // column is in minor units (pence/cents) so multiply by 100.
      if (adoptionFeeMin !== undefined || adoptionFeeMax !== undefined) {
        const feeFilter: SequelizeOperatorFilter = {};
        if (adoptionFeeMin !== undefined) {
          feeFilter[Op.gte] = Math.round(adoptionFeeMin * 100);
        }
        if (adoptionFeeMax !== undefined) {
          feeFilter[Op.lte] = Math.round(adoptionFeeMax * 100);
        }
        whereClause.adoptionFeeMinor = feeFilter;
      }

      if (weightMin !== undefined || weightMax !== undefined) {
        const weightFilter: SequelizeOperatorFilter = {};
        if (weightMin !== undefined) {
          weightFilter[Op.gte] = weightMin;
        }
        if (weightMax !== undefined) {
          weightFilter[Op.lte] = weightMax;
        }
        whereClause.weightKg = weightFilter;
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
        whereClause.createdAt = dateFilter;
      }

      // Search functionality. Plan 2.4 — breed names live in the
      // breeds lookup table, so the OR resolves the search term to
      // breed_ids and adds an FK IN-list term.
      if (search) {
        const searchBreedIds = await resolveBreedIdsByName(search);
        const searchOr: WhereOptions[] = [
          { name: { [getLikeOp()]: `%${search}%` } },
          { shortDescription: { [getLikeOp()]: `%${search}%` } },
          { longDescription: { [getLikeOp()]: `%${search}%` } },
        ];
        if (searchBreedIds.length > 0) {
          searchOr.push({ breedId: { [Op.in]: searchBreedIds } });
          searchOr.push({ secondaryBreedId: { [Op.in]: searchBreedIds } });
        }
        (whereClause as Record<symbol, unknown>)[Op.or] = searchOr;
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
        order: [[safeSortBy, sortOrder]],
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
        where: { userId, petId },
        paranoid: false, // Include soft-deleted records
      });

      if (existingFavorite && !existingFavorite.deletedAt) {
        // Already favorited and not soft-deleted
        throw new Error('Pet is already in favorites');
      }

      if (existingFavorite && existingFavorite.deletedAt) {
        // Restore soft-deleted favorite
        await existingFavorite.restore();
        logger.info(`Pet ${petId} favorite restored for user ${userId}`);
      } else {
        // Create new favorite
        await UserFavorite.create({
          userId,
          petId,
          createdAt: new Date(),
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
        where: { userId, petId },
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
        where: { userId },
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
        order: [['createdAt', 'DESC']],
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
        where: { userId, petId },
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
        order: [['createdAt', 'DESC']],
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
   * Get pet breeds by type. Plan 2.4 — reads from the breeds lookup
   * table directly instead of `SELECT DISTINCT breed FROM pets` so the
   * catalogue isn't gated on a pet of that breed currently existing.
   */
  static async getPetBreedsByType(type: string): Promise<string[]> {
    try {
      const validType = type.toLowerCase();

      // Validate pet type
      if (!Object.values(PetType).includes(validType as PetType)) {
        throw new Error(`Invalid pet type: ${type}`);
      }

      const breeds = await Breed.findAll({
        where: { species: validType as PetType },
        attributes: ['name'],
        order: [['name', 'ASC']],
      });

      const breedNames = breeds
        .map(b => b.name)
        .filter((name): name is string => name !== null && name.trim() !== '');

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

      // Plan 2.4 — breed is an FK; "same breed" is now an FK
      // comparison (simpler and faster than the old string match).
      const similarPets = await Pet.findAll({
        where: {
          petId: { [Op.ne]: petId }, // Exclude the reference pet
          status: PetStatus.AVAILABLE,
          archived: false,
          [Op.or]: [
            { breedId: referencePet.breedId }, // Same breed (highest priority)
            { type: referencePet.type }, // Same type
            { size: referencePet.size }, // Same size
            { ageGroup: referencePet.ageGroup }, // Same age group
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
          // Prioritize exact breed matches first (FK comparison)
          [
            sequelize.literal(
              `CASE WHEN breed_id = ${sequelize.escape(referencePet.breedId ?? '')} THEN 0 ELSE 1 END`
            ),
            'ASC',
          ],
          // Then by type matches
          [
            sequelize.literal(
              `CASE WHEN type = ${sequelize.escape(referencePet.type ?? '')} THEN 0 ELSE 1 END`
            ),
            'ASC',
          ],
          // Finally by creation date (newest first)
          ['createdAt', 'DESC'],
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

      // Create the report. Evidence (if any) lives in moderation_evidence
      // (plan 2.1) — the pet-flag flow currently doesn't attach any.
      const report = await Report.create({
        reportedEntityType: 'pet',
        reportedEntityId: petId,
        reporterId: reportedBy,
        category: ReportCategory.INAPPROPRIATE_CONTENT, // Default category for pet reports
        title: reason,
        description: description || 'No description provided',
        status: ReportStatus.PENDING,
        severity: ReportSeverity.MEDIUM, // Default severity
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
