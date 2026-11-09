import { useQuery } from '@tanstack/react-query';
import { petsService } from '@adopt-dont-shop/lib.pets';

/**
 * A single pet by id, for deep links such as /pets/:petId. Idle while
 * `petId` is undefined.
 */
export const usePet = (petId: string | undefined) =>
  useQuery({
    queryKey: ['pets', 'detail', petId],
    queryFn: () => petsService.getPetById(petId ?? ''),
    enabled: petId !== undefined,
  });
