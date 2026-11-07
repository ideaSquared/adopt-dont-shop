import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import type { RescueClient } from './rescue-client.js';
import { getViewsToday, recordPetView } from './view-handlers.js';

const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['pets.read' as Permission],
};

const ADMIN: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: ['pets.read' as Permission, 'pets.read:any' as Permission],
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
    rescueClient: {} as unknown as RescueClient,
  };
  return { deps, poolMock: pool };
}

// Only the columns the visibility gate reads.
const petRow = (overrides: Record<string, unknown> = {}) => ({
  pet_id: 'pet-1',
  rescue_id: 'rsc-1',
  status: 'available',
  archived: false,
  ...overrides,
});

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

  it('treats a missing pet as not found without storing anything', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(recordPetView(deps, ADOPTER, { petId: 'pet-gone' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(poolMock.query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['adopted', { status: 'adopted' }],
    ['not available', { status: 'not_available' }],
    ['archived', { archived: true }],
  ])('treats a %s pet as not found for a public reader', async (_label, overrides) => {
    const { deps, poolMock } = makeMocks();
    poolMock.query.mockResolvedValueOnce({ rows: [petRow(overrides)], rowCount: 1 });

    await expect(recordPetView(deps, ADOPTER, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('lets a privileged reader record a view on a hidden-status pet', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query
      .mockResolvedValueOnce({ rows: [petRow({ status: 'adopted' })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await recordPetView(deps, ADMIN, { petId: 'pet-1' });

    expect(res).toEqual({ recorded: true });
  });

  it('stores the view for the calling user in one atomic statement', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query
      .mockResolvedValueOnce({ rows: [petRow()], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await recordPetView(deps, ADOPTER, { petId: 'pet-1' });

    expect(res).toEqual({ recorded: true });
    const [sql, params] = poolMock.query.mock.calls[1];
    expect(sql).toContain('INSERT INTO pets.pet_views');
    expect(sql).toContain('ON CONFLICT DO NOTHING');
    expect(params).toContain('pet-1');
    expect(params).toContain('usr-adopter');
  });

  it('reports not recorded when the view hit the per-hour unique index', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query
      .mockResolvedValueOnce({ rows: [petRow()], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await recordPetView(deps, ADOPTER, { petId: 'pet-1' });

    expect(res).toEqual({ recorded: false });
  });

  it('treats a pet deleted mid-request as not found', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query
      .mockResolvedValueOnce({ rows: [petRow()], rowCount: 1 })
      .mockRejectedValueOnce(Object.assign(new Error('fk violation'), { code: '23503' }));

    await expect(recordPetView(deps, ADOPTER, { petId: 'pet-1' })).rejects.toMatchObject({
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

  it('counts last-24h views for the visible pets in one count query', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query
      .mockResolvedValueOnce({
        rows: [petRow({ pet_id: 'pet-1' }), petRow({ pet_id: 'pet-2' })],
        rowCount: 2,
      })
      .mockResolvedValueOnce({
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
    const [sql, params] = poolMock.query.mock.calls[1];
    expect(sql).toContain('pets.pet_views');
    expect(params).toEqual([['pet-1', 'pet-2']]);
  });

  it('never counts hidden, archived or deleted pets for a public reader', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          petRow({ pet_id: 'pet-1' }),
          petRow({ pet_id: 'pet-2', status: 'adopted' }),
          petRow({ pet_id: 'pet-3', archived: true }),
        ],
        rowCount: 3,
      })
      .mockResolvedValueOnce({ rows: [{ pet_id: 'pet-1', views: '9' }], rowCount: 1 });

    const res = await getViewsToday(deps, ADOPTER, {
      petIds: ['pet-1', 'pet-2', 'pet-3', 'pet-deleted'],
    });

    expect(res.counts).toEqual([{ petId: 'pet-1', views: 9 }]);
    expect(poolMock.query.mock.calls[1][1]).toEqual([['pet-1']]);
  });

  it('skips the count query when no requested pet is visible', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query.mockResolvedValueOnce({
      rows: [petRow({ status: 'adopted' })],
      rowCount: 1,
    });

    const res = await getViewsToday(deps, ADOPTER, { petIds: ['pet-1'] });

    expect(res).toEqual({ counts: [] });
    expect(poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('lets a privileged reader count hidden-status pets', async () => {
    const { deps, poolMock } = makeMocks();
    poolMock.query
      .mockResolvedValueOnce({ rows: [petRow({ status: 'adopted' })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ pet_id: 'pet-1', views: '3' }], rowCount: 1 });

    const res = await getViewsToday(deps, ADMIN, { petIds: ['pet-1'] });

    expect(res.counts).toEqual([{ petId: 'pet-1', views: 3 }]);
  });
});
