import { randomBytes } from 'crypto';
import { Op, fn, literal } from 'sequelize';
import { cached } from '../cache/redis-cache';
import Breed from '../models/Breed';
import Pet, { AgeGroup, Gender, PetStatus, PetType, Size } from '../models/Pet';
import PetMedia, { PetMediaType } from '../models/PetMedia';
import Rescue from '../models/Rescue';
import sequelize from '../sequelize';
import { logger } from '../utils/logger';

// Pet.images / Pet.videos are no longer JSONB on the pet row (plan
// 2.1) — they're rows in pet_media. Inside discovery we only ever look
// at images, so we narrow the typed Pet to the shape we project below.
// Plan 2.4 also added the Breed association (eager-loaded for the
// breed-name read paths).
type PetWithMedia = Pet & { Media?: PetMedia[]; Breed?: Breed | null };

const getImages = (pet: PetWithMedia): PetMedia[] =>
  (pet.Media ?? []).filter(m => m.type === PetMediaType.IMAGE);

export interface DiscoveryFilters {
  type?: string;
  breed?: string;
  ageGroup?: string;
  size?: string;
  gender?: string;
  maxDistance?: number;
}

export interface DiscoveryPet {
  petId: string;
  name: string;
  type: PetType;
  breed?: string;
  ageGroup: AgeGroup;
  ageYears?: number;
  ageMonths?: number;
  size: Size;
  gender: Gender;
  images: string[];
  shortDescription?: string;
  distance?: number;
  rescueName: string;
  isSponsored?: boolean;
  compatibilityScore?: number;
}

export interface DiscoveryQueue {
  pets: DiscoveryPet[];
  sessionId: string;
  hasMore: boolean;
  nextCursor?: string;
}

export class DiscoveryService {
  /**
   * Get discovery queue with smart sorting algorithm.
   *
   * ADS-479: cached for 60s. The discovery feed is the hottest read
   * path on the swipe UI; without caching, every drag triggers a full
   * smart-sort recompute. Pet writes invalidate the `discovery:queue`
   * namespace via `pet.service.ts`.
   *
   * Note: `sessionId` is per-request (random) and intentionally
   * excluded from the cache key — only filter/limit/user matters
   * for the actual pet shortlist.
   */
  async getDiscoveryQueue(
    filters: DiscoveryFilters,
    limit: number = 20,
    userId?: string
  ): Promise<DiscoveryQueue> {
    return cached(
      {
        namespace: 'discovery:queue',
        args: { filters, limit, userId: userId ?? null },
        ttlSeconds: 60,
      },
      () => this.getDiscoveryQueueUncached(filters, limit, userId)
    );
  }

