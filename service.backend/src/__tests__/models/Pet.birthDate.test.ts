import { describe, expect, it, beforeEach } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import Pet from '../../models/Pet';
import Rescue from '../../models/Rescue';

/**
 * Pet.birthDate + isBirthDateEstimate (plan 3.1).
 *
 * The point of birthDate is that age computed from a fixed date doesn't
 * drift over time the way ageYears/ageMonths do. These tests pin down the
 * resulting display behaviour (preference, estimate prefix, fallback to
 * legacy fields, future-date rejection).
 *
 * Pets are inserted via raw queryInterface.bulkInsert to side-step the
 * SQLite/Postgres array column type mismatch (Pet.tags is STRING in
 * tests but ARRAY in prod) — same workaround used elsewhere.
 */
describe('Pet.birthDate + getAgeDisplay', () => {
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
    const petId = `birthdate-pet-${counter}`;
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
        adoption_fee: 0,
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

  it('prefers birthDate over ageYears/ageMonths when both are set', async () => {
    const now = new Date('2026-04-15');
    const pet = await insertPet({
      age_years: 8,
      age_months: 0,
      birth_date: '2024-04-15',
    });
    // 2024-04-15 → 2026-04-15 = exactly 24 months. The legacy 8-year
    // value should be ignored.
    expect(pet.getAgeInMonths(now)).toBe(24);
    expect(pet.getAgeDisplay(now)).toBe('2 years');
  });

  it('prefixes the estimate marker when isBirthDateEstimate is true', async () => {
    const now = new Date('2026-04-15');
    const pet = await insertPet({
      birth_date: '2025-01-15',
      is_birth_date_estimate: true,
    });
    expect(pet.getAgeDisplay(now)).toBe('~1 year, 3 months');
  });

  it('falls back to ageYears/ageMonths when birthDate is null', async () => {
    const pet = await insertPet({
      age_years: 3,
      age_months: 6,
      birth_date: null,
    });
    expect(pet.getAgeDisplay()).toBe('3 years, 6 months');
  });

  it('returns "Age unknown" when nothing is set', async () => {
    const pet = await insertPet({
      age_years: null,
      age_months: null,
      birth_date: null,
    });
    expect(pet.getAgeInMonths()).toBeNull();
    expect(pet.getAgeDisplay()).toBe('Age unknown');
  });

  it('handles a birthDate within the last month with the <1 month string', async () => {
    const now = new Date('2026-04-25');
    const pet = await insertPet({ birth_date: '2026-04-10' });
    expect(pet.getAgeInMonths(now)).toBe(0);
    expect(pet.getAgeDisplay(now)).toBe('<1 month');
  });

  it('rejects a future birth date via the model validator', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const pet = await insertPet({});
    await expect(pet.update({ birthDate: future } as never)).rejects.toThrow(
      /Birth date cannot be in the future/
    );
  });
});
