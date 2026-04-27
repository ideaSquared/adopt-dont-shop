import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Pet, { PetStatus } from '../../models/Pet';
import PetStatusTransition from '../../models/PetStatusTransition';
import Rescue from '../../models/Rescue';

/**
 * Pet status is owned by the transition log. Same dual-path setup as the
 * Application case (Postgres trigger / SQLite afterCreate hook). These
 * tests exercise the SQLite path; the Postgres path is verified manually
 * in the dev stack.
 */
describe('PetStatusTransition', () => {
  let rescueId: string;
  let petId: string;

  beforeEach(async () => {
    await sequelize.sync({ force: true });

    const rescue = await Rescue.create({
      name: 'Test Rescue',
      email: 'r@test.local',
      address: '1 Lane',
      city: 'Town',
      postcode: 'AB1 2CD',
      country: 'GB',
      contactPerson: 'X',
      status: 'pending',
    } as never);
    rescueId = rescue.rescueId;

    // Same array-column workaround as the Application transition test —
    // SQLite vs Postgres mismatch on Pet.tags. (Pet.images / .videos
    // were extracted to the pet_media table per plan 2.1.)
    petId = '22222222-2222-4222-a222-222222222222';
    await sequelize.getQueryInterface().bulkInsert('pets', [
      {
        pet_id: petId,
        name: 'Buddy',
        rescue_id: rescueId,
        type: 'dog',
        status: PetStatus.AVAILABLE,
        gender: 'male',
        age_group: 'adult',
        adoption_fee_minor: 0,
        adoption_fee_currency: 'GBP',
        archived: false,
        featured: false,
        priority_listing: false,
        special_needs: false,
        house_trained: false,
        view_count: 0,
        favorite_count: 0,
        application_count: 0,
        tags: '[]',
        created_at: new Date(),
        updated_at: new Date(),
        version: 0,
      },
    ]);
  });

  it('inserting a transition updates pets.status', async () => {
    await PetStatusTransition.create({
      petId,
      fromStatus: PetStatus.AVAILABLE,
      toStatus: PetStatus.PENDING,
      transitionedBy: null,
      reason: 'Application submitted',
    });

    const reloaded = await Pet.findByPk(petId);
    expect(reloaded?.status).toBe(PetStatus.PENDING);
  });

  it('preserves chronological history including operational pauses', async () => {
    await PetStatusTransition.create({
      petId,
      fromStatus: PetStatus.AVAILABLE,
      toStatus: PetStatus.MEDICAL_HOLD,
      transitionedBy: null,
      reason: 'Vet check needed',
    });
    await PetStatusTransition.create({
      petId,
      fromStatus: PetStatus.MEDICAL_HOLD,
      toStatus: PetStatus.AVAILABLE,
      transitionedBy: null,
      reason: 'Cleared by vet',
    });
    await PetStatusTransition.create({
      petId,
      fromStatus: PetStatus.AVAILABLE,
      toStatus: PetStatus.ADOPTED,
      transitionedBy: null,
    });

    const history = await PetStatusTransition.findAll({
      where: { petId },
      order: [['transitionedAt', 'ASC']],
    });
    expect(history.map(t => t.toStatus)).toEqual([
      PetStatus.MEDICAL_HOLD,
      PetStatus.AVAILABLE,
      PetStatus.ADOPTED,
    ]);

    const reloaded = await Pet.findByPk(petId);
    expect(reloaded?.status).toBe(PetStatus.ADOPTED);
  });
});
