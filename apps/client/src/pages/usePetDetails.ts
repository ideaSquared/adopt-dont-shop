import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { petService } from '@/services';

type Coordinates = { latitude?: number; longitude?: number };

/**
 * One pet. The cached device location (never prompted for here) lets the API
 * fill in the pet's distance; without one the call is unchanged.
 */
export const usePetDetails = (petId: string | undefined, { latitude, longitude }: Coordinates) =>
  useQuery({
    queryKey: ['pets', petId, { latitude, longitude }],
    queryFn: () =>
      latitude !== undefined && longitude !== undefined
        ? petService.getPetById(petId ?? '', { latitude, longitude })
        : petService.getPetById(petId ?? ''),
    enabled: !!petId,
  });

/** Whether the signed-in user has favourited the pet, plus a toggle for it. */
export const usePetFavorite = (petId: string | undefined, enabled: boolean) => {
  const queryClient = useQueryClient();
  const queryKey = ['pets', petId, 'favorite'] as const;

  const statusQuery = useQuery({
    queryKey,
    queryFn: () => petService.isFavorite(petId ?? ''),
    enabled: enabled && !!petId,
  });

  const toggle = useMutation({
    mutationFn: async ({ petId: targetId, isFavorite }: { petId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await petService.removeFromFavorites(targetId);
        return false;
      }
      await petService.addToFavorites(targetId);
      return true;
    },
    onSuccess: nextValue => queryClient.setQueryData(queryKey, nextValue),
    // The page reports failures itself (with a Retry action); opt out of the app-wide generic toast.
    onError: () => undefined,
  });

  return { isFavorite: statusQuery.data ?? false, toggle };
};
