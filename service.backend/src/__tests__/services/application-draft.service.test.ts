import ApplicationDraft from '../../models/ApplicationDraft';
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
import Rescue from '../../models/Rescue';
import User, { UserStatus, UserType } from '../../models/User';
import { applicationDraftService } from '../../services/application-draft.service';

/**
 * Backend-synced application drafts (cross-app audit): last-write-wins
 * upsert per (user, pet), 30-day TTL, no cross-user leakage.
 */
describe('ApplicationDraftService', () => {
  let testCounter = 0;
  const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${testCounter++}`;

  const makeUser = async () =>
    User.create({
      userId: uniqueId('user'),
      email: `${uniqueId('e')}@test.com`,
      firstName: 'Drafty',
      lastName: 'McUser',
      password: 'hashed-password',
      userType: UserType.ADOPTER,
      emailVerified: true,
      status: UserStatus.ACTIVE,
    });

  const makePet = async (rescueId: string) =>
    Pet.create({
      petId: uniqueId('pet'),
      name: 'Draft Pet',
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
      rescueId,
      archived: false,
    });

  const makeRescue = async () =>
    Rescue.create({
      rescueId: uniqueId('rescue'),
      name: `Drafty Rescue ${testCounter}`,
      email: `${uniqueId('r')}@test.com`,
      address: '1 Drafty Lane',
      city: 'Drafton',
      postcode: 'DRA123',
      contactPerson: 'Drafty Person',
      status: 'verified',
      country: 'GB',
    });

  describe('getDraft', () => {
    it('returns null when the user has no draft for the pet', async () => {
      const user = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);

      const draft = await applicationDraftService.getDraft(user.userId, pet.petId);

      expect(draft).toBeNull();
    });

    it('returns the draft owned by the user for the pet', async () => {
      const user = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);
      await applicationDraftService.upsertDraft(user.userId, pet.petId, { name: 'Sam' });

      const draft = await applicationDraftService.getDraft(user.userId, pet.petId);

      expect(draft).not.toBeNull();
      expect(draft?.answers).toEqual({ name: 'Sam' });
    });

    it("does not return another user's draft for the same pet", async () => {
      const userA = await makeUser();
      const userB = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);
      await applicationDraftService.upsertDraft(userA.userId, pet.petId, { secret: 'A' });

      const draft = await applicationDraftService.getDraft(userB.userId, pet.petId);

      expect(draft).toBeNull();
    });
  });

  describe('upsertDraft', () => {
    it('creates a draft on first write and stamps an expires_at ~30 days out', async () => {
      const user = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);
      const before = Date.now();

      const draft = await applicationDraftService.upsertDraft(user.userId, pet.petId, {
        foo: 'bar',
      });

      expect(draft.answers).toEqual({ foo: 'bar' });
      expect(draft.expiresAt).not.toBeNull();
      const expiresMs = draft.expiresAt!.getTime();
      // Allow a generous window — the test runner is the only thing slowing
      // this down, and we just need to confirm it's ~30 days, not 1 day.
      const expectedMin = before + 29 * 24 * 60 * 60 * 1000;
      const expectedMax = before + 31 * 24 * 60 * 60 * 1000;
      expect(expiresMs).toBeGreaterThan(expectedMin);
      expect(expiresMs).toBeLessThan(expectedMax);
    });

    it('overwrites the previous answers blob (last-write-wins)', async () => {
      const user = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);
      await applicationDraftService.upsertDraft(user.userId, pet.petId, { step: 1, foo: 'x' });

      const updated = await applicationDraftService.upsertDraft(user.userId, pet.petId, {
        step: 2,
        bar: 'y',
      });

      // Whole blob replaced, no merge of the previous { foo: 'x' }.
      expect(updated.answers).toEqual({ step: 2, bar: 'y' });
      const rows = await ApplicationDraft.findAll({
        where: { userId: user.userId, petId: pet.petId },
      });
      expect(rows).toHaveLength(1);
    });

    it('keeps drafts for different (user, pet) pairs independent', async () => {
      const userA = await makeUser();
      const userB = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);

      await applicationDraftService.upsertDraft(userA.userId, pet.petId, { who: 'A' });
      await applicationDraftService.upsertDraft(userB.userId, pet.petId, { who: 'B' });

      const a = await applicationDraftService.getDraft(userA.userId, pet.petId);
      const b = await applicationDraftService.getDraft(userB.userId, pet.petId);
      expect(a?.answers).toEqual({ who: 'A' });
      expect(b?.answers).toEqual({ who: 'B' });
    });
  });

  describe('deleteDraft', () => {
    it('removes the draft and returns true', async () => {
      const user = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);
      await applicationDraftService.upsertDraft(user.userId, pet.petId, { x: 1 });

      const result = await applicationDraftService.deleteDraft(user.userId, pet.petId);

      expect(result).toBe(true);
      const after = await applicationDraftService.getDraft(user.userId, pet.petId);
      expect(after).toBeNull();
    });

    it('returns false when there is no draft to delete', async () => {
      const user = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);

      const result = await applicationDraftService.deleteDraft(user.userId, pet.petId);

      expect(result).toBe(false);
    });

    it("does not touch another user's draft for the same pet", async () => {
      const userA = await makeUser();
      const userB = await makeUser();
      const rescue = await makeRescue();
      const pet = await makePet(rescue.rescueId);
      await applicationDraftService.upsertDraft(userA.userId, pet.petId, { who: 'A' });
      await applicationDraftService.upsertDraft(userB.userId, pet.petId, { who: 'B' });

      await applicationDraftService.deleteDraft(userA.userId, pet.petId);

      const survivor = await applicationDraftService.getDraft(userB.userId, pet.petId);
      expect(survivor?.answers).toEqual({ who: 'B' });
    });
  });
});
