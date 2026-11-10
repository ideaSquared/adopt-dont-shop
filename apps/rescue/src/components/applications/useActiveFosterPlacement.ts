import { useQuery } from '@tanstack/react-query';
import { fosterService, type FosterPlacement } from '../../services/fosterService';

/**
 * The pet's current active foster placement, or null when it has none (or the
 * lookup failed — the cross-link it feeds is optional).
 */
export const useActiveFosterPlacement = (petId: string | undefined) => {
  const query = useQuery<FosterPlacement | null>({
    queryKey: ['foster-placements', { status: 'active', petId }],
    queryFn: async () => {
      const placements = await fosterService.list({ status: 'active' });
      return placements.find(placement => placement.petId === petId) ?? null;
    },
    enabled: !!petId,
    retry: false,
  });

  return query.data ?? null;
};
