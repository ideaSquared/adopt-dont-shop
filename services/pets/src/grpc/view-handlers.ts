// gRPC handlers for pet detail-page views — RecordPetView / GetViewsToday.
// Backed by the pets.pet_views table (migration 012) and feeding the swipe
// card's `views_today` activity label.
//
// Both handlers apply getPet's visibility rules: a pet the caller could not
// read (hidden status, archived, soft-deleted) is treated as not found for
// recording and is left out of the counts, so neither RPC is an existence
// or activity oracle for pets ordinary reads hide.

import { randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { PETS_VIEW as PETS_READ } from '@adopt-dont-shop/lib.types';
import type {
  GetViewsTodayRequest,
  GetViewsTodayResponse,
  RecordPetViewRequest,
  RecordPetViewResponse,
} from '@adopt-dont-shop/proto';

import {
  fetchPet,
  HandlerError,
  isPetHiddenFrom,
  isPrivilegedReader,
  PETS_SELECT,
  type HandlerDeps,
  type PetRow,
} from './handlers.js';

const MAX_PET_IDS = 100;

const FK_VIOLATION = '23503';

const requirePetsRead = (principal: Principal): void => {
  if (!hasPermission(principal, PETS_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_READ}' required`);
  }
};

const isVisibleTo = (principal: Principal, row: PetRow): boolean =>
  !isPetHiddenFrom(row, isPrivilegedReader(principal, row.rescue_id));

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

  const row = await fetchPet(deps, req.petId);
  if (!row || !isVisibleTo(principal, row)) {
    throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
  }

  try {
    // One view per (user, pet, UTC hour): the unique index on
    // (viewer_id, pet_id, view_hour) makes this atomic under concurrency.
    const res = await deps.pool.query(
      `INSERT INTO pets.pet_views (view_id, pet_id, viewer_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [randomUUID(), req.petId, principal.userId]
    );
    return { recorded: (res.rowCount ?? 0) > 0 };
  } catch (err) {
    // The pet was hard-deleted between the visibility read and the insert.
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

  const pets = await deps.pool.query<PetRow>(
    `SELECT ${PETS_SELECT} FROM pets.pets
      WHERE pet_id = ANY($1::uuid[]) AND deleted_at IS NULL`,
    [req.petIds]
  );
  const visibleIds = pets.rows.filter(row => isVisibleTo(principal, row)).map(row => row.pet_id);
  if (visibleIds.length === 0) {
    return { counts: [] };
  }

  const { rows } = await deps.pool.query<{ pet_id: string; views: string }>(
    `SELECT pet_id, COUNT(*)::text AS views
       FROM pets.pet_views
      WHERE pet_id = ANY($1::uuid[])
        AND viewed_at > now() - interval '24 hours'
      GROUP BY pet_id`,
    [visibleIds]
  );
  return { counts: rows.map(r => ({ petId: r.pet_id, views: Number(r.views) })) };
}
