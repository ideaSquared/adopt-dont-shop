import {
  ApplicationDefaults,
  ApplicationPreferences,
  ApplicationPrePopulationData,
  ProfileCompletionResponse,
  QuickApplicationCapability,
} from '../types';
import { api } from './api';

/**
 * Phase 1 - Application Profile Service (Frontend)
 * Handles application defaults and pre-population on the client side
 */
export class ApplicationProfileService {
  private baseUrl = '/api/v1/profile';

  /**
   * Get user's application defaults
   */
  async getApplicationDefaults(): Promise<ApplicationDefaults | null> {
    try {
      const response = (await api.get(
        `${this.baseUrl}/application-defaults`
      )) as ApplicationDefaults;
      return response || null;
    } catch (error) {
      console.error('Failed to get application defaults:', error);
      return null;
    }
  }

  /**
   * Update user's application defaults
   */
  async updateApplicationDefaults(
    applicationDefaults: Partial<ApplicationDefaults>
  ): Promise<ApplicationDefaults> {
    const response = (await api.put(`${this.baseUrl}/application-defaults`, {
      applicationDefaults,
    })) as ApplicationDefaults;
    return response;
  }

  /**
   * Get user's application preferences
   */
  async getApplicationPreferences(): Promise<ApplicationPreferences> {
    const response = (await api.get(
      `${this.baseUrl}/application-preferences`
    )) as ApplicationPreferences;
    return (
      response || {
        auto_populate: true,
        quick_apply_enabled: false,
        completion_reminders: true,
      }
    );
  }

  /**
   * Update user's application preferences
   */
  async updateApplicationPreferences(
    applicationPreferences: Partial<ApplicationPreferences>
  ): Promise<ApplicationPreferences> {
    const response = (await api.put(`${this.baseUrl}/application-preferences`, {
      applicationPreferences,
    })) as ApplicationPreferences;
    return response;
  }

  /**
   * Get profile completion status
   */
  async getProfileCompletion(): Promise<ProfileCompletionResponse> {
    const response = (await api.get(`${this.baseUrl}/completion`)) as ProfileCompletionResponse;
    return response;
  }

  /**
   * Get pre-population data for application forms
   */
  async getPrePopulationData(petId?: string): Promise<ApplicationPrePopulationData> {
    try {
      const params = petId ? { petId } : {};
      const response = await api.get(`${this.baseUrl}/pre-population`, {
        params,
      });

      // Backend returns flat structure, but frontend expects wrapped structure
      const backendData = response as {
        personalInfo?: ApplicationDefaults['personalInfo'];
        livingSituation?: ApplicationDefaults['livingSituation'];
        petExperience?: ApplicationDefaults['petExperience'];
        references?: ApplicationDefaults['references'];
      };

      return {
        defaults: {
          personalInfo: backendData.personalInfo || {},
          livingSituation: backendData.livingSituation || {},
          petExperience: backendData.petExperience || {},
          references: backendData.references || {},
        },
        completionStatus: {
          basic_info: !!backendData.personalInfo,
          living_situation: !!backendData.livingSituation,
          pet_experience: !!backendData.petExperience,
          references: !!backendData.references,
          overall_percentage: 75,
          last_updated: new Date(),
          completed_sections: ['basic_info'],
          recommended_next_steps: [],
        },
        quickApplicationCapability: {
          canProceed: true,
          completionPercentage: 75,
          missingRequirements: [],
          estimatedTimeMinutes: 10,
          missingFields: [],
        },
      };
    } catch (error) {
      console.error('Failed to get pre-population data:', error);
      // Return fallback data to prevent application from breaking
      return {
        defaults: {
          personalInfo: {},
          livingSituation: {},
          petExperience: {},
          references: {},
        },
        completionStatus: {
          basic_info: false,
          living_situation: false,
          pet_experience: false,
          references: false,
          overall_percentage: 0,
          last_updated: null,
          completed_sections: [],
          recommended_next_steps: ['Complete your profile to enable quick applications'],
        },
        quickApplicationCapability: {
          canProceed: false,
          completionPercentage: 0,
          missingRequirements: ['personalInfo', 'livingSituation', 'petExperience', 'references'],
          estimatedTimeMinutes: 30,
          missingFields: ['personalInfo', 'livingSituation', 'petExperience', 'references'],
        },
      };
    }
  }

  /**
   * Check if user can use quick application
   */
  async canUseQuickApplication(petId: string): Promise<QuickApplicationCapability> {
    try {
      interface QuickApplicationResponse {
        prePopulationData: ApplicationPrePopulationData;
      }

      const response = (await api.post(`${this.baseUrl}/quick-application`, {
        petId,
        useDefaultData: true,
      })) as QuickApplicationResponse;

      // The API service extracts the data, so response is now { prePopulationData: {...} }
      const prePopulationData = response.prePopulationData;

      if (!prePopulationData) {
        throw new Error('No pre-population data received from backend');
      }

      return {
        canProceed: true,
        completionPercentage: 90,
        missingRequirements: [],
        estimatedTimeMinutes: 5,
        prePopulationData: prePopulationData.defaults,
      };
    } catch (error: unknown) {
      const apiError = error as {
        response?: { status: number; data: { data?: { missingFields?: string[] } } };
      };
      if (apiError.response?.status === 400) {
        return {
          canProceed: false,
          completionPercentage: 0,
          missingRequirements: apiError.response.data.data?.missingFields || [],
          estimatedTimeMinutes: 30,
          missingFields: apiError.response.data.data?.missingFields || [],
        };
      }
      // Return fallback for other errors
      return {
        canProceed: false,
        completionPercentage: 0,
        missingRequirements: ['Unable to check profile completion'],
        estimatedTimeMinutes: 30,
        missingFields: ['Unable to check profile completion'],
      };
    }
  }
}

export const applicationProfileService = new ApplicationProfileService();
