import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/redis', () => ({
  getRedis: vi.fn(() => null),
  isRedisReady: vi.fn(() => false),
  ensureRedisReady: vi.fn(async () => false),
}));

import sequelize from '../../sequelize';
import Breed from '../../models/Breed';
import Pet, { AgeGroup, Gender, PetStatus, PetType, Size } from '../../models/Pet';
import Rescue from '../../models/Rescue';
import { DiscoveryService, __resetBreedCacheForTests } from '../../services/discovery.service';

describe('DiscoveryService breed cache [ADS-516]', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    __resetBreedCacheForTests();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    __resetBreedCacheForTests();
    await Pet.destroy({ where: {}, truncate: true, cascade: true });
    await Rescue.destroy({ where: {}, truncate: true, cascade: true });
    await Breed.destroy({ where: {}, truncate: true, cascade: true });
  });

  it('fetches the breed catalogue once and reuses it across requests', async () => {
    const rescue = await Rescue.create({
      name: 'R',
      email: 'r@test.com',
      status: 'verified',
      address: '1 Test',
      city: 'C',
      postcode: 'P1',
      country: 'GB',
      contactPerson: 'X',
    } as any);

    await Breed.create({
      name: 'Labrador Retriever',
      species: PetType.DOG,
    } as any);
    await Breed.create({
      name: 'Border Collie',
      species: PetType.DOG,
    } as any);

    await Pet.create({
      name: 'Rex',
      type: PetType.DOG,
      status: PetStatus.AVAILABLE,
      gender: Gender.MALE,
      size: Size.MEDIUM,
      ageGroup: AgeGroup.ADULT,
      archived: false,
      rescueId: rescue.rescueId,
    });

    const findAllSpy = vi.spyOn(Breed, 'findAll');

    const svc = new DiscoveryService();
    // We don't care if pet hydration fails (the SQLite test schema
    // doesn't include all the includes the smart-sort needs); only
    // that the breed catalogue is fetched at most once across calls.
    const ignore = (p: Promise<unknown>) => p.catch(() => undefined);
    await ignore(svc.getDiscoveryQueue({ breed: 'Labrador' }, 5));
    await ignore(svc.getDiscoveryQueue({ breed: 'Border' }, 5));
    await ignore(svc.getDiscoveryQueue({ breed: 'Labrador' }, 5));

    // The breed catalogue should have been fetched once for the cache.
    // We allow up to 1 (and any extra calls are unrelated includes
    // — in practice only the catalogue fetch hits findAll for Breed
    // outside includes, so we assert on the count of catalogue-shaped
    // calls).
    const catalogueCalls = findAllSpy.mock.calls.filter(call => {
      const opts = call[0] as { attributes?: string[] } | undefined;
      return Array.isArray(opts?.attributes) && opts.attributes.includes('breed_id');
    });
    expect(catalogueCalls.length).toBe(1);

    findAllSpy.mockRestore();
  });
});
