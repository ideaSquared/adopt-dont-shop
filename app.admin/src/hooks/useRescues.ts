import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rescueService } from '../services/rescueService';

export const useBulkUpdateRescues = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rescueIds,
      action,
      reason,
    }: {
      rescueIds: string[];
      action: 'approve' | 'suspend' | 'verify';
      reason?: string;
    }) => rescueService.bulkUpdate(rescueIds, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rescues'] });
    },
  });
};