  private async getDiscoveryQueueUncached(
    filters: DiscoveryFilters,
    limit: number = 20,
    userId?: string
  ): Promise<DiscoveryQueue> {
    try {
      logger.info('Generating discovery queue', { filters, limit, userId });

      // Generate a session ID for tracking
      const sessionId = this.generateSessionId();

      // Get pets with smart filtering and sorting
      const pets = await this.getSmartSortedPets(filters, limit, userId);

      // Transform to discovery format
      const discoveryPets = await this.transformToDiscoveryPets(pets);

      return {
        pets: discoveryPets,
        sessionId,
        hasMore: pets.length === limit,
        nextCursor: pets.length > 0 ? pets[pets.length - 1].petId : undefined,
      };
    } catch (error) {
      logger.error('Error generating discovery queue', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : '',
        errorName: error instanceof Error ? error.name : '',
        filters,
        userId,
      });
      throw new Error('Failed to generate discovery queue');
    }
  }

  /**
   * Load more pets for infinite scroll
   */
  async loadMorePets(
    sessionId: string,
    lastPetId: string,
    limit: number = 10
  ): Promise<DiscoveryPet[]> {
    try {
      logger.info('Loading more pets', { sessionId, lastPetId, limit });

      // Get pets after the last pet ID. Eager-load Breed so the
      // discovery transform can read the human-readable breed name
      // from the lookup table (plan 2.4).
      const pets = await Pet.findAll({
        where: {
          petId: {
            [Op.gt]: lastPetId,
          },
          status: PetStatus.AVAILABLE,
        },
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['rescue_id', 'name', 'status'],
          },
          {
            model: PetMedia,
            as: 'Media',
            where: { type: PetMediaType.IMAGE },
            required: false,
          },
          {
            model: Breed,
            as: 'Breed',
            attributes: ['breed_id', 'name'],
            required: false,
          },
        ],
        limit,
        order: [['created_at', 'ASC']],
      });

      return await this.transformToDiscoveryPets(pets);
    } catch (error) {
      logger.error('Error loading more pets', { error, sessionId, lastPetId });
      throw new Error('Failed to load more pets');
    }
  }

  /**
   * Smart sorting algorithm that considers multiple factors
   */
  private async getSmartSortedPets(
    filters: DiscoveryFilters,
    limit: number,
    userId?: string
  ): Promise<Pet[]> {
    try {
      // Build where conditions based on filters
      const whereConditions: Record<string, unknown> = {
        status: PetStatus.AVAILABLE,
      };

      if (filters.type) {
        whereConditions.type = filters.type;
      }
      // Plan 2.4 — breed is an FK; resolve free-form name to ids and
      // filter on the FK columns instead of a string LIKE on the pet row.
      if (filters.breed) {
        const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
        const breedRows = await Breed.findAll({
          where: { name: { [likeOp]: `%${filters.breed}%` } },
          attributes: ['breed_id'],
        });
        const breedIds = breedRows.map(b => b.breed_id);
        if (breedIds.length === 0) {
          whereConditions.breedId = '__never_matches__';
        } else {
          (whereConditions as Record<symbol, unknown>)[Op.or] = [
            { breedId: { [Op.in]: breedIds } },
            { secondaryBreedId: { [Op.in]: breedIds } },
          ];
        }
      }
      if (filters.ageGroup) {
        whereConditions.ageGroup = filters.ageGroup;
      }
      if (filters.size) {
        whereConditions.size = filters.size;
      }
      if (filters.gender) {
        whereConditions.gender = filters.gender;
      }

      // Smart sorting query with multiple factors. Eager-load Breed
      // so downstream transforms / dedup keys can read the canonical
      // breed name (plan 2.4).
      const pets = await Pet.findAll({
        where: whereConditions,
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['rescue_id', 'name', 'status'],
          },
          {
            model: PetMedia,
            as: 'Media',
            where: { type: PetMediaType.IMAGE },
            required: false,
          },
          {
            model: Breed,
            as: 'Breed',
            attributes: ['breed_id', 'name'],
            required: false,
          },
        ],
        order: [
          // 1. Prioritize verified rescues
          literal(`CASE WHEN "Rescue"."status" = 'verified' THEN 0 ELSE 1 END`),

          // 2. Prioritize recently added pets (within last 7 days)
          literal(`CASE WHEN "Pet"."created_at" > NOW() - INTERVAL '7 days' THEN 0 ELSE 1 END`),

          // 3. Prioritize pets with good photos (more than 2 images).
          // Counts the eager-loaded pet_media rows that are images —
          // replaces the old jsonb_array_length on Pet.images (plan 2.1).
          literal(
            `CASE WHEN (SELECT COUNT(*) FROM pet_media WHERE pet_media.pet_id = "Pet"."pet_id" AND pet_media.type = 'image') > 2 THEN 0 ELSE 1 END`
          ),

          // 4. Boost puppies and kittens (young pets are popular)
          literal(`CASE WHEN "Pet"."age_group" IN ('baby', 'young') THEN 0 ELSE 1 END`),

          // 5. Random factor for diversity
          fn('RANDOM'),
        ],
        limit: limit * 2, // Get more than needed for filtering
      });

      // Apply additional smart filtering
      const smartFiltered = this.applySmartFiltering(pets, userId);

      return smartFiltered.slice(0, limit);
    } catch (error) {
      logger.error('Error in getSmartSortedPets', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : '',
        errorName: error instanceof Error ? error.name : '',
        filters,
        userId,
      });
      throw error;
    }
  }

  /**
   * Apply smart filtering based on user preferences and behavior
   */
  private applySmartFiltering(pets: Pet[], _userId?: string): Pet[] {
    // For now, implement basic filtering
    // TODO: Implement ML-based filtering based on user behavior

    // Remove pets with no images. Media is eager-loaded via PetMedia
    // (plan 2.1).
    const filtered = pets.filter(pet => getImages(pet).length > 0);

    // Implement diversity - don't show too many of the same breed in a row
    const diversified = this.diversifyBreeds(filtered);

    return diversified;
  }

  /**
   * Diversify breeds to avoid showing too many of the same breed consecutively
   */
  private diversifyBreeds(pets: Pet[]): Pet[] {
    const result: Pet[] = [];
    const recentBreeds: string[] = [];
    const maxSameBreed = 2;

    for (const pet of pets) {
      // Plan 2.4 — dedupe on the breed FK so equal-breed pets are
      // treated as same regardless of the human name resolution path.
      const breed = pet.breedId || 'unknown';
      const recentBreedCount = recentBreeds.filter(b => b === breed).length;

      if (recentBreedCount < maxSameBreed) {
        result.push(pet);
        recentBreeds.push(breed);

        // Keep only last 5 breeds for checking
        if (recentBreeds.length > 5) {
          recentBreeds.shift();
        }
      }
    }

    // Add remaining pets if we haven't reached the limit
    for (const pet of pets) {
      if (!result.includes(pet)) {
        result.push(pet);
      }
    }

    return result;
  }

  /**
   * Transform Pet models to DiscoveryPet format
   */
  private async transformToDiscoveryPets(pets: Pet[]): Promise<DiscoveryPet[]> {
    return pets.map(pet => {
      // Type assertion to access included rescue / breed data
      const petWithIncludes = pet as Pet & {
        Rescue?: {
          name: string;
          status: 'pending' | 'verified' | 'suspended' | 'inactive' | 'rejected';
        };
        Breed?: { name: string } | null;
      };

      // Ensure petId is never undefined
      const petId = pet.petId || `pet_${Date.now()}_${randomBytes(5).toString('hex')}`;

      // Get image URLs - only return valid URLs, let frontend handle placeholders.
      // Sort by order_index so the gallery surfaces images in the rescue's
      // intended order (the eager-load doesn't impose ordering by default).
      const images = [...getImages(pet)].sort((a, b) => a.order_index - b.order_index);
      const imageUrls = images
        .map(img => img.url)
        .filter(url => url && !url.includes('placeholder') && !url.includes('via.placeholder'));

      return {
        petId,
        name: pet.name || 'Unknown',
        type: pet.type,
        // Plan 2.4 — breed name comes from the eager-loaded Breed row.
        breed: petWithIncludes.Breed?.name || undefined,
        ageGroup: pet.ageGroup,
        ageYears: pet.ageYears || undefined,
        ageMonths: pet.ageMonths || undefined,
        size: pet.size,
        gender: pet.gender,
        images: imageUrls,
        shortDescription: pet.shortDescription || undefined,
        rescueName: petWithIncludes.Rescue?.name || 'Unknown Rescue',
        isSponsored: petWithIncludes.Rescue?.status === 'verified' || false,
        compatibilityScore: this.calculateCompatibilityScore(pet),
      };
    });
  }

  /**
   * Calculate a compatibility score for the pet (0-100)
   */
  private calculateCompatibilityScore(pet: Pet): number {
    let score = 50; // Base score

    // Boost for good photos
    if (getImages(pet).length >= 3) {
      score += 15;
    }

    // Boost for detailed description
    if (pet.longDescription && pet.longDescription.length > 100) {
      score += 10;
    }

    // Boost for young pets
    if (pet.ageGroup === AgeGroup.BABY || pet.ageGroup === AgeGroup.YOUNG) {
      score += 10;
    }

    // Boost for special attributes
    if (pet.goodWithChildren) {
      score += 5;
    }
    if (pet.goodWithDogs) {
      score += 5;
    }
    if (pet.goodWithCats) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${randomBytes(5).toString('hex')}`;
  }
}
