import { useQuery } from '@tanstack/react-query';
import type { EntityActivityFilters, EntityType } from '@adopt-dont-shop/lib.types';

import { entityActivityService } from '../services/entityActivityService';

/**
 * Fetch the chronological activity log for a single entity instance.
 *
 * Used by the EntityInspector "Activity" tab across users, rescues,
 * applications, pets, reports, etc. The route prefix per entity type is
 * resolved inside `entityActivityService`; this hook stays uniform.
 */
export const useEntityActivity = (
  entityType: EntityType,
  entityId: string,
  filters: EntityActivityFilters = {}
) => {
  return useQuery({
    queryKey: ['entity-activity', entityType, entityId, filters],
    queryFn: () => entityActivityService.getActivity(entityType, entityId, filters),
    enabled: !!entityId,
  });
};
