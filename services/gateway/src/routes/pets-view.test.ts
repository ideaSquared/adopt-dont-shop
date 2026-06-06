import { describe, expect, it } from 'vitest';

import { PetsV1, type Pet } from '@adopt-dont-shop/proto';

import { listToEnvelope, petToView } from './pets-view.js';

function makePet(overrides: Partial<Pet> = {}): Pet {
  return {
    petId: 'pet-1',
    name: 'Rex',
    rescueId: 'rsc-1',
    type: PetsV1.PetType.PET_TYPE_DOG,
    status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
    gender: PetsV1.PetGender.PET_GENDER_MALE,
    size: PetsV1.PetSize.PET_SIZE_LARGE,
    ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
    archived: false,
    featured: true,
    priorityListing: false,
    specialNeeds: false,
    houseTrained: true,
    temperamentJson: '[]',
    tagsJson: '[]',
    extraJson: '{}',
    viewCount: 3,
    favoriteCount: 1,
    applicationCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-02T00:00:00.000Z',
    ...overrides,
  } as Pet;
}

describe('petToView', () => {
  it('renames fields to snake_case and lowercases the enum tokens', () => {
    const v = petToView(makePet());
    expect(v).toMatchObject({
      pet_id: 'pet-1',
      name: 'Rex',
      rescue_id: 'rsc-1',
      type: 'dog',
      status: 'available',
      gender: 'male',
      size: 'large',
      age_group: 'adult',
      featured: true,
      house_trained: true,
      view_count: 3,
    });
  });

  it('maps multi-word enum values to snake_case tokens', () => {
    const v = petToView(makePet({ status: PetsV1.PetStatus.PET_STATUS_MEDICAL_HOLD }));
    expect(v.status).toBe('medical_hold');
  });

  it('omits enum fields that are UNSPECIFIED', () => {
    const v = petToView(makePet({ status: PetsV1.PetStatus.PET_STATUS_UNSPECIFIED }));
    expect('status' in v).toBe(false);
  });

  it('parses the temperament/tags JSON arrays and unpacks extra_json long-tail', () => {
    const v = petToView(
      makePet({
        temperamentJson: '["calm","friendly"]',
        tagsJson: '["puppy"]',
        extraJson: '{"good_with_children":true,"vaccination_status":"up_to_date"}',
      })
    );
    expect(v.temperament).toEqual(['calm', 'friendly']);
    expect(v.tags).toEqual(['puppy']);
    expect(v.good_with_children).toBe(true);
    expect(v.vaccination_status).toBe('up_to_date');
  });

  it('lets core proto fields win over extra_json on conflict', () => {
    const v = petToView(makePet({ name: 'Rex', extraJson: '{"name":"STALE"}' }));
    expect(v.name).toBe('Rex');
  });

  it('formats adoption_fee from minor units', () => {
    const v = petToView(makePet({ adoptionFeeMinor: 12500 }));
    expect(v.adoption_fee).toBe('125.00');
  });
});

describe('listToEnvelope', () => {
  it('wraps pets in the { success, data, meta } envelope and surfaces hasNext from the cursor', () => {
    const env = listToEnvelope({
      pets: [makePet(), makePet({ petId: 'pet-2' })],
      nextCursor: 'abc',
    } as PetsV1.ListPetsResponse);
    expect(env.success).toBe(true);
    expect(env.data).toHaveLength(2);
    expect(env.data[0]).toMatchObject({ pet_id: 'pet-1', status: 'available' });
    expect(env.meta.hasNext).toBe(true);
    expect(env.meta.hasPrev).toBe(false);
  });

  it('reports hasNext false when there is no cursor', () => {
    const env = listToEnvelope({ pets: [makePet()] } as PetsV1.ListPetsResponse);
    expect(env.meta.hasNext).toBe(false);
  });
});
