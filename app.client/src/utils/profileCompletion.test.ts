import { describe, it, expect } from 'vitest';
import {
  calculateProfileCompletion,
  PAWFECT_MATCH_PROFILE_THRESHOLD_PERCENT,
  PROFILE_COMPLETION_SECTIONS,
} from './profileCompletion';
import type { User } from '@adopt-dont-shop/lib.auth';

const baseUser: User = {
  userId: 'u-1',
  email: 'jane@example.org',
  firstName: 'Jane',
  lastName: 'Doe',
  emailVerified: true,
  userType: 'adopter',
  status: 'active',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('calculateProfileCompletion', () => {
  it('returns 0% for a null user', () => {
    const result = calculateProfileCompletion(null);
    expect(result.percent).toBe(0);
    expect(result.completedSections).toEqual([]);
    expect(result.incompleteSections).toEqual(PROFILE_COMPLETION_SECTIONS.map(s => s.key));
  });

  it('counts the basics section as complete once first/last name and email are set', () => {
    const result = calculateProfileCompletion(baseUser);
    expect(result.completedSections).toContain('basics');
  });

  it('counts the location section as complete once city + country are set', () => {
    const result = calculateProfileCompletion({ ...baseUser, city: 'London', country: 'GB' });
    expect(result.completedSections).toContain('location');
  });

  it('counts the profile section as complete once bio + profileImageUrl are set', () => {
    const result = calculateProfileCompletion({
      ...baseUser,
      bio: 'love dogs',
      profileImageUrl: 'https://cdn/profile.jpg',
    });
    expect(result.completedSections).toContain('profile');
  });

  it('counts the preferences section as complete once petTypes + maxDistance are set', () => {
    const result = calculateProfileCompletion({
      ...baseUser,
      preferences: { petTypes: ['dog'], maxDistance: 25 },
    });
    expect(result.completedSections).toContain('preferences');
  });

  it('rejects the preferences section when petTypes is empty', () => {
    const result = calculateProfileCompletion({
      ...baseUser,
      preferences: { petTypes: [], maxDistance: 25 },
    });
    expect(result.incompleteSections).toContain('preferences');
  });

  it('returns 100% when every section is satisfied', () => {
    const result = calculateProfileCompletion({
      ...baseUser,
      city: 'London',
      country: 'GB',
      bio: 'love dogs',
      profileImageUrl: 'https://cdn/profile.jpg',
      preferences: { petTypes: ['dog'], maxDistance: 25 },
    });
    expect(result.percent).toBe(100);
    expect(result.incompleteSections).toEqual([]);
  });
});

describe('PAWFECT_MATCH_PROFILE_THRESHOLD_PERCENT', () => {
  it('is set to the documented 80% cutoff for Pawfect Match gating', () => {
    expect(PAWFECT_MATCH_PROFILE_THRESHOLD_PERCENT).toBe(80);
  });
});
