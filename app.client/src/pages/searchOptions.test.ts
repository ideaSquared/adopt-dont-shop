import { describe, expect, it } from 'vitest';
import {
  AGE_GROUPS,
  DISTANCE_OPTIONS,
  isKnownSortBy,
  isKnownSortOrder,
  PET_GENDERS,
  PET_SIZES,
  PET_STATUS,
  PET_TYPES,
  SORT_OPTIONS,
} from './searchOptions';

describe('search filter option lists', () => {
  const lists = {
    DISTANCE_OPTIONS,
    PET_TYPES,
    PET_SIZES,
    PET_GENDERS,
    AGE_GROUPS,
    PET_STATUS,
    SORT_OPTIONS,
  };

  it.each(Object.entries(lists))('%s has unique values and non-empty labels', (_, list) => {
    expect(list.length).toBeGreaterThan(0);
    const values = list.map(o => o.value);
    expect(new Set(values).size).toBe(values.length);
    for (const o of list) {
      expect(o.label.trim().length).toBeGreaterThan(0);
    }
  });

  it.each([
    'DISTANCE_OPTIONS',
    'PET_TYPES',
    'PET_SIZES',
    'PET_GENDERS',
    'AGE_GROUPS',
    'PET_STATUS',
  ])('%s starts with an "all/any" empty-string sentinel', name => {
    const list = (lists as Record<string, typeof DISTANCE_OPTIONS>)[name];
    expect(list[0].value).toBe('');
  });

  it('SORT_OPTIONS uses "field:order" format', () => {
    for (const o of SORT_OPTIONS) {
      expect(o.value).toMatch(/^[a-zA-Z]+:(asc|desc)$/);
    }
  });
});

describe('isKnownSortBy', () => {
  it('returns true for any prefix that matches a known sort option', () => {
    expect(isKnownSortBy('createdAt')).toBe(true);
    expect(isKnownSortBy('name')).toBe(true);
    expect(isKnownSortBy('ageYears')).toBe(true);
  });

  it('returns false for unknown or null values', () => {
    expect(isKnownSortBy(null)).toBe(false);
    expect(isKnownSortBy(undefined)).toBe(false);
    expect(isKnownSortBy('')).toBe(false);
    expect(isKnownSortBy('mystery')).toBe(false);
  });
});

describe('isKnownSortOrder', () => {
  it('returns true for "asc" and "desc"', () => {
    expect(isKnownSortOrder('asc')).toBe(true);
    expect(isKnownSortOrder('desc')).toBe(true);
  });

  it('returns false for anything else', () => {
    expect(isKnownSortOrder(null)).toBe(false);
    expect(isKnownSortOrder('ASC')).toBe(false);
    expect(isKnownSortOrder('forward')).toBe(false);
  });
});
