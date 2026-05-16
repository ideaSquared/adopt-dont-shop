/**
 * Eager-load regression tripwires (ADS-531 Sequelize 7 plan §1.4).
 *
 * Sequelize 7 tightened the typing on `Includeable` and changed
 * through-table behaviour. The plan called for "a regression test for
 * one representative findAll({ include }) path per model area to give
 * us a tripwire". This file is that tripwire: a small, fast, no-mock
 * suite that exercises the include patterns the project actually
 * relies on, and asserts the loaded shape directly.
 *
 * Coverage by association type:
 *   - belongsTo with alias (Pet.belongsTo(Rescue, as: 'Rescue'))
 *   - hasMany inverse (Rescue.hasMany(Pet, as: 'Pets'))
 *   - belongsToMany through join table (User <-> Role via UserRole)
 *   - nested two-level include (Application -> Pet -> Breed)
 *
 * Tests run against the in-memory SQLite from the shared test
 * sequelize. They sync({force:true}) per test so each starts clean.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

import sequelize from '../../sequelize';
import { Application, Breed, Pet, Rescue, Role, User, UserRole } from '../../models';
import { UserStatus, UserType } from '../../models/User';
import { PetStatus, PetType, Gender, Size, EnergyLevel } from '../../models/Pet';
import { ApplicationStatus } from '../../models/Application';

const seedRescue = async (rescueId = 'rescue-eager-1') =>
  Rescue.create({
    rescueId,
    name: 'Eager Rescue',
    email: `${rescueId}@example.com`,
    country: 'GB',
    address: '1 Test St',
    city: 'Testville',
    postcode: 'TT1 1TT',
    contactPerson: 'Test Person',
  } as Partial<Rescue>);

const seedUser = async (userId = 'user-eager-1') =>
  User.create({
    userId,
    email: `${userId}@example.com`,
    password: 'hashed-password-meets-min-length',
    firstName: 'Eager',
    lastName: 'User',
    userType: UserType.ADOPTER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  } as Partial<User>);

describe('Eager-load regression tripwires (ADS-531 §1.4)', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  it('belongsTo with alias: Pet.findByPk includes its Rescue under the alias key', async () => {
    const rescue = await seedRescue();
    const pet = await Pet.create({
      petId: 'pet-eager-1',
      name: 'Mochi',
      rescueId: rescue.rescueId,
      type: PetType.DOG,
      status: PetStatus.AVAILABLE,
      gender: Gender.FEMALE,
      size: Size.SMALL,
      energyLevel: EnergyLevel.LOW,
    } as Partial<Pet>);

    const fetched = await Pet.findByPk(pet.petId, {
      include: [{ model: Rescue, as: 'Rescue', attributes: ['rescueId', 'name'] }],
    });

    expect(fetched).not.toBeNull();
    // Alias key must be present and populated — regressions in v7 around
    // mixin generation tend to surface as the association loading under
    // the model name ('Rescue') vs the alias.
    const loadedRescue = (fetched as Pet & { Rescue?: Rescue }).Rescue;
    expect(loadedRescue).toBeDefined();
    expect(loadedRescue?.rescueId).toBe(rescue.rescueId);
    expect(loadedRescue?.name).toBe('Eager Rescue');
  });

  it('hasMany inverse: Rescue.findByPk includes its Pets as an array under the alias', async () => {
    const rescue = await seedRescue();
    await Pet.bulkCreate([
      {
        petId: 'pet-eager-2',
        name: 'Bean',
        rescueId: rescue.rescueId,
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        gender: Gender.MALE,
        size: Size.SMALL,
        energyLevel: EnergyLevel.MEDIUM,
      },
      {
        petId: 'pet-eager-3',
        name: 'Toast',
        rescueId: rescue.rescueId,
        type: PetType.CAT,
        status: PetStatus.AVAILABLE,
        gender: Gender.FEMALE,
        size: Size.SMALL,
        energyLevel: EnergyLevel.LOW,
      },
    ] as Partial<Pet>[]);

    const fetched = await Rescue.findByPk(rescue.rescueId, {
      include: [{ model: Pet, as: 'Pets', attributes: ['petId', 'name'] }],
    });

    const loadedPets = (fetched as Rescue & { Pets?: Pet[] }).Pets;
    expect(Array.isArray(loadedPets)).toBe(true);
    expect(loadedPets).toHaveLength(2);
    expect(loadedPets?.map(p => p.name).sort()).toEqual(['Bean', 'Toast']);
  });

  it('belongsToMany through join table: User.findByPk includes Roles via UserRole', async () => {
    const user = await seedUser();
    const adminRole = await Role.create({
      name: 'admin',
      description: 'Administrator',
    } as Partial<Role>);
    await UserRole.create({
      userId: user.userId,
      roleId: adminRole.roleId,
    } as Partial<UserRole>);

    const fetched = await User.findByPk(user.userId, {
      include: [{ model: Role, as: 'Roles', through: { attributes: [] } }],
    });

    const loadedRoles = (fetched as User & { Roles?: Role[] }).Roles;
    expect(loadedRoles).toHaveLength(1);
    expect(loadedRoles?.[0]?.name).toBe('admin');
    // Through: { attributes: [] } strips the join row off the result.
    // Regression check: the UserRole join object must NOT appear under
    // the default `UserRole` key in v7.
    expect((loadedRoles?.[0] as Role & { UserRole?: unknown })?.UserRole).toBeUndefined();
  });

  it('nested two-level include: Application -> Pet -> Breed shape matches application.service', async () => {
    const rescue = await seedRescue();
    const user = await seedUser();
    const breed = await Breed.create({
      breed_id: 'breed-eager-1',
      name: 'Tabby',
      species: PetType.CAT,
    } as unknown as Partial<Breed>);
    const pet = await Pet.create({
      petId: 'pet-eager-4',
      name: 'Stripey',
      rescueId: rescue.rescueId,
      breedId: breed.breed_id,
      type: PetType.CAT,
      status: PetStatus.AVAILABLE,
      gender: Gender.MALE,
      size: Size.SMALL,
      energyLevel: EnergyLevel.MEDIUM,
    } as Partial<Pet>);
    const application = await Application.create({
      applicationId: 'app-eager-1',
      userId: user.userId,
      petId: pet.petId,
      rescueId: rescue.rescueId,
      // Use APPROVED to bypass the SUBMITTED-status consent gate; the
      // eager-load assertion only cares about include shape, not the
      // application's lifecycle state.
      status: ApplicationStatus.APPROVED,
      answers: {},
      documents: [],
    } as Partial<Application>);

    const fetched = await Application.findByPk(application.applicationId, {
      include: [
        {
          model: Pet,
          as: 'Pet',
          attributes: ['petId', 'name', 'breedId'],
          include: [{ model: Breed, as: 'Breed', attributes: ['breed_id', 'name'] }],
        },
      ],
    });

    const loadedPet = (fetched as Application & { Pet?: Pet & { Breed?: Breed } }).Pet;
    expect(loadedPet?.petId).toBe(pet.petId);
    expect(loadedPet?.Breed?.name).toBe('Tabby');
  });
});
