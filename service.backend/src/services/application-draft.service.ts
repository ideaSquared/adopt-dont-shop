import { Op } from 'sequelize';
import ApplicationDraft, { DraftStatus } from '../models/ApplicationDraft';
import Pet from '../models/Pet';
import { JsonObject } from '../types/common';
import { logger } from '../utils/logger';
import { ApplicationProfileService } from './application-profile.service';

/**
 * Phase 1 - Application Draft Service
 * Enhanced draft management with auto-save and cross-device sync capabilities.
 * Provides functionality to save, restore, and manage application drafts with
 * automatic expiration and progress tracking.
 */

/**
 * Interface for saving draft application data
 */
export interface DraftSaveRequest {
  /** Pet ID that the application is for */
  petId: string;
  /** Current step number in the application process */
  stepNumber: number;
  /** Total number of steps in the application */
  totalSteps: number;
  /** Application data for the current step */
  stepData: JsonObject;
  /** Optional device information for tracking */
  deviceInfo?: JsonObject;
}

/**
 * Interface for draft recovery information
 */
export interface DraftRecoveryInfo {
  /** Whether a draft exists for the user/pet combination */
  hasDraft: boolean;
  /** Unique draft identifier */
  draftId?: string;
  /** Last saved step number */
  lastSavedStep?: number;
  /** Completion percentage (0-100) */
  completionPercentage?: number;
  /** When the draft was last accessed */
  lastAccessedAt?: Date;
  /** Whether the draft can be restored (not expired) */
  canRestore: boolean;
}

export class ApplicationDraftService {
  /**
   * Auto-save draft data with merging and progress tracking
   * @param userId - The unique identifier of the user
   * @param request - Draft save request containing step data and metadata
   * @returns Promise resolving to the saved/updated application draft
   * @throws Error if save operation fails
   * @example
   * ```typescript
   * const draft = await ApplicationDraftService.saveDraft('user_123', {
   *   petId: 'pet_456',
   *   stepNumber: 2,
   *   totalSteps: 5,
   *   stepData: { livingSituation: { housingType: 'house' } }
   * });
   * console.log(draft.completionPercentage); // 40
   * ```
   */
  static async saveDraft(userId: string, request: DraftSaveRequest): Promise<ApplicationDraft> {
    try {
      // Find or create draft
      let draft = await ApplicationDraft.findOne({
        where: {
          userId,
          petId: request.petId,
          status: DraftStatus.ACTIVE,
        },
      });

      // Get rescue ID for the pet
      const pet = await Pet.findOne({
        where: { pet_id: request.petId },
        attributes: ['rescue_id'],
      });

      if (!pet) {
        throw new Error(`Pet with ID ${request.petId} not found`);
      }

      const rescueId = pet.rescue_id;

      const completionPercentage = Math.round((request.stepNumber / request.totalSteps) * 100);

      if (!draft) {
        // Create new draft - expiresAt is set by default in model
        draft = await ApplicationDraft.create({
          userId,
          petId: request.petId,
          rescueId,
          draftData: request.stepData,
          lastSavedStep: request.stepNumber,
          totalSteps: request.totalSteps,
          completionPercentage,
          deviceInfo: request.deviceInfo,
          lastAccessedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        });
      } else {
        // Update existing draft
        const mergedData = { ...draft.draftData, ...request.stepData };

        await draft.update({
          draftData: mergedData,
          lastSavedStep: Math.max(draft.lastSavedStep, request.stepNumber),
          totalSteps: request.totalSteps,
          completionPercentage,
          deviceInfo: request.deviceInfo || draft.deviceInfo,
          lastAccessedAt: new Date(),
        });
      }

      logger.info('Draft saved successfully', {
        userId,
        petId: request.petId,
        step: request.stepNumber,
      });
      return draft;
    } catch (error) {
      logger.error('Error saving draft:', error);
      throw error;
    }
  }

  /**
   * Get active draft for a specific user and pet, with automatic expiration handling
   * @param userId - The unique identifier of the user
   * @param petId - The unique identifier of the pet
   * @returns Promise resolving to the active draft or null if not found/expired
   * @throws Error if retrieval operation fails
   * @example
   * ```typescript
   * const draft = await ApplicationDraftService.getDraft('user_123', 'pet_456');
   * if (draft) {
   *   console.log(`Draft completion: ${draft.completionPercentage}%`);
   *   console.log(`Last step: ${draft.lastSavedStep}`);
   * }
   * ```
   */
  static async getDraft(userId: string, petId: string): Promise<ApplicationDraft | null> {
    try {
      const draft = await ApplicationDraft.findOne({
        where: {
          userId,
          petId,
          status: DraftStatus.ACTIVE,
        },
      });

      if (draft && draft.isExpired()) {
        await draft.update({ status: DraftStatus.EXPIRED });
        return null;
      }

      if (draft) {
        await draft.updateLastAccessed();
      }

      return draft;
    } catch (error) {
      logger.error('Error getting draft:', error);
      throw error;
    }
  }

  /**
   * Get all drafts for user
   */
  static async getUserDrafts(userId: string): Promise<ApplicationDraft[]> {
    try {
      const drafts = await ApplicationDraft.findAll({
        where: {
          userId,
          status: DraftStatus.ACTIVE,
          expiresAt: {
            [Op.gt]: new Date(),
          },
        },
        order: [['lastAccessedAt', 'DESC']],
      });

      return drafts;
    } catch (error) {
      logger.error('Error getting user drafts:', error);
      throw error;
    }
  }

