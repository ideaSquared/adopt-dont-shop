import { describe, it, expect } from 'vitest';
import {
  USER_STATUSES,
  PET_STATUSES,
  PET_TYPES,
  PET_GENDERS,
  PET_SIZES,
  PET_AGE_GROUPS,
  PET_ENERGY_LEVELS,
  RESCUE_STATUSES,
  RESCUE_TYPES,
  APPLICATION_STATUSES,
  APPLICATION_STAGES,
  APPLICATION_PRIORITIES,
} from './domain-status';

describe('domain status value sets', () => {
  it('USER_STATUSES contains the canonical user states', () => {
    expect(USER_STATUSES).toEqual([
      'active',
      'inactive',
      'suspended',
      'pending_verification',
      'deactivated',
    ]);
  });

  it('PET_STATUSES covers the full pet lifecycle', () => {
    expect(PET_STATUSES).toContain('available');
    expect(PET_STATUSES).toContain('adopted');
    expect(PET_STATUSES).toContain('deceased');
    expect(PET_STATUSES).toHaveLength(10);
  });

  it('PET_TYPES includes common species and an "other" catch-all', () => {
    expect(PET_TYPES).toContain('dog');
    expect(PET_TYPES).toContain('cat');
    expect(PET_TYPES).toContain('other');
  });

  it('PET_GENDERS has exactly male, female and unknown', () => {
    expect(PET_GENDERS).toEqual(['male', 'female', 'unknown']);
  });

  it('PET_SIZES runs from extra_small to extra_large', () => {
    expect(PET_SIZES[0]).toBe('extra_small');
    expect(PET_SIZES[PET_SIZES.length - 1]).toBe('extra_large');
    expect(PET_SIZES).toHaveLength(5);
  });

  it('PET_AGE_GROUPS and PET_ENERGY_LEVELS expose expected members', () => {
    expect(PET_AGE_GROUPS).toEqual(['baby', 'young', 'adult', 'senior']);
    expect(PET_ENERGY_LEVELS).toEqual(['low', 'medium', 'high', 'very_high']);
  });

  it('RESCUE_STATUSES and RESCUE_TYPES describe rescue lifecycle and kind', () => {
    expect(RESCUE_STATUSES).toContain('pending');
    expect(RESCUE_STATUSES).toContain('verified');
    expect(RESCUE_TYPES).toEqual(['individual', 'organization']);
  });

  it('APPLICATION value sets cover statuses, stages and priorities', () => {
    expect(APPLICATION_STATUSES).toEqual(['submitted', 'approved', 'rejected', 'withdrawn']);
    expect(APPLICATION_STAGES).toContain('reviewing');
    expect(APPLICATION_STAGES).toContain('resolved');
    expect(APPLICATION_PRIORITIES).toEqual(['low', 'normal', 'high', 'urgent']);
  });

  it('every value set has unique members', () => {
    const sets = [
      USER_STATUSES,
      PET_STATUSES,
      PET_TYPES,
      PET_GENDERS,
      PET_SIZES,
      PET_AGE_GROUPS,
      PET_ENERGY_LEVELS,
      RESCUE_STATUSES,
      RESCUE_TYPES,
      APPLICATION_STATUSES,
      APPLICATION_STAGES,
      APPLICATION_PRIORITIES,
    ];
    for (const set of sets) {
      expect(new Set(set).size).toBe(set.length);
    }
  });
});
