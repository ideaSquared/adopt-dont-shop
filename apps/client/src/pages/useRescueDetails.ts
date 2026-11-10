import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { petService, rescueService } from '@/services';

export const useRescue = (rescueId: string | undefined) =>
  useQuery({
    queryKey: ['rescues', rescueId],
    queryFn: () => rescueService.getRescue(rescueId ?? ''),
    enabled: !!rescueId,
  });

/** A rescue's pets, one page at a time; `fetchNextPage` backs the "Load More" button. */
export const useRescuePets = (rescueId: string | undefined) =>
  useInfiniteQuery({
    queryKey: ['rescues', rescueId, 'pets'],
    queryFn: ({ pageParam }) => petService.getPetsByRescue(rescueId ?? '', pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.pagination.hasNext ? lastPageParam + 1 : undefined,
    enabled: !!rescueId,
  });
