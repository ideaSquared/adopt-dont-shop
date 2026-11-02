import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import { getViewsToday, recordPetView } from './view-handlers.js';

const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['pets.read' as Permission],
};

const NO_PERMISSIONS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: [],
  permissions: [],
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

describe('recordPetView', () => {
  it('rejects anonymous callers', async () => {
    const { deps } = makeMocks();
    await expect(recordPetView(deps, null, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects a caller without pets.read', async () => {
    const { deps } = makeMocks();
    await expect(recordPetView(deps, NO_PERMISSIONS, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('requires a pet id', async () => {
    const { deps } = makeMocks();
    await expect(recordPetView(deps, ADOPTER, { petId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('stores a view for the calling user and reports it recorded', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await recordPetView(deps, ADOPTER, { petId: 'pet-1' });

    expect(res).toEqual({ recorded: true });
    const [sql, params] = poolMock.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO pets.pet_views');
    expect(params).toContain('pet-1');
    expect(params).toContain('usr-adopter');
  });

  it('reports not recorded when the view falls inside the dedupe window', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await recordPetView(deps, ADOPTER, { petId: 'pet-1' });

    expect(res).toEqual({ recorded: false });
  });

  it('treats a missing pet as not found', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query.mockRejectedValueOnce(
      Object.assign(new Error('fk violation'), { code: '23503' })
    );

    await expect(recordPetView(deps, ADOPTER, { petId: 'pet-gone' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('getViewsToday', () => {
  it('rejects a caller without pets.read', async () => {
    const { deps } = makeMocks();
    await expect(getViewsToday(deps, NO_PERMISSIONS, { petIds: ['pet-1'] })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns an empty list without querying when no ids are given', async () => {
    const { deps, poolMock } = makeMocks();

    const res = await getViewsToday(deps, ADOPTER, { petIds: [] });

    expect(res).toEqual({ counts: [] });
    expect(poolMock.query).not.toHaveBeenCalled();
  });

  it('rejects more than 100 ids', async () => {
    const { deps } = makeMocks();
    const petIds = Array.from({ length: 101 }, (_, i) => `pet-${i}`);
    await expect(getViewsToday(deps, ADOPTER, { petIds })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('counts last-24h views per pet in one query', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query.mockResolvedValueOnce({
      rows: [
        { pet_id: 'pet-1', views: '7' },
        { pet_id: 'pet-2', views: '2' },
      ],
      rowCount: 2,
    });

    const res = await getViewsToday(deps, ADOPTER, { petIds: ['pet-1', 'pet-2', 'pet-3'] });

    expect(res.counts).toEqual([
      { petId: 'pet-1', views: 7 },
      { petId: 'pet-2', views: 2 },
    ]);
    expect(poolMock.query).toHaveBeenCalledTimes(1);
    const [sql, params] = poolMock.query.mock.calls[0];
    expect(sql).toContain('pets.pet_views');
    expect(params).toEqual([['pet-1', 'pet-2', 'pet-3']]);
  });
});
