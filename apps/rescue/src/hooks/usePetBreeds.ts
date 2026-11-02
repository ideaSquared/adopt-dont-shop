import { useQuery } from '@tanstack/react-query';
import { apiService } from '@adopt-dont-shop/lib.api';

type BreedsResponse = { success?: boolean; data?: string[] };

// Breed names change rarely (they are reference data seeded into pets.breeds),
// so keep them fresh for an hour rather than refetching on every form open.
const BREEDS_STALE_TIME_MS = 60 * 60 * 1000;

/**
 * Breed names the pets service accepts for a pet type, from
 * GET /api/v1/pets/breeds/:type. The form must offer exactly these: the
 * service rejects a breed name that is not in the list for the pet's type.
 */
export const usePetBreeds = (type: string) =>
  useQuery({
    queryKey: ['pets', 'breeds', type],
    queryFn: async () => {
      const response = await apiService.get<BreedsResponse>(
        `/api/v1/pets/breeds/${encodeURIComponent(type)}`
      );
      return response.data ?? [];
    },
    staleTime: BREEDS_STALE_TIME_MS,
  });
