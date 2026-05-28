import type { EntityActivity, EntityActivityFilters, EntityType } from '@adopt-dont-shop/lib.types';

import { apiService } from './libraryServices';

/**
 * Map a logical entity type to the backend route prefix that serves its
 * activity log. Phase 1 wires `user` only; Phase 2 PRs add the remaining
 * prefixes as the per-entity routes land.
 *
 * Keeping this lookup explicit (rather than pluralising the EntityType
 * string) means a typo here fails loudly via TypeScript instead of
 * silently 404ing at runtime.
 */
const ENTITY_ROUTE_PREFIX: Partial<Record<EntityType, string>> = {
  user: '/api/v1/users',
  chat: '/api/v1/chats',
  // Phase 2 will add:
  // rescue: '/api/v1/rescues',
  // application: '/api/v1/applications',
  // pet: '/api/v1/pets',
  // report: '/api/v1/moderation/reports',
  // support_ticket: '/api/v1/support/tickets',
};

export class EntityActivityNotSupportedError extends Error {
  constructor(entityType: EntityType) {
    super(`Activity feed is not yet supported for entity type: ${entityType}`);
    this.name = 'EntityActivityNotSupportedError';
  }
}

class EntityActivityService {
  async getActivity(
    entityType: EntityType,
    entityId: string,
    filters: EntityActivityFilters = {}
  ): Promise<EntityActivity[]> {
    const prefix = ENTITY_ROUTE_PREFIX[entityType];
    if (!prefix) {
      throw new EntityActivityNotSupportedError(entityType);
    }

    const response = await apiService.get<{ success: boolean; data: EntityActivity[] }>(
      `${prefix}/${entityId}/activity`,
      filters
    );
    return response.data;
  }
}

export const entityActivityService = new EntityActivityService();
