import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  applicationService,
  type ApplicationFilters,
  type ApplicationStatus,
} from '../services/applicationService';

export const useApplications = (filters: ApplicationFilters = {}) => {
  return useQuery({
    queryKey: ['applications', filters],
    queryFn: () => applicationService.getAll(filters),
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });
};

// Fetches one record by id for /applications/:id deep links, so a link opens its
// record even when it is not on the list page currently loaded. Idle while
// the id is undefined.
export const useApplicationById = (applicationId: string | undefined) =>
  useQuery({
    queryKey: ['applications', 'detail', applicationId],
    queryFn: () => applicationService.getById(applicationId ?? ''),
    enabled: applicationId !== undefined,
    retry: false,
  });

export const useBulkUpdateApplications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationIds,
      updates,
      reason,
    }: {
      applicationIds: string[];
      updates: { status?: ApplicationStatus; reviewNotes?: string };
      reason?: string;
    }) => applicationService.bulkUpdate(applicationIds, updates, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};
