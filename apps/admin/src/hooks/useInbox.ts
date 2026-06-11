import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { inboxService, type InboxFilters, type InboxSource } from '../services/inboxService';

export type { InboxFilters, InboxSource } from '../services/inboxService';
export type { InboxItem } from '../services/inboxService';

export const useInbox = (filters: InboxFilters = {}) => {
  return useQuery({
    queryKey: ['inbox', filters],
    queryFn: () => inboxService.getItems(filters),
    placeholderData: keepPreviousData,
    staleTime: 15000, // 15 seconds — inbox should feel responsive
  });
};

export const useInboxAssign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      source,
      assignedTo,
    }: {
      itemId: string;
      source: InboxSource;
      assignedTo: string;
    }) => inboxService.assign(itemId, source, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
};
