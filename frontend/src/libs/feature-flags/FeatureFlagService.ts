// src/services/FeatureFlagService.ts

import { apiService } from '../api-service'

const API_BASE_URL = '/feature-flags'

/**
 * Fetch all feature flags from the API.
 * @returns Promise resolving to an array of feature flags.
 */
export const fetchFeatureFlags = async (): Promise<unknown[]> => {
  return apiService.get<unknown[]>(API_BASE_URL)
}

/**
 * Fetch a specific feature flag by its name.
 * @param flagName - The name of the feature flag to fetch.
 * @returns Promise resolving to a boolean indicating whether the flag is enabled.
 */
export const fetchFeatureFlagByName = async (
  flagName: string,
): Promise<boolean> => {
  try {
    const flag = await apiService.get<{ name: string; enabled: boolean }>(
      `${API_BASE_URL}/${flagName}`,
    )
    console.log(`Fetched feature flag ${flagName}:`, flag)
    return flag.enabled
  } catch (error) {
    console.error(`Failed to fetch feature flag ${flagName}:`, error)
    return false // Default to false if the fetch fails
  }
}

/**
 * Update a specific feature flag.
 * @param flag_id - The ID of the feature flag to update.
 * @param enabled - A boolean indicating whether the flag should be enabled.
 * @returns Promise resolving to the updated feature flag.
 */
export const updateFeatureFlag = async (
  flag_id: string,
  enabled: boolean,
): Promise<unknown> => {
  return apiService.put<{ flag_id: string; enabled: boolean }, unknown>(
    API_BASE_URL,
    { flag_id, enabled },
  )
}

export default {
  fetchFeatureFlags,
  fetchFeatureFlagByName,
  updateFeatureFlag,
}
