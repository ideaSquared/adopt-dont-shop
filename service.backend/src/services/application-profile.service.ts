import User from '../models/User';
import {
  ApplicationDefaults,
  ApplicationPreferences,
  ApplicationPrePopulationDataFlat,
  ProfileCompletionResponse,
  ProfileCompletionStatus,
  QuickApplicationRequest,
  UpdateApplicationDefaultsRequest,
  UpdateApplicationPreferencesRequest,
} from '../types';
import { logger } from '../utils/logger';

/**
 * Phase 1 - Application Profile Service
 * Manages user application defaults and pre-population functionality
 */
export class ApplicationProfileService {
  /**
   * Get user's application defaults for form pre-population
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to user's application defaults or null if not set
   * @throws Error if user is not found
   * @example
   * ```typescript
   * const defaults = await ApplicationProfileService.getApplicationDefaults('user_123');
   * console.log(defaults?.personalInfo?.firstName); // 'John'
   * ```
   */
  static async getApplicationDefaults(userId: string): Promise<ApplicationDefaults | null> {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['applicationDefaults'],
      });

      if (!user) {
        throw new Error('User not found');
      }

      return (user.applicationDefaults as ApplicationDefaults) || null;
    } catch (error) {
      logger.error('Error getting application defaults:', error);
      throw error;
    }
  }

  /**
   * Update user's application defaults with merged data and recalculate completion status
   * @param userId - The unique identifier of the user
   * @param request - Object containing the application defaults to update
   * @returns Promise resolving to the updated application defaults
   * @throws Error if user is not found or update fails
   * @example
   * ```typescript
   * const updated = await ApplicationProfileService.updateApplicationDefaults('user_123', {
   *   applicationDefaults: {
   *     personalInfo: { firstName: 'Jane', lastName: 'Doe' },
   *     livingSituation: { housingType: 'house', isOwned: true }
   *   }
   * });
   * ```
   */
  static async updateApplicationDefaults(
    userId: string,
    request: UpdateApplicationDefaultsRequest
  ): Promise<ApplicationDefaults> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Merge with existing defaults
      const currentDefaults = (user.applicationDefaults as ApplicationDefaults) || {};
      const updatedDefaults = this.mergeApplicationDefaults(
        currentDefaults,
        request.applicationDefaults
      );

      // Update the user record
      await user.update({
        applicationDefaults: JSON.parse(JSON.stringify(updatedDefaults)),
        profileCompletionStatus: JSON.parse(
          JSON.stringify(this.calculateProfileCompletion(updatedDefaults, user))
        ),
      });

      logger.info('Application defaults updated successfully', { userId });
      return updatedDefaults;
    } catch (error) {
      logger.error('Error updating application defaults:', error);
      throw error;
    }
  }

  /**
   * Get user's application behavior preferences (auto-populate, quick apply, etc.)
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to user's application preferences with default values
   * @throws Error if user is not found
   * @example
   * ```typescript
   * const prefs = await ApplicationProfileService.getApplicationPreferences('user_123');
   * console.log(prefs.auto_populate); // true
   * console.log(prefs.quick_apply_enabled); // false
   * ```
   */
  static async getApplicationPreferences(userId: string): Promise<ApplicationPreferences> {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['applicationPreferences'],
      });

      if (!user) {
        throw new Error('User not found');
      }

      return (
        (user.applicationPreferences as unknown as ApplicationPreferences) || {
          auto_populate: true,
          quick_apply_enabled: false,
          completion_reminders: true,
        }
      );
    } catch (error) {
      logger.error('Error getting application preferences:', error);
      throw error;
    }
  }

  /**
   * Update user's application behavior preferences
   * @param userId - The unique identifier of the user
   * @param request - Object containing the application preferences to update
   * @returns Promise resolving to the updated application preferences
   * @throws Error if user is not found or update fails
   * @example
   * ```typescript
   * const updated = await ApplicationProfileService.updateApplicationPreferences('user_123', {
   *   applicationPreferences: {
   *     auto_populate: false,
   *     quick_apply_enabled: true,
   *     completion_reminders: false
   *   }
   * });
   * ```
   */
  static async updateApplicationPreferences(
    userId: string,
    request: UpdateApplicationPreferencesRequest
  ): Promise<ApplicationPreferences> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Merge with existing preferences
      const currentPreferences =
        (user.applicationPreferences as unknown as ApplicationPreferences) || {};
      const updatedPreferences = { ...currentPreferences, ...request.applicationPreferences };

      await user.update({
        applicationPreferences: updatedPreferences,
      });

      logger.info('Application preferences updated successfully', { userId });
      return updatedPreferences;
    } catch (error) {
      logger.error('Error updating application preferences:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive profile completion status with recommendations and quick-apply eligibility
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to profile completion response with status, missing fields, and recommendations
   * @throws Error if user is not found
   * @example
   * ```typescript
   * const completion = await ApplicationProfileService.getProfileCompletion('user_123');
   * console.log(completion.completionStatus.overall_percentage); // 85
   * console.log(completion.canQuickApply); // true
   * console.log(completion.missingFields); // ['References']
   * ```
   */
  static async getProfileCompletion(userId: string): Promise<ProfileCompletionResponse> {
    try {
      const user = await User.findByPk(userId, {
        attributes: [
          'applicationDefaults',
          'profileCompletionStatus',
          'firstName',
          'lastName',
          'email',
        ],
      });

      if (!user) {
        throw new Error('User not found');
      }

      const defaults = (user.applicationDefaults as ApplicationDefaults) || {};
      const completionStatus = this.calculateProfileCompletion(defaults, user);
      const missingFields = this.getMissingFields(defaults, user);
      const recommendations = this.getCompletionRecommendations(completionStatus, missingFields);
      const canQuickApply =
        (completionStatus.overall_percentage || completionStatus.overallCompleteness * 100) >= 80;

      return {
        completionStatus,
        quickApplicationCapability: {
          canProceed: canQuickApply,
          missingFields,
          recommendations,
          canQuickApply,
        },
        prePopulationData: defaults,
        missingFields,
        recommendations,
        canQuickApply,
      };
    } catch (error) {
      logger.error('Error getting profile completion:', error);
      throw error;
    }
  }

  /**
   * Get pre-population data for application forms by merging user profile with saved defaults
   * @param userId - The unique identifier of the user
   * @param _petId - Optional pet ID for future pet-specific customizations (currently unused)
   * @returns Promise resolving to pre-population data including personal info, living situation, pet experience, and references
   * @throws Error if user is not found
   * @example
   * ```typescript
   * const prePopData = await ApplicationProfileService.getPrePopulationData('user_123', 'pet_456');
   * console.log(prePopData.personalInfo.firstName); // 'John'
   * console.log(prePopData.source); // 'profile_defaults'
   * console.log(prePopData.livingSituation?.housingType); // 'apartment'
   * ```
   */
  static async getPrePopulationData(
    userId: string,
    _petId?: string
  ): Promise<ApplicationPrePopulationDataFlat> {
    try {
      const user = await User.findByPk(userId, {
        attributes: [
          'applicationDefaults',
          'firstName',
          'lastName',
          'email',
          'phoneNumber',
          'addressLine1',
          'city',
          'postalCode',
          'country',
          'updatedAt',
        ],
      });

      if (!user) {
        throw new Error('User not found');
      }

      const defaults = (user.applicationDefaults as ApplicationDefaults) || {};

      // Merge basic user info with defaults
      const personalInfo = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phoneNumber || undefined,
        address: user.addressLine1 || undefined,
        city: user.city || undefined,
        postcode: user.postalCode || undefined,
        country: user.country || undefined,
        ...defaults.personalInfo,
      };

      return {
        personalInfo,
        livingSituation: defaults.livingSituation,
        petExperience: defaults.petExperience,
        references: defaults.references,
        source: 'profile_defaults',
        lastUpdated: user.updatedAt,
      };
    } catch (error) {
      logger.error('Error getting pre-population data:', error);
      throw error;
    }
  }

  /**
   * Process quick application request to validate profile completeness and provide pre-population data
   * @param userId - The unique identifier of the user
   * @param request - Quick application request containing pet ID and preferences
   * @returns Promise resolving to result indicating if quick application can proceed, with optional pre-population data or missing fields
   * @throws Error if user is not found or validation fails
   * @example
   * ```typescript
   * const result = await ApplicationProfileService.processQuickApplication('user_123', {
   *   petId: 'pet_456',
   *   useDefaultData: true
   * });
   * if (result.canProceed) {
   *   console.log('Quick application possible!');
   *   console.log(result.prePopulationData?.personalInfo?.firstName);
   * } else {
   *   console.log('Missing fields:', result.missingFields);
   * }
   * ```
   */
  static async processQuickApplication(
    userId: string,
    request: QuickApplicationRequest
  ): Promise<{
    canProceed: boolean;
    prePopulationData?: ApplicationPrePopulationDataFlat;
    missingFields?: string[];
  }> {
    try {
      if (!request.useDefaultData) {
        return { canProceed: true };
      }

      const completionResponse = await this.getProfileCompletion(userId);

      if (!completionResponse.canQuickApply) {
        return {
          canProceed: false,
          missingFields: completionResponse.missingFields,
        };
      }

      const prePopulationData = await this.getPrePopulationData(userId, request.petId);

      return {
        canProceed: true,
        prePopulationData,
      };
    } catch (error) {
      logger.error('Error processing quick application:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Merge existing application defaults with updates, preserving existing data
   * @private
   * @param current - Current application defaults
   * @param updates - Partial updates to merge
   * @returns Merged application defaults
   */
  private static mergeApplicationDefaults(
    current: ApplicationDefaults,
    updates: Partial<ApplicationDefaults>
  ): ApplicationDefaults {
    return {
      personalInfo: { ...current.personalInfo, ...updates.personalInfo },
      livingSituation: { ...current.livingSituation, ...updates.livingSituation },
      petExperience: { ...current.petExperience, ...updates.petExperience },
      references: {
        veterinary: updates.references?.veterinary || current.references?.veterinary,
        personal: updates.references?.personal || current.references?.personal || [],
      },
      additionalInfo: { ...current.additionalInfo, ...updates.additionalInfo },
    };
  }

  /**
   * Calculate profile completion status based on application defaults and user data
   * @private
   * @param defaults - User's application defaults
   * @param user - Optional user data for fallback validation
   * @returns Profile completion status with percentages and recommendations
   */
  private static calculateProfileCompletion(
    defaults: ApplicationDefaults,
    user?: User
  ): ProfileCompletionStatus {
    const sections = {
      basic_info: this.isBasicInfoComplete(defaults.personalInfo, user),
      living_situation: this.isLivingSituationComplete(defaults.livingSituation),
      pet_experience: this.isPetExperienceComplete(defaults.petExperience),
      references: this.isReferencesComplete(defaults.references),
    };

    const completedSections = Object.entries(sections)
      .filter(([, isComplete]) => isComplete)
      .map(([section]) => section);

    const percentage = Math.round((completedSections.length / Object.keys(sections).length) * 100);

    return {
      ...sections,
      personalInfoComplete: sections.basic_info,
      livingSituationComplete: sections.living_situation,
      petExperienceComplete: sections.pet_experience,
      referencesComplete: sections.references,
      overallCompleteness: percentage / 100,
      overall_percentage: percentage,
      last_updated: new Date(),
      completed_sections: completedSections,
      recommended_next_steps: this.getNextSteps(sections),
    };
  }

  /**
   * Check if basic personal information is complete
   * @private
   * @param personalInfo - Personal information from application defaults
   * @param user - Optional user data for fallback validation
   * @returns True if basic info is complete, false otherwise
   */
  private static isBasicInfoComplete(
    personalInfo?: ApplicationDefaults['personalInfo'],
    user?: User
  ): boolean {
    // If we have application defaults, check them
    if (
      personalInfo &&
      personalInfo.firstName &&
      personalInfo.lastName &&
      personalInfo.email &&
      personalInfo.phone &&
      personalInfo.address &&
      personalInfo.city &&
      personalInfo.county &&
      personalInfo.postcode
    ) {
      return true;
    }

    // Fallback to checking user profile data for basic info
    if (
      user &&
      user.firstName &&
      user.lastName &&
      user.email &&
      user.phoneNumber &&
      user.addressLine1 &&
      user.city &&
      user.postalCode
    ) {
      return true;
    }

    return false;
  }

  private static isLivingSituationComplete(
    livingSituation?: ApplicationDefaults['livingSituation']
  ): boolean {
    if (!livingSituation) {
      return false;
    }
    return !!(
      livingSituation.housingType &&
      typeof livingSituation.isOwned === 'boolean' &&
      typeof livingSituation.hasYard === 'boolean' &&
      typeof livingSituation.householdSize === 'number'
    );
  }

  private static isPetExperienceComplete(
    petExperience?: ApplicationDefaults['petExperience']
  ): boolean {
    if (!petExperience) {
      return false;
    }
    return !!(
      petExperience.experienceLevel &&
      typeof petExperience.hoursAloneDaily === 'number' &&
      typeof petExperience.willingToTrain === 'boolean'
    );
  }

  private static isReferencesComplete(references?: ApplicationDefaults['references']): boolean {
    if (!references) {
      return false;
    }
    return !!(
      references.personal &&
      references.personal.length >= 2 &&
      references.personal.every(ref => ref.name && ref.relationship && ref.phone)
    );
  }

  private static getMissingFields(defaults: ApplicationDefaults, user: User): string[] {
    const missing: string[] = [];

    if (!this.isBasicInfoComplete(defaults.personalInfo, user)) {
      missing.push('Personal Information');
    }
    if (!this.isLivingSituationComplete(defaults.livingSituation)) {
      missing.push('Living Situation');
    }
    if (!this.isPetExperienceComplete(defaults.petExperience)) {
      missing.push('Pet Experience');
    }
    if (!this.isReferencesComplete(defaults.references)) {
      missing.push('References');
    }

    return missing;
  }

  private static getCompletionRecommendations(
    status: ProfileCompletionStatus,
    missingFields: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (missingFields.includes('Personal Information')) {
      recommendations.push('Complete your basic contact information');
    }
    if (missingFields.includes('Living Situation')) {
      recommendations.push('Add details about your home and living arrangements');
    }
    if (missingFields.includes('Pet Experience')) {
      recommendations.push('Share your experience with pets');
    }
    if (missingFields.includes('References')) {
      recommendations.push('Add at least 2 personal references');
    }

    if ((status.overall_percentage || status.overallCompleteness * 100) >= 80) {
      recommendations.push('Your profile is complete enough for quick applications!');
    }

    return recommendations;
  }

  private static getNextSteps(sections: Record<string, boolean>): string[] {
    const nextSteps: string[] = [];

    if (!sections.basic_info) {
      nextSteps.push('complete_basic_info');
    } else if (!sections.living_situation) {
      nextSteps.push('complete_living_situation');
    } else if (!sections.pet_experience) {
      nextSteps.push('complete_pet_experience');
    } else if (!sections.references) {
      nextSteps.push('complete_references');
    } else {
      nextSteps.push('profile_complete');
    }

    return nextSteps;
  }
}
