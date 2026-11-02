// gRPC handlers for pet detail-page views — RecordPetView / GetViewsToday.
// Backed by the pets.pet_views table (migration 011) and feeding the swipe
// card's `views_today` activity label.

import { randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { PETS_VIEW as PETS_READ } from '@adopt-dont-shop/lib.types';
import type {
  GetViewsTodayRequest,
  GetViewsTodayResponse,
  RecordPetViewRequest,
  RecordPetViewResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

// A repeat view by the same user inside this window is not stored.
const DEDUPE_WINDOW = '1 hour';
const MAX_PET_IDS = 100;

const FK_VIOLATION = '23503';

const requirePetsRead = (principal: Principal): void => {
  if (!hasPermission(principal, PETS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_READ}' required`);
  }
};

export async function recordPetView(
  deps: HandlerDeps,
  principal: Principal | null,
  req: RecordPetViewRequest
): Promise<RecordPetViewResponse> {
  if (!principal?.userId) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }
  requirePetsRead(principal);
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }

  try {
    const res = await deps.pool.query(
      `INSERT INTO pets.pet_views (view_id, pet_id, viewer_id)
       SELECT $1, $2, $3
        WHERE NOT EXISTS (
          SELECT 1 FROM pets.pet_views
           WHERE pet_id = $2 AND viewer_id = $3
             AND viewed_at > now() - interval '${DEDUPE_WINDOW}'
        )`,
      [randomUUID(), req.petId, principal.userId]
    );
    return { recorded: (res.rowCount ?? 0) > 0 };
  } catch (err) {
    if ((err as { code?: string }).code === FK_VIOLATION) {
      throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
    }
    throw err;
  }
}

export async function getViewsToday(
  deps: HandlerDeps,
  principal: Principal,
  req: GetViewsTodayRequest
): Promise<GetViewsTodayResponse> {
  requirePetsRead(principal);
  if (req.petIds.length > MAX_PET_IDS) {
    throw new HandlerError('INVALID_ARGUMENT', `pet_ids must have at most ${MAX_PET_IDS} entries`);
  }
  if (req.petIds.length === 0) {
    return { counts: [] };
  }

  const { rows } = await deps.pool.query<{ pet_id: string; views: string }>(
    `SELECT pet_id, COUNT(*)::text AS views
       FROM pets.pet_views
      WHERE pet_id = ANY($1::uuid[])
        AND viewed_at > now() - interval '24 hours'
      GROUP BY pet_id`,
    [req.petIds]
  );
  return { counts: rows.map(r => ({ petId: r.pet_id, views: Number(r.views) })) };
}
