import { vi } from 'vitest';
import FosterPlacement from '../../models/FosterPlacement';
import Pet, {
  AgeGroup,
  EnergyLevel,
  Gender,
  PetStatus,
  PetType,
  Size,
  SpayNeuterStatus,
  VaccinationStatus,
} from '../../models/Pet';
import PetStatusTransition from '../../models/PetStatusTransition';
import Rescue from '../../models/Rescue';
import User, { UserStatus, UserType } from '../../models/User';
import { fosterService } from '../../services/foster.service';

// ADS-603: foster.service must keep Pet.status in sync with the placement
// lifecycle. createPlacement should flip status to FOSTER; endPlacement
// should restore AVAILABLE (or set ADOPTED when outcome is adopted_by_foster).
describe('FosterService - Pet.status sync (ADS-603)', () => {
  let testRescue: Rescue;
  let testFosterUser: User;
  let testActorId: string;
  let testCounter = 0;

  const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${testCounter++}`;

  beforeEach(async () => {
    const timestamp = Date.now();
    testRescue = await Rescue.create({
      rescueId: uniqueId('rescue'),
      name: `Foster Test Rescue ${timestamp}`,
      email: `foster-rescue-${timestamp}-${testCounter}@test.com`,
      address: '1 Foster Lane',
      city: 'Fostertown',
      postcode: 'FOST123',
      contactPerson: 'Foster Contact',
      status: 'verified',
      country: 'GB',
    });

    testFosterUser = await User.create({
      userId: uniqueId('foster-user'),
      email: `foster-user-${timestamp}-${testCounter}@test.com`,
      firstName: 'Foster',
      lastName: 'Carer',
      password: 'hashed-password',
      userType: UserType.ADOPTER,
      emailVerified: true,
      status: UserStatus.ACTIVE,
    });

    const actor = await User.create({
      userId: uniqueId('actor'),
      email: `actor-${timestamp}-${testCounter}@test.com`,
      firstName: 'Actor',
      lastName: 'Staff',
      password: 'hashed-password',
      userType: UserType.RESCUE_STAFF,
      emailVerified: true,
      status: UserStatus.ACTIVE,
    });
    testActorId = actor.userId;
  });

  const createAvailablePet = async (): Promise<Pet> =>
    Pet.create({
      petId: uniqueId('pet'),
      name: 'Foster Pet',
      type: PetType.DOG,
      status: PetStatus.AVAILABLE,
      breed: 'Mixed',
      size: Size.MEDIUM,
      ageGroup: AgeGroup.ADULT,
      gender: Gender.MALE,
      energyLevel: EnergyLevel.MEDIUM,
      vaccinationStatus: VaccinationStatus.UP_TO_DATE,
      spayNeuterStatus: SpayNeuterStatus.NEUTERED,
      featured: false,
      priorityListing: false,
      rescueId: testRescue.rescueId,
      archived: false,
    });

  describe('createPlacement', () => {
    it('flips the pet to FOSTER in the same transaction', async () => {
      const pet = await createAvailablePet();
      expect(pet.status).toBe(PetStatus.AVAILABLE);

      await fosterService.createPlacement(
        {
          petId: pet.petId,
          fosterUserId: testFosterUser.userId,
          rescueId: testRescue.rescueId,
          startDate: new Date(),
        },
        testActorId
      );

      const refreshed = await Pet.findByPk(pet.petId);
      expect(refreshed?.status).toBe(PetStatus.FOSTER);
    });

    it('rolls back the pet update and the placement when the transition write fails', async () => {
      const pet = await createAvailablePet();
      const originalStatus = pet.status;

      const createSpy = vi
        .spyOn(PetStatusTransition, 'create')
        .mockRejectedValueOnce(new Error('transition write failed'));

      await expect(
        fosterService.createPlacement(
          {
            petId: pet.petId,
            fosterUserId: testFosterUser.userId,
            rescueId: testRescue.rescueId,
            startDate: new Date(),
          },
          testActorId
        )
      ).rejects.toThrow('transition write failed');

      const refreshed = await Pet.findByPk(pet.petId);
      expect(refreshed?.status).toBe(originalStatus);

      const placements = await FosterPlacement.findAll({ where: { petId: pet.petId } });
      expect(placements).toHaveLength(0);

      createSpy.mockRestore();
    });
  });

  describe('endPlacement', () => {
    it('returns the pet to AVAILABLE when outcome is return_to_rescue', async () => {
      const pet = await createAvailablePet();
      const placement = await fosterService.createPlacement(
        {
          petId: pet.petId,
          fosterUserId: testFosterUser.userId,
          rescueId: testRescue.rescueId,
          startDate: new Date(),
        },
        testActorId
      );

      await fosterService.endPlacement(
        placement.placementId,
        { outcome: 'return_to_rescue' },
        testActorId
      );

      const refreshed = await Pet.findByPk(pet.petId);
      expect(refreshed?.status).toBe(PetStatus.AVAILABLE);
    });

    it('marks the pet ADOPTED when outcome is adopted_by_foster', async () => {
      const pet = await createAvailablePet();
      const placement = await fosterService.createPlacement(
        {
          petId: pet.petId,
          fosterUserId: testFosterUser.userId,
          rescueId: testRescue.rescueId,
          startDate: new Date(),
        },
        testActorId
      );

      await fosterService.endPlacement(
        placement.placementId,
        { outcome: 'adopted_by_foster' },
        testActorId
      );

      const refreshed = await Pet.findByPk(pet.petId);
      expect(refreshed?.status).toBe(PetStatus.ADOPTED);
    });

    it('returns the pet to AVAILABLE when outcome is cancelled', async () => {
      const pet = await createAvailablePet();
      const placement = await fosterService.createPlacement(
        {
          petId: pet.petId,
          fosterUserId: testFosterUser.userId,
          rescueId: testRescue.rescueId,
          startDate: new Date(),
        },
        testActorId
      );

      await fosterService.endPlacement(
        placement.placementId,
        { outcome: 'cancelled' },
        testActorId
      );

      const refreshed = await Pet.findByPk(pet.petId);
      expect(refreshed?.status).toBe(PetStatus.AVAILABLE);
    });
  });

  describe('list pagination', () => {
    const createPlacementForRescue = async () => {
      const pet = await createAvailablePet();
      return fosterService.createPlacement(
        {
          petId: pet.petId,
          fosterUserId: testFosterUser.userId,
          rescueId: testRescue.rescueId,
          startDate: new Date(),
        },
        testActorId
      );
    };

    it('caps the number of placements returned via limit', async () => {
      await createPlacementForRescue();
      await createPlacementForRescue();
      await createPlacementForRescue();

      const firstPage = await fosterService.list({ rescueId: testRescue.rescueId, limit: 2 });
      expect(firstPage).toHaveLength(2);

      const secondPage = await fosterService.list({
        rescueId: testRescue.rescueId,
        limit: 2,
        offset: 2,
      });
      expect(secondPage).toHaveLength(1);
    });
  });
});
