import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import type { AdopterMatchProfile } from '@adopt-dont-shop/lib.matching';
import { matchingService } from '@/services';

type UseMatchPreferencesReturn = {
  hasPreferences: boolean;
  isLoading: boolean;
};

const hasAnyPreference = (profile: Partial<AdopterMatchProfile> | null | undefined): boolean => {
  if (!profile) {
    return false;
  }
  const arrays: Array<readonly string[] | null | undefined> = [
    profile.preferred_types,
    profile.preferred_sizes,
    profile.preferred_age_groups,
    profile.preferred_energy,
  ];
  return arrays.some(arr => Array.isArray(arr) && arr.length > 0);
};

/**
 * ADS-636: small reader for the current user's match preferences.
 *
 * Returns whether the signed-in user has set any match preference (via the
 * onboarding wizard). Used by the nav and HomePage to decide whether to
 * surface Top Picks vs route to onboarding.
 *
 * Signed-out users always get `{ hasPreferences: false, isLoading: false }`
 * so callers can no-op without extra guards.
 */
export const MATCH_PROFILE_QUERY_KEY = ['match-profile'] as const;

export const useMatchPreferences = (): UseMatchPreferencesReturn => {
  const { isAuthenticated } = useAuth();
  const profileQuery = useQuery({
    queryKey: MATCH_PROFILE_QUERY_KEY,
    queryFn: () => matchingService.getMatchProfile(),
    enabled: isAuthenticated,
    retry: false,
  });

  // A failed read counts as "no preferences": callers only use this to pick a destination.
  return {
    hasPreferences: isAuthenticated && hasAnyPreference(profileQuery.data),
    isLoading: isAuthenticated && profileQuery.isLoading,
  };
};
