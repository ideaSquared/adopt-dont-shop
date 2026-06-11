import { useEffect, useState } from 'react';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import type { AdopterMatchProfile } from '@adopt-dont-shop/lib.matching';
import { apiService } from '@/services';

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
export const useMatchPreferences = (): UseMatchPreferencesReturn => {
  const { isAuthenticated } = useAuth();
  const [hasPreferences, setHasPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasPreferences(false);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await apiService.get<{ data: Partial<AdopterMatchProfile> }>(
          '/api/v1/match/profile'
        );
        if (!cancelled) {
          setHasPreferences(hasAnyPreference(res.data));
        }
      } catch {
        if (!cancelled) {
          setHasPreferences(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return { hasPreferences, isLoading };
};
