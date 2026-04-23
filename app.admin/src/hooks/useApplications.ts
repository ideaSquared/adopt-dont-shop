import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  applicationService,
  type ApplicationFilters,
  type ApplicationStatus,
} from '../services/applicationService';

export const useApplications = (filters: ApplicationFilters = {}) => {
  return useQuery(['applications', filters], () => applicationService.getAll(filters), {
    keepPreviousData: true,
    staleTime: 30000,
  });
};

export const useBulkUpdateApplications = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      applicationIds,
      updates,
      reason,
    }: {
      applicationIds: string[];
      updates: { status?: ApplicationStatus; reviewNotes?: string };
      reason?: string;
    }) => applicationService.bulkUpdate(applicationIds, updates, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('applications');
      },
    }
  );
};
