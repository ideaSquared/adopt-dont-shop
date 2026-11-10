import { useQuery } from '@tanstack/react-query';
import { applicationService } from '@/services';

export const PROFILE_APPLICATIONS_QUERY_KEY = ['applications', 'mine'] as const;

/** The signed-in adopter's applications, fetched only while the Applications tab is open. */
export const useProfileApplications = (enabled: boolean) =>
  useQuery({
    queryKey: PROFILE_APPLICATIONS_QUERY_KEY,
    queryFn: () => applicationService.getUserApplications(),
    enabled,
  });
