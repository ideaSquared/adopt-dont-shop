import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Pet from '../../models/Pet';
import Rescue from '../../models/Rescue';

/**
 * Pet adoption fee as integer minor units + ISO 4217 currency code
 * (plan 3.2 / 5.5.8). The float DECIMAL is gone — no rounding
 * surprises, no implicit-currency ambiguity.
 */
describe('Pet.adoptionFee Money columns', () => {
  let rescueId: string;

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
      isDeleted: false,
    } as never);
    rescueId = rescue.rescueId;
  });

  let counter = 0;
  const insertPet = async (overrides: Record<string, unknown> = {}) => {
    counter += 1;
    const petId = `money-pet-${counter}`;
    await sequelize.getQueryInterface().bulkInsert('pets', [
      {
        pet_id: petId,
        name: 'Buddy',
        rescue_id: rescueId,
        type: 'dog',
        status: 'available',
        gender: 'male',
        size: 'medium',
        age_group: 'adult',
        archived: false,
        featured: false,
        priority_listing: false,
        special_needs: false,
        house_trained: false,
        view_count: 0,
        favorite_count: 0,
        application_count: 0,
        is_birth_date_estimate: false,
        images: '[]',
        videos: '[]',
        tags: '[]',
        created_at: new Date(),
        updated_at: new Date(),
        version: 0,
        ...overrides,
      },
    ]);
    const pet = await Pet.findByPk(petId);
    if (!pet) {
      throw new Error('failed to seed pet');
    }
    return pet;
  };

  it('returns Money from the minor-unit columns when present', async () => {
    const pet = await insertPet({
      adoption_fee_minor: 12_500,
      adoption_fee_currency: 'GBP',
    });
    expect(pet.getAdoptionFee()).toEqual({ amount: 12500, currency: 'GBP' });
  });

  it('returns null when no fee is recorded', async () => {
    const pet = await insertPet({ adoption_fee_minor: null });
    expect(pet.getAdoptionFee()).toBeNull();
  });

  it('defaults the currency to GBP when only minor units are set', async () => {
    const pet = await insertPet({
      adoption_fee_minor: 5000,
      adoption_fee_currency: null,
    });
    expect(pet.getAdoptionFee()).toEqual({ amount: 5000, currency: 'GBP' });
  });

  it('rejects a negative adoptionFeeMinor', async () => {
    const pet = await insertPet({});
    await expect(pet.update({ adoptionFeeMinor: -1 } as never)).rejects.toThrow(/adoptionFeeMinor/);
  });

  it('rejects a malformed currency code', async () => {
    const pet = await insertPet({});
    await expect(pet.update({ adoptionFeeCurrency: 'pound' } as never)).rejects.toThrow(/ISO 4217/);
  });
});
