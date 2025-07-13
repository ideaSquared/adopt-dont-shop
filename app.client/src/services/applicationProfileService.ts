import {
  ApplicationDefaults,
  ApplicationPreferences,
  ApplicationPrePopulationData,
  ProfileCompletionResponse,
  QuickApplicationCapability,
} from '../types/enhanced-profile';
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
        save_drafts: true,
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
      const response = (await api.get(`${this.baseUrl}/pre-population`, {
        params,
      })) as ApplicationPrePopulationData;
      return response;
    } catch (error) {
      console.error('Failed to get pre-population data:', error);
      // Return fallback data to prevent application from breaking
      return {
        personalInfo: {},
        livingSituation: {},
        petExperience: {},
        references: {},
        source: 'manual_entry',
        lastUpdated: new Date(),
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
        prePopulationData,
        completionPercentage: 90, // Calculate based on available data
      };
    } catch (error: unknown) {
      const apiError = error as {
        response?: { status: number; data: { data?: { missingFields?: string[] } } };
      };
      if (apiError.response?.status === 400) {
        return {
          canProceed: false,
          missingFields: apiError.response.data.data?.missingFields || [],
          completionPercentage: 0,
        };
      }
      // Return fallback for other errors
      return {
        canProceed: false,
        missingFields: ['Unable to check profile completion'],
        completionPercentage: 0,
      };
    }
  }
}

export const applicationProfileService = new ApplicationProfileService();
