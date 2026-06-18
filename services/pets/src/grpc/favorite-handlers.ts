// gRPC handlers for the per-user favourites surface — AddFavorite /
// RemoveFavorite / GetFavoriteStatus / ListUserFavorites. Backed by the
// pets.user_favorites table (migration 006).
//
// Self-scoped: every handler acts on the calling principal's own
// favourites (principal.userId), so there is no rescue scope and no
// permission beyond being authenticated. Add/Remove are idempotent and
// soft-delete-aware (a re-favourite revives the soft-deleted row rather
// than stacking duplicates).

import { randomUUID } from 'node:crypto';

import type { Principal } from '@adopt-dont-shop/authz';
import {
  type AddFavoriteRequest,
  type AddFavoriteResponse,
  type GetFavoriteStatusRequest,
  type GetFavoriteStatusResponse,
  type ListUserFavoritesRequest,
  type ListUserFavoritesResponse,
  type RemoveFavoriteRequest,
  type RemoveFavoriteResponse,
} from '@adopt-dont-shop/proto';

import {
  HandlerError,
  PETS_SELECT,
  rowToProto,
  type HandlerDeps,
  type PetRow,
} from './handlers.js';

const requireUserId = (principal: Principal | null): string => {
  if (!principal?.userId) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }
  return principal.userId;
};

export async function addFavorite(
  deps: HandlerDeps,
  principal: Principal | null,
  req: AddFavoriteRequest
): Promise<AddFavoriteResponse> {
  const userId = requireUserId(principal);
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }

  // Latest row for this (user, pet) pair, if any. Revive a soft-deleted
  // one; no-op when an active favourite already exists; else insert.
  const existing = await deps.pool.query<{ id: string; deleted_at: Date | null }>(
    `SELECT id, deleted_at FROM pets.user_favorites
      WHERE user_id = $1 AND pet_id = $2
      ORDER BY created_at DESC LIMIT 1`,
    [userId, req.petId]
  );
  const row = existing.rows[0];
  if (row && !row.deleted_at) {
    return { favorited: true };
  }
  if (row && row.deleted_at) {
    await deps.pool.query(
      `UPDATE pets.user_favorites SET deleted_at = NULL, updated_at = now() WHERE id = $1`,
      [row.id]
    );
    return { favorited: true };
  }

  try {
    await deps.pool.query(
      `INSERT INTO pets.user_favorites (id, user_id, pet_id, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $2, now(), now())`,
      [randomUUID(), userId, req.petId]
    );
  } catch (err) {
    // FK violation → the pet doesn't exist.
    if ((err as { code?: string }).code === '23503') {
      throw new HandlerError('NOT_FOUND', `pet ${req.petId} not found`);
    }
    throw err;
  }
  return { favorited: true };
}

export async function removeFavorite(
  deps: HandlerDeps,
  principal: Principal | null,
  req: RemoveFavoriteRequest
): Promise<RemoveFavoriteResponse> {
  const userId = requireUserId(principal);
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }
  // Idempotent: removing a non-favourite is a no-op (removed=false), not
  // an error.
  const res = await deps.pool.query(
    `UPDATE pets.user_favorites
        SET deleted_at = now(), updated_at = now()
      WHERE user_id = $1 AND pet_id = $2 AND deleted_at IS NULL`,
    [userId, req.petId]
  );
  return { removed: (res.rowCount ?? 0) > 0 };
}

export async function getFavoriteStatus(
  deps: HandlerDeps,
  principal: Principal | null,
  req: GetFavoriteStatusRequest
): Promise<GetFavoriteStatusResponse> {
  const userId = requireUserId(principal);
  if (!req.petId) {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }
  const res = await deps.pool.query(
    `SELECT 1 FROM pets.user_favorites
      WHERE user_id = $1 AND pet_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [userId, req.petId]
  );
  return { isFavorite: (res.rowCount ?? 0) > 0 };
}

export async function listUserFavorites(
  deps: HandlerDeps,
  principal: Principal | null,
  _req: ListUserFavoritesRequest
): Promise<ListUserFavoritesResponse> {
  const userId = requireUserId(principal);
  // The public projection of the pets the caller favourited (most-recent
  // first). includeInternalNotes=false — these are the adopter's own list,
  // not a privileged rescue/admin read.
  const res = await deps.pool.query<PetRow>(
    `SELECT ${PETS_SELECT} FROM pets.pets
      WHERE deleted_at IS NULL
        AND pet_id IN (
          SELECT pet_id FROM pets.user_favorites
           WHERE user_id = $1 AND deleted_at IS NULL
        )
      ORDER BY created_at DESC`,
    [userId]
  );
  return { pets: res.rows.map(row => rowToProto(row, false)) };
}
