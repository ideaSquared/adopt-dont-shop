import { describe, expect, it } from 'vitest';

import { PetsV1, type Pet } from '@adopt-dont-shop/proto';

import {
  listToEnvelope,
  petToView,
  viewToCreateRequest,
  viewToUpdateRequest,
} from './pets-view.js';

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

describe('viewToCreateRequest', () => {
  it('maps the frontend snake_case/token payload to the proto request', () => {
    const req = viewToCreateRequest({
      name: 'Rex',
      rescue_id: 'rsc-1',
      type: 'dog',
      gender: 'male',
      size: 'large',
      age_group: 'adult',
      short_description: 'good boy',
      age_years: 3,
      house_trained: true,
      temperament: ['friendly', 'calm'],
      tags: ['puppy'],
      adoption_fee: '125.00',
      good_with_children: true,
      vaccination_status: 'up_to_date',
    });
    expect(req).toMatchObject({
      name: 'Rex',
      rescueId: 'rsc-1',
      type: PetsV1.PetType.PET_TYPE_DOG,
      gender: PetsV1.PetGender.PET_GENDER_MALE,
      size: PetsV1.PetSize.PET_SIZE_LARGE,
      ageGroup: PetsV1.PetAgeGroup.PET_AGE_GROUP_ADULT,
      shortDescription: 'good boy',
      ageYears: 3,
      houseTrained: true,
      temperamentJson: '["friendly","calm"]',
      tagsJson: '["puppy"]',
      adoptionFeeMinor: 12500,
    });
    // long-tail fields the core message lacks go into extra_json.
    expect(JSON.parse(req.extraJson)).toEqual({
      good_with_children: true,
      vaccination_status: 'up_to_date',
    });
  });

  it('accepts the SCREAMING proto enum form too, and unknown → UNSPECIFIED', () => {
    expect(viewToCreateRequest({ type: 'PET_TYPE_CAT' }).type).toBe(PetsV1.PetType.PET_TYPE_CAT);
    expect(viewToCreateRequest({ type: 'platypus' }).type).toBe(
      PetsV1.PetType.PET_TYPE_UNSPECIFIED
    );
  });
});

describe('viewToUpdateRequest', () => {
  it('sets only the supplied fields (partial)', () => {
    const req = viewToUpdateRequest('pet-1', { name: 'Rexy', featured: true });
    expect(req.petId).toBe('pet-1');
    expect(req.name).toBe('Rexy');
    expect(req.featured).toBe(true);
    // not supplied → left unset
    expect(req.size).toBeUndefined();
    expect(req.shortDescription).toBeUndefined();
  });

  it('packs unknown fields into extra_json and maps enum tokens when present', () => {
    const req = viewToUpdateRequest('pet-1', { size: 'small', medical_notes: 'none' });
    expect(req.size).toBe(PetsV1.PetSize.PET_SIZE_SMALL);
    expect(JSON.parse(req.extraJson ?? '{}')).toEqual({ medical_notes: 'none' });
  });
});
