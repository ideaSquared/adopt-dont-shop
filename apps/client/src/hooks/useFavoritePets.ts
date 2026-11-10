import { useQuery } from '@tanstack/react-query';
import { petService } from '@/services';

export const FAVORITE_PETS_QUERY_KEY = ['favorites', 'pets'] as const;
export const FAVORITE_PET_IDS_QUERY_KEY = ['favorites', 'ids'] as const;

/** The signed-in adopter's favourite pets, in full. */
export const useFavoritePets = (enabled: boolean) =>
  useQuery({
    queryKey: FAVORITE_PETS_QUERY_KEY,
    queryFn: () => petService.getFavorites(),
    enabled,
  });
