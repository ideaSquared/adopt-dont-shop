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
