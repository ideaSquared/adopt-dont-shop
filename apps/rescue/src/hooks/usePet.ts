import { useQuery } from '@tanstack/react-query';
import { petService } from '../services/libraryServices';

/**
 * A single pet by id, for deep links such as /pets/:petId. Idle while
 * `petId` is undefined.
 *
 * The result seeds an edit form, so it must never come from a cache that an
 * earlier save (or any other pet mutation) has made stale: it is fetched
 * afresh on every open and dropped as soon as nothing shows it.
 */
export const usePet = (petId: string | undefined) =>
  useQuery({
    queryKey: ['pets', 'detail', petId],
    queryFn: () => petService.getPetById(petId ?? ''),
    enabled: petId !== undefined,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
