import { describe, expect, it } from 'vitest';

import { PetsV1 } from '@adopt-dont-shop/proto';

import {
  ageGroupFromDb,
  ageGroupToDb,
  ALL_PET_STATUSES,
  ALL_PET_TYPES,
  genderFromDb,
  genderToDb,
  sizeFromDb,
  sizeToDb,
  statusFromDb,
  statusToDb,
  typeFromDb,
  typeToDb,
} from './enum-map.js';

describe('PetStatus enum mapping', () => {
  it.each(ALL_PET_STATUSES)('round-trips %s', db => {
    expect(statusToDb(statusFromDb(db))).toBe(db);
  });

  it('throws when given the UNSPECIFIED proto sentinel', () => {
    expect(() => statusToDb(PetsV1.PetStatus.PET_STATUS_UNSPECIFIED)).toThrowError();
  });

  it('throws on an unknown DB value', () => {
    expect(() => statusFromDb('not_a_status')).toThrowError();
  });

  it('proto-populated count matches the DB variant count', () => {
    const populated = Object.values(PetsV1.PetStatus).filter(v => typeof v === 'number' && v > 0);
    expect(populated).toHaveLength(ALL_PET_STATUSES.length);
  });
});

describe('PetType enum mapping', () => {
  it.each(ALL_PET_TYPES)('round-trips %s', db => {
    expect(typeToDb(typeFromDb(db))).toBe(db);
  });

  it('throws on the UNSPECIFIED sentinel and unknown DB value', () => {
    expect(() => typeToDb(PetsV1.PetType.PET_TYPE_UNSPECIFIED)).toThrowError();
    expect(() => typeFromDb('giraffe')).toThrowError();
  });

  it('proto-populated count matches the DB variant count', () => {
    const populated = Object.values(PetsV1.PetType).filter(v => typeof v === 'number' && v > 0);
    expect(populated).toHaveLength(ALL_PET_TYPES.length);
  });
});

describe('gender / size / age_group mapping', () => {
  it('round-trips gender values', () => {
    expect(genderFromDb('male')).toBe(PetsV1.PetGender.PET_GENDER_MALE);
    expect(genderToDb(PetsV1.PetGender.PET_GENDER_FEMALE)).toBe('female');
  });

  it('genderToDb defaults UNSPECIFIED to unknown (leave-as-default semantics)', () => {
    expect(genderToDb(PetsV1.PetGender.PET_GENDER_UNSPECIFIED)).toBe('unknown');
  });

  it('round-trips size values', () => {
    expect(sizeFromDb('extra_large')).toBe(PetsV1.PetSize.PET_SIZE_EXTRA_LARGE);
    expect(sizeToDb(PetsV1.PetSize.PET_SIZE_SMALL)).toBe('small');
  });

  it('sizeToDb defaults UNSPECIFIED to medium', () => {
    expect(sizeToDb(PetsV1.PetSize.PET_SIZE_UNSPECIFIED)).toBe('medium');
  });

  it('round-trips age_group values', () => {
    expect(ageGroupFromDb('senior')).toBe(PetsV1.PetAgeGroup.PET_AGE_GROUP_SENIOR);
    expect(ageGroupToDb(PetsV1.PetAgeGroup.PET_AGE_GROUP_BABY)).toBe('baby');
  });

  it('ageGroupToDb defaults UNSPECIFIED to adult', () => {
    expect(ageGroupToDb(PetsV1.PetAgeGroup.PET_AGE_GROUP_UNSPECIFIED)).toBe('adult');
  });

  it('throws on unknown DB values', () => {
    expect(() => genderFromDb('x')).toThrowError();
    expect(() => sizeFromDb('x')).toThrowError();
    expect(() => ageGroupFromDb('x')).toThrowError();
  });
});
