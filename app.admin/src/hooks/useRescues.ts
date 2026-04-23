import { useMutation, useQueryClient } from 'react-query';
import { rescueService } from '../services/rescueService';

export const useBulkUpdateRescues = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      rescueIds,
      action,
      reason,
    }: {
      rescueIds: string[];
      action: 'approve' | 'suspend' | 'verify';
      reason?: string;
    }) => rescueService.bulkUpdate(rescueIds, action, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rescues');
      },
    }
  );
};
