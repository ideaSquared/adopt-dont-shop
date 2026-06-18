import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import {
  addFavorite,
  getFavoriteStatus,
  listUserFavorites,
  removeFavorite,
} from './favorite-handlers.js';

const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['pets.read' as Permission],
};

function makeMocks() {
  const pool = { query: vi.fn() };
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: {} as unknown as NatsConnection,
  };
  return { deps, poolMock: pool };
}

const petRow = (overrides: Record<string, unknown> = {}) => ({
  pet_id: 'pet-1',
  name: 'Rex',
  rescue_id: 'rsc-1',
  type: 'dog',
  status: 'available',
  gender: 'male',
  size: 'large',
  age_group: 'adult',
  breed_id: null,
  secondary_breed_id: null,
  short_description: null,
  long_description: null,
  age_years: 3,
  age_months: null,
  color: 'brown',
  archived: false,
  featured: false,
  priority_listing: false,
  adoption_fee_minor: 5000,
  adoption_fee_currency: 'GBP',
  special_needs: false,
  house_trained: true,
  temperament: [],
  tags: [],
  good_with_children: null,
  good_with_dogs: null,
  good_with_cats: null,
  good_with_small_animals: null,
  medical_notes: null,
  behavioral_notes: null,
  view_count: 0,
  favorite_count: 0,
  application_count: 0,
  available_since: new Date('2026-06-01T00:00:00Z'),
  adopted_date: null,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

describe('addFavorite', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('inserts a new favourite when none exists', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] }) // existing lookup → none
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // insert
    const res = await addFavorite(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.favorited).toBe(true);
    const [sql] = mocks.poolMock.query.mock.calls[1] as [string];
    expect(sql).toMatch(/INSERT INTO pets.user_favorites/);
  });

  it('revives a soft-deleted favourite instead of inserting', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ id: 'fav-1', deleted_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // revive UPDATE
    const res = await addFavorite(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.favorited).toBe(true);
    const [sql] = mocks.poolMock.query.mock.calls[1] as [string];
    expect(sql).toMatch(/deleted_at = NULL/);
  });

  it('is a no-op when an active favourite already exists', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ id: 'fav-1', deleted_at: null }] });
    const res = await addFavorite(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.favorited).toBe(true);
    // Only the lookup ran — no second write.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('maps an FK violation (unknown pet) to NOT_FOUND', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(Object.assign(new Error('fk'), { code: '23503' }));
    await expect(addFavorite(mocks.deps, ADOPTER, { petId: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('requires authentication', async () => {
    await expect(addFavorite(mocks.deps, null, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});

describe('removeFavorite', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('soft-deletes and reports removed=true', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const res = await removeFavorite(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.removed).toBe(true);
    const [sql] = mocks.poolMock.query.mock.calls[0] as [string];
    expect(sql).toMatch(/SET deleted_at = now\(\)/);
  });

  it('is idempotent — removing a non-favourite reports removed=false', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await removeFavorite(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.removed).toBe(false);
  });
});

describe('getFavoriteStatus', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns isFavorite=true when an active row exists', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const res = await getFavoriteStatus(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.isFavorite).toBe(true);
  });

  it('returns isFavorite=false when none exists', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await getFavoriteStatus(mocks.deps, ADOPTER, { petId: 'pet-1' });
    expect(res.isFavorite).toBe(false);
  });
});

describe('listUserFavorites', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns the public projection of the favourited pets', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [petRow()] });
    const res = await listUserFavorites(mocks.deps, ADOPTER, {});
    expect(res.pets).toHaveLength(1);
    expect(res.pets[0].petId).toBe('pet-1');
    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/pets.user_favorites/);
    expect(params[0]).toBe('usr-adopter');
  });

  it('requires authentication', async () => {
    await expect(listUserFavorites(mocks.deps, null, {})).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});
