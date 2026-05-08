import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Redis with an in-memory store, then assert the cache helper is
// exercised correctly by the service layer.
vi.mock('../../lib/redis', () => {
  const store = new Map<string, string>();
  const fakeRedis = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    incr: vi.fn(async (key: string) => {
      const current = parseInt(store.get(key) ?? '1', 10);
      const next = String(current + 1);
      store.set(key, next);
      return next;
    }),
    __store: store,
  };
  return {
    getRedis: vi.fn(() => fakeRedis),
    isRedisReady: vi.fn(() => true),
    ensureRedisReady: vi.fn(async () => true),
    __fakeRedis: fakeRedis,
  };
});

import sequelize from '../../sequelize';
import Pet, { AgeGroup, Gender, PetStatus, PetType, Size } from '../../models/Pet';
import Rescue from '../../models/Rescue';
import { PetService } from '../../services/pet.service';
import * as redisModule from '../../lib/redis';

const fakeRedis = (redisModule as unknown as { __fakeRedis: { __store: Map<string, string> } })
  .__fakeRedis;

describe('PetService cache invalidation [ADS-479]', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    fakeRedis.__store.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    fakeRedis.__store.clear();
    await Pet.destroy({ where: {}, truncate: true, cascade: true });
    await Rescue.destroy({ where: {}, truncate: true, cascade: true });
  });

  it('serves getFeaturedPets from cache on the second call', async () => {
    const rescue = await Rescue.create({
      name: 'Cache Rescue',
      email: 'cache@test.com',
      status: 'verified',
      address: '1 Test Lane',
      city: 'Testville',
      postcode: 'TE1 1ST',
      country: 'GB',
      contactPerson: 'Tester',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    await Pet.create({
      name: 'Featured Fido',
      type: PetType.DOG,
      status: PetStatus.AVAILABLE,
      gender: Gender.MALE,
      size: Size.MEDIUM,
      ageGroup: AgeGroup.ADULT,
      featured: true,
      archived: false,
      rescueId: rescue.rescueId,
    });

    const findAllSpy = vi.spyOn(Pet, 'findAll');

    const first = await PetService.getFeaturedPets(5);
    const second = await PetService.getFeaturedPets(5);

    expect(first.length).toBe(1);
    expect(second.length).toBe(1);
    // First call hits the DB, second is served from the cache.
    expect(findAllSpy).toHaveBeenCalledTimes(1);

    findAllSpy.mockRestore();
  });
});
