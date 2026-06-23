/**
 * Behavioural tests for ApplicationProfileService.
 *
 * The service pre-populates adoption applications from the user's saved
 * profile. We verify the endpoints it calls, how it unwraps/normalises the
 * backend payloads, and — importantly — its resilient fallbacks: several reads
 * must degrade gracefully (returning safe defaults) rather than throwing so the
 * application flow never breaks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiGet = vi.fn();
const apiPut = vi.fn();
const apiPost = vi.fn();

vi.mock('@/services', () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    put: (...args: unknown[]) => apiPut(...args),
    post: (...args: unknown[]) => apiPost(...args),
  },
}));

import { applicationProfileService } from './applicationProfileService';

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getApplicationDefaults', () => {
  it('unwraps the { data } envelope the gateway returns', async () => {
    const defaults = { personalInfo: { firstName: 'Ada' } };
    apiGet.mockResolvedValue({ data: defaults });

    const result = await applicationProfileService.getApplicationDefaults();

    expect(apiGet).toHaveBeenCalledWith('/api/v1/profile/application-defaults');
    expect(result).toEqual(defaults);
  });

  it('returns null instead of throwing when the request fails', async () => {
    apiGet.mockRejectedValue(new Error('500'));

    await expect(applicationProfileService.getApplicationDefaults()).resolves.toBeNull();
  });
});

describe('updateApplicationDefaults', () => {
  it('PUTs the wrapped defaults payload and unwraps the { data } response', async () => {
    const updated = { personalInfo: { firstName: 'Grace' } };
    apiPut.mockResolvedValue({ data: updated });

    const result = await applicationProfileService.updateApplicationDefaults({
      personalInfo: { firstName: 'Grace' },
    });

    expect(apiPut).toHaveBeenCalledWith('/api/v1/profile/application-defaults', {
      applicationDefaults: { personalInfo: { firstName: 'Grace' } },
    });
    expect(result).toEqual(updated);
  });
});

describe('getApplicationPreferences', () => {
  it('returns the backend preferences when provided', async () => {
    const prefs = { auto_populate: false, quick_apply_enabled: true, completion_reminders: false };
    apiGet.mockResolvedValue(prefs);

    await expect(applicationProfileService.getApplicationPreferences()).resolves.toEqual(prefs);
  });

  it('falls back to sensible defaults when the backend returns nothing', async () => {
    apiGet.mockResolvedValue(null);

    await expect(applicationProfileService.getApplicationPreferences()).resolves.toEqual({
      auto_populate: true,
      quick_apply_enabled: false,
      completion_reminders: true,
    });
  });
});

describe('updateApplicationPreferences', () => {
  it('PUTs the wrapped preferences payload', async () => {
    const prefs = { auto_populate: false, quick_apply_enabled: false, completion_reminders: true };
    apiPut.mockResolvedValue(prefs);

    await applicationProfileService.updateApplicationPreferences({ auto_populate: false });

    expect(apiPut).toHaveBeenCalledWith('/api/v1/profile/application-preferences', {
      applicationPreferences: { auto_populate: false },
    });
  });
});

describe('getProfileCompletion', () => {
  it('returns the completion response directly', async () => {
    const completion = { overall_percentage: 80 };
    apiGet.mockResolvedValue(completion);

    const result = await applicationProfileService.getProfileCompletion();

    expect(apiGet).toHaveBeenCalledWith('/api/v1/profile/completion');
    expect(result).toEqual(completion);
  });
});

describe('getPrePopulationData', () => {
  it('wraps a flat backend payload into the defaults/completion structure', async () => {
    apiGet.mockResolvedValue({
      personalInfo: { firstName: 'Ada' },
      livingSituation: { housingType: 'house' },
    });

    const result = await applicationProfileService.getPrePopulationData('pet-1');

    expect(apiGet).toHaveBeenCalledWith('/api/v1/profile/pre-population', {
      params: { petId: 'pet-1' },
    });
    expect(result.defaults.personalInfo).toEqual({ firstName: 'Ada' });
    expect(result.completionStatus.basic_info).toBe(true);
    expect(result.completionStatus.pet_experience).toBe(false);
    expect(result.quickApplicationCapability.canProceed).toBe(true);
  });

  it('omits the petId param when none is supplied', async () => {
    apiGet.mockResolvedValue({});

    await applicationProfileService.getPrePopulationData();

    expect(apiGet).toHaveBeenCalledWith('/api/v1/profile/pre-population', { params: {} });
  });

  it('returns safe fallback data when the request fails', async () => {
    apiGet.mockRejectedValue(new Error('boom'));

    const result = await applicationProfileService.getPrePopulationData('pet-1');

    expect(result.completionStatus.overall_percentage).toBe(0);
    expect(result.quickApplicationCapability.canProceed).toBe(false);
    expect(result.completionStatus.recommended_next_steps).toContain(
      'Complete your profile to enable quick applications'
    );
  });
});

describe('canUseQuickApplication', () => {
  it('reports the user can proceed when pre-population data is returned', async () => {
    apiPost.mockResolvedValue({
      prePopulationData: { defaults: { personalInfo: { firstName: 'Ada' } } },
    });

    const result = await applicationProfileService.canUseQuickApplication('pet-1');

    expect(apiPost).toHaveBeenCalledWith('/api/v1/profile/quick-application', {
      petId: 'pet-1',
      useDefaultData: true,
    });
    expect(result.canProceed).toBe(true);
    expect(result.completionPercentage).toBe(90);
  });

  it('surfaces the missing fields when the backend responds 400', async () => {
    apiPost.mockRejectedValue({
      response: { status: 400, data: { data: { missingFields: ['references'] } } },
    });

    const result = await applicationProfileService.canUseQuickApplication('pet-1');

    expect(result.canProceed).toBe(false);
    expect(result.missingFields).toEqual(['references']);
  });

  it('returns a generic non-proceed fallback for other errors', async () => {
    apiPost.mockRejectedValue(new Error('network'));

    const result = await applicationProfileService.canUseQuickApplication('pet-1');

    expect(result.canProceed).toBe(false);
    expect(result.missingRequirements).toContain('Unable to check profile completion');
  });
});
