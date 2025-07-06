import { Op, fn, literal } from 'sequelize';
import Pet, { AgeGroup, Gender, PetStatus, PetType, Size } from '../models/Pet';
import Rescue from '../models/Rescue';
import { logger } from '../utils/logger';

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
   * Get discovery queue with smart sorting algorithm
   */
  async getDiscoveryQueue(
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
        nextCursor: pets.length > 0 ? pets[pets.length - 1].pet_id : undefined,
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

      // Get pets after the last pet ID
      const pets = await Pet.findAll({
        where: {
          pet_id: {
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
      if (filters.breed) {
        whereConditions.breed = {
          [Op.iLike]: `%${filters.breed}%`,
        };
      }
      if (filters.ageGroup) {
        whereConditions.age_group = filters.ageGroup;
      }
      if (filters.size) {
        whereConditions.size = filters.size;
      }
      if (filters.gender) {
        whereConditions.gender = filters.gender;
      }

      // Smart sorting query with multiple factors
      const pets = await Pet.findAll({
        where: whereConditions,
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['rescue_id', 'name', 'status'],
          },
        ],
        order: [
          // 1. Prioritize verified rescues
          literal(`CASE WHEN "Rescue"."status" = 'verified' THEN 0 ELSE 1 END`),

          // 2. Prioritize recently added pets (within last 7 days)
          literal(`CASE WHEN "Pet"."created_at" > NOW() - INTERVAL '7 days' THEN 0 ELSE 1 END`),

          // 3. Prioritize pets with good photos (more than 2 images)
          literal(`CASE WHEN jsonb_array_length("Pet"."images") > 2 THEN 0 ELSE 1 END`),

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

    // Remove pets with no images
    const filtered = pets.filter(pet => pet.images && pet.images.length > 0);

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
      const breed = pet.breed || 'unknown';
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
      // Type assertion to access included rescue data
      const petWithRescue = pet as Pet & {
        Rescue?: {
          name: string;
          status: 'pending' | 'verified' | 'suspended' | 'inactive';
        };
      };

      // Ensure petId is never undefined
      const petId = pet.pet_id || `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get image URLs - only return valid URLs, let frontend handle placeholders
      let imageUrls: string[] = [];
      if (pet.images && Array.isArray(pet.images) && pet.images.length > 0) {
        imageUrls = pet.images
          .map(img => img.url)
          .filter(url => url && !url.includes('placeholder') && !url.includes('via.placeholder'));
      }

      return {
        petId,
        name: pet.name || 'Unknown',
        type: pet.type,
        breed: pet.breed || undefined,
        ageGroup: pet.age_group,
        ageYears: pet.age_years || undefined,
        ageMonths: pet.age_months || undefined,
        size: pet.size,
        gender: pet.gender,
        images: imageUrls,
        shortDescription: pet.short_description || undefined,
        rescueName: petWithRescue.Rescue?.name || 'Unknown Rescue',
        isSponsored: petWithRescue.Rescue?.status === 'verified' || false,
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
    if (pet.images && pet.images.length >= 3) {
      score += 15;
    }

    // Boost for detailed description
    if (pet.long_description && pet.long_description.length > 100) {
      score += 10;
    }

    // Boost for young pets
    if (pet.age_group === AgeGroup.BABY || pet.age_group === AgeGroup.YOUNG) {
      score += 10;
    }

    // Boost for special attributes
    if (pet.good_with_children) {
      score += 5;
    }
    if (pet.good_with_dogs) {
      score += 5;
    }
    if (pet.good_with_cats) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