  /**
   * Delete draft
   */
  static async deleteDraft(userId: string, draftId: string): Promise<void> {
    try {
      const draft = await ApplicationDraft.findOne({
        where: {
          draftId,
          userId,
        },
      });

      if (!draft) {
        throw new Error('Draft not found');
      }

      await draft.destroy();
      logger.info('Draft deleted successfully', { userId, draftId });
    } catch (error) {
      logger.error('Error deleting draft:', error);
      throw error;
    }
  }

  /**
   * Mark draft as completed (when application is submitted)
   */
  static async completeDraft(userId: string, petId: string): Promise<void> {
    try {
      await ApplicationDraft.update(
        { status: DraftStatus.COMPLETED },
        {
          where: {
            userId,
            petId,
            status: DraftStatus.ACTIVE,
          },
        }
      );

      logger.info('Draft marked as completed', { userId, petId });
    } catch (error) {
      logger.error('Error completing draft:', error);
      throw error;
    }
  }

  /**
   * Get draft recovery information
   */
  static async getDraftRecoveryInfo(userId: string, petId: string): Promise<DraftRecoveryInfo> {
    try {
      const draft = await this.getDraft(userId, petId);

      if (!draft) {
        return {
          hasDraft: false,
          canRestore: false,
        };
      }

      return {
        hasDraft: true,
        draftId: draft.draftId,
        lastSavedStep: draft.lastSavedStep,
        completionPercentage: draft.completionPercentage,
        lastAccessedAt: draft.lastAccessedAt,
        canRestore: !draft.isExpired(),
      };
    } catch (error) {
      logger.error('Error getting draft recovery info:', error);
      throw error;
    }
  }

  /**
   * Restore draft with pre-population
   */
  static async restoreDraftWithPrePopulation(userId: string, petId: string): Promise<JsonObject> {
    try {
      const draft = await this.getDraft(userId, petId);

      if (!draft) {
        // No draft exists, get pre-population data from profile
        const prePopulationData = await ApplicationProfileService.getPrePopulationData(
          userId,
          petId
        );
        return {
          personalInfo: prePopulationData.personalInfo || null,
          livingSituation: prePopulationData.livingSituation || null,
          petExperience: prePopulationData.petExperience || null,
          references: prePopulationData.references || null,
          source: 'profile_defaults',
        };
      }

      // Merge draft data with profile defaults for any missing fields
      const prePopulationData = await ApplicationProfileService.getPrePopulationData(userId, petId);
      const mergedData = {
        personalInfo: {
          ...(prePopulationData.personalInfo || {}),
          ...((draft.draftData.personalInfo as object) || {}),
        },
        livingSituation: {
          ...(prePopulationData.livingSituation || {}),
          ...((draft.draftData.livingSituation as object) || {}),
        },
        petExperience: {
          ...(prePopulationData.petExperience || {}),
          ...((draft.draftData.petExperience as object) || {}),
        },
        references: {
          ...(prePopulationData.references || {}),
          ...((draft.draftData.references as object) || {}),
        },
        additionalInfo: draft.draftData.additionalInfo,
        source: 'draft_with_defaults',
        lastSavedStep: draft.lastSavedStep,
      };

      return mergedData;
    } catch (error) {
      logger.error('Error restoring draft with pre-population:', error);
      throw error;
    }
  }

  /**
   * Clean up expired drafts (to be run as a scheduled job)
   */
  static async cleanupExpiredDrafts(): Promise<number> {
    try {
      const result = await ApplicationDraft.update(
        { status: DraftStatus.EXPIRED },
        {
          where: {
            status: DraftStatus.ACTIVE,
            expiresAt: {
              [Op.lt]: new Date(),
            },
          },
        }
      );

      logger.info('Expired drafts cleaned up', { count: result[0] });
      return result[0];
    } catch (error) {
      logger.error('Error cleaning up expired drafts:', error);
      throw error;
    }
  }

  /**
   * Get draft statistics for user
   */
  static async getDraftStatistics(userId: string): Promise<{
    totalDrafts: number;
    activeDrafts: number;
    completedDrafts: number;
    expiredDrafts: number;
    averageCompletionPercentage: number;
  }> {
    try {
      const [totalDrafts, activeDrafts, completedDrafts, expiredDrafts] = await Promise.all([
        ApplicationDraft.count({ where: { userId } }),
        ApplicationDraft.count({ where: { userId, status: DraftStatus.ACTIVE } }),
        ApplicationDraft.count({ where: { userId, status: DraftStatus.COMPLETED } }),
        ApplicationDraft.count({ where: { userId, status: DraftStatus.EXPIRED } }),
      ]);

      // Get average completion percentage for active drafts
      const activeDraftData = await ApplicationDraft.findAll({
        where: { userId, status: DraftStatus.ACTIVE },
        attributes: ['completionPercentage'],
      });

      const averageCompletionPercentage =
        activeDraftData.length > 0
          ? Math.round(
              activeDraftData.reduce((sum, draft) => sum + draft.completionPercentage, 0) /
                activeDraftData.length
            )
          : 0;

      return {
        totalDrafts,
        activeDrafts,
        completedDrafts,
        expiredDrafts,
        averageCompletionPercentage,
      };
    } catch (error) {
      logger.error('Error getting draft statistics:', error);
      throw error;
    }
  }
}
