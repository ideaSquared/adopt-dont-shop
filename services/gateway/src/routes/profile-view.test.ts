import { describe, expect, it } from 'vitest';

import {
  buildCompletionStatus,
  buildProfileCompletionResponse,
  buildQuickApplicationCapability,
  completionPercentage,
  missingSections,
  withPreferenceDefaults,
} from './profile-view.js';

const FULL_DEFAULTS = {
  personalInfo: { firstName: 'Ada' },
  livingSituation: { housingType: 'house' },
  petExperience: { experienceLevel: 'some' },
  references: { personal: [{ name: 'Grace' }] },
};

describe('missingSections / completionPercentage', () => {
  it('reports no missing sections and 100% for a fully-populated profile', () => {
    expect(missingSections(FULL_DEFAULTS)).toEqual([]);
    expect(completionPercentage(FULL_DEFAULTS)).toBe(100);
  });

  it('reports all four sections missing and 0% for an empty profile', () => {
    expect(missingSections({})).toEqual([
      'personalInfo',
      'livingSituation',
      'petExperience',
      'references',
    ]);
    expect(completionPercentage({})).toBe(0);
  });

  it('treats an empty object section as not filled', () => {
    expect(missingSections({ personalInfo: {} })).toContain('personalInfo');
  });

  it('reports a partial profile at the matching percentage', () => {
    expect(
      completionPercentage({ personalInfo: { firstName: 'Ada' }, livingSituation: { x: 1 } })
    ).toBe(50);
  });
});

describe('buildCompletionStatus', () => {
  it('marks every section true and recommends nothing when fully populated', () => {
    const status = buildCompletionStatus(FULL_DEFAULTS, '2026-06-01T00:00:00.000Z');
    expect(status.basic_info).toBe(true);
    expect(status.living_situation).toBe(true);
    expect(status.pet_experience).toBe(true);
    expect(status.references).toBe(true);
    expect(status.overall_percentage).toBe(100);
    expect(status.completed_sections).toEqual([
      'personalInfo',
      'livingSituation',
      'petExperience',
      'references',
    ]);
    expect(status.recommended_next_steps).toEqual([]);
    expect(status.last_updated).toBe('2026-06-01T00:00:00.000Z');
  });

  it('recommends completing each missing section', () => {
    const status = buildCompletionStatus({ personalInfo: { firstName: 'Ada' } }, null);
    expect(status.basic_info).toBe(true);
    expect(status.living_situation).toBe(false);
    expect(status.recommended_next_steps).toEqual([
      'Complete your living situation',
      'Complete your pet experience',
      'Complete your references',
    ]);
    expect(status.last_updated).toBeNull();
  });
});

describe('buildQuickApplicationCapability', () => {
  it('can proceed with a 5-minute estimate when the profile is complete', () => {
    const cap = buildQuickApplicationCapability(FULL_DEFAULTS);
    expect(cap.canProceed).toBe(true);
    expect(cap.completionPercentage).toBe(100);
    expect(cap.missingRequirements).toEqual([]);
    expect(cap.missingFields).toEqual([]);
    expect(cap.estimatedTimeMinutes).toBe(5);
  });

  it('cannot proceed and lists the missing sections when incomplete', () => {
    const cap = buildQuickApplicationCapability({ personalInfo: { firstName: 'Ada' } });
    expect(cap.canProceed).toBe(false);
    expect(cap.missingRequirements).toEqual(['livingSituation', 'petExperience', 'references']);
    expect(cap.missingFields).toEqual(['livingSituation', 'petExperience', 'references']);
    expect(cap.estimatedTimeMinutes).toBe(30);
  });

  it('floors the estimate at 10 minutes for a single missing section', () => {
    const cap = buildQuickApplicationCapability({
      personalInfo: { firstName: 'Ada' },
      livingSituation: { x: 1 },
      petExperience: { x: 1 },
    });
    expect(cap.estimatedTimeMinutes).toBe(10);
  });
});

describe('buildProfileCompletionResponse', () => {
  it('composes completionStatus + capability + prePopulationData into one response', () => {
    const res = buildProfileCompletionResponse(FULL_DEFAULTS, '2026-06-01T00:00:00.000Z');
    expect(res.canQuickApply).toBe(true);
    expect(res.missingFields).toEqual([]);
    expect(res.recommendations).toEqual([]);
    expect(res.prePopulationData).toBe(FULL_DEFAULTS);
  });

  it('surfaces missing fields and recommendations for an incomplete profile', () => {
    const res = buildProfileCompletionResponse({}, null);
    expect(res.canQuickApply).toBe(false);
    expect(res.missingFields).toEqual([
      'personalInfo',
      'livingSituation',
      'petExperience',
      'references',
    ]);
    expect(res.recommendations).toHaveLength(4);
  });
});

describe('withPreferenceDefaults', () => {
  it('fills in the default preference shape when nothing is stored', () => {
    expect(withPreferenceDefaults({})).toEqual({
      auto_populate: true,
      quick_apply_enabled: false,
      completion_reminders: true,
    });
  });

  it('overrides only the stored keys, leaving the rest at their defaults', () => {
    expect(withPreferenceDefaults({ quick_apply_enabled: true })).toEqual({
      auto_populate: true,
      quick_apply_enabled: true,
      completion_reminders: true,
    });
  });
});
