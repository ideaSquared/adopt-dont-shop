/**
 * Behaviour tests for ApplicationProfileService (application-profile.service).
 *
 * This service manages the user's saved application defaults and preferences
 * used for pre-populating adoption application forms (ADS-phase-1 plan).
 *
 * All Sequelize model calls are stubbed to keep tests fast and DB-independent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- model stubs -----------------------------------------------------------

const mockUserUpdate = vi.fn().mockResolvedValue(undefined);
const mockUserReload = vi.fn().mockResolvedValue(undefined);

const makeMockUser = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '07700000001',
  addressLine1: '1 Test Street',
  city: 'London',
  postalCode: 'SW1A 1AA',
  country: 'GB',
  applicationDefaults: null,
  profileCompletionStatus: null,
  updatedAt: new Date('2026-01-01'),
  update: mockUserUpdate,
  reload: mockUserReload,
  ...overrides,
});

vi.mock('../../models/User', () => ({
  default: { findByPk: vi.fn() },
}));

vi.mock('../../models/UserApplicationPrefs', () => {
  const mockPrefsRow = {
    auto_fill_profile: true,
    remember_answers: false,
    completion_reminders: true,
    update: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
  };
  return {
    default: {
      findOrCreate: vi.fn().mockResolvedValue([mockPrefsRow, false]),
    },
    __mockPrefsRow: mockPrefsRow,
  };
});

import User from '../../models/User';
import UserApplicationPrefs from '../../models/UserApplicationPrefs';
import { ApplicationProfileService } from '../../services/application-profile.service';

const mockFindByPk = User.findByPk as ReturnType<typeof vi.fn>;
const mockFindOrCreate = UserApplicationPrefs.findOrCreate as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockFindByPk.mockResolvedValue(makeMockUser());
  const mockPrefsRow = {
    auto_fill_profile: true,
    remember_answers: false,
    completion_reminders: true,
    update: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
  };
  mockFindOrCreate.mockResolvedValue([mockPrefsRow, false]);
  mockUserUpdate.mockResolvedValue(undefined);
});

describe('ApplicationProfileService.getApplicationDefaults', () => {
  it('throws when the user is not found', async () => {
    mockFindByPk.mockResolvedValueOnce(null);
    await expect(ApplicationProfileService.getApplicationDefaults('ghost')).rejects.toThrow(
      'User not found'
    );
  });

  it('returns null when no application defaults are set', async () => {
    mockFindByPk.mockResolvedValueOnce(makeMockUser({ applicationDefaults: null }));
    const result = await ApplicationProfileService.getApplicationDefaults('user-1');
    expect(result).toBeNull();
  });

  it('returns the stored application defaults', async () => {
    const defaults = { personalInfo: { firstName: 'Jane' } };
    mockFindByPk.mockResolvedValueOnce(makeMockUser({ applicationDefaults: defaults }));
    const result = await ApplicationProfileService.getApplicationDefaults('user-1');
    expect(result).toEqual(defaults);
  });
});

describe('ApplicationProfileService.getApplicationPreferences', () => {
  it('throws when the user is not found', async () => {
    mockFindByPk.mockResolvedValueOnce(null);
    await expect(ApplicationProfileService.getApplicationPreferences('ghost')).rejects.toThrow(
      'User not found'
    );
  });

  it('returns preferences in the API shape (auto_populate, quick_apply_enabled, completion_reminders)', async () => {
    const result = await ApplicationProfileService.getApplicationPreferences('user-1');
    expect(result).toHaveProperty('auto_populate');
    expect(result).toHaveProperty('quick_apply_enabled');
    expect(result).toHaveProperty('completion_reminders');
  });

  it('maps auto_fill_profile → auto_populate', async () => {
    const mockRow = {
      auto_fill_profile: true,
      remember_answers: false,
      completion_reminders: false,
      update: vi.fn(),
      reload: vi.fn(),
    };
    mockFindOrCreate.mockResolvedValueOnce([mockRow, false]);
    const result = await ApplicationProfileService.getApplicationPreferences('user-1');
    expect(result.auto_populate).toBe(true);
  });
});

describe('ApplicationProfileService.updateApplicationDefaults', () => {
  it('throws when the user is not found', async () => {
    mockFindByPk.mockResolvedValueOnce(null);
    await expect(
      ApplicationProfileService.updateApplicationDefaults('ghost', {
        applicationDefaults: {},
      })
    ).rejects.toThrow('User not found');
  });

  it('merges new defaults with existing defaults and persists', async () => {
    const existing = {
      personalInfo: { firstName: 'Jane', lastName: 'Doe' },
      livingSituation: { housingType: 'house' },
    };
    mockFindByPk.mockResolvedValueOnce(makeMockUser({ applicationDefaults: existing }));

    const result = await ApplicationProfileService.updateApplicationDefaults('user-1', {
      applicationDefaults: { personalInfo: { firstName: 'Janet' } },
    });

    expect(result.personalInfo?.firstName).toBe('Janet');
    // Surname was not in the update — it should survive the merge
    expect(result.personalInfo?.lastName).toBe('Doe');
    expect(mockUserUpdate).toHaveBeenCalled();
  });

  it('creates defaults from scratch when none existed before', async () => {
    mockFindByPk.mockResolvedValueOnce(makeMockUser({ applicationDefaults: null }));

    const result = await ApplicationProfileService.updateApplicationDefaults('user-1', {
      applicationDefaults: { personalInfo: { firstName: 'New' } },
    });

    expect(result.personalInfo?.firstName).toBe('New');
  });
});

describe('ApplicationProfileService.getPrePopulationData', () => {
  it('throws when the user is not found', async () => {
    mockFindByPk.mockResolvedValueOnce(null);
    await expect(ApplicationProfileService.getPrePopulationData('ghost')).rejects.toThrow(
      'User not found'
    );
  });

  it('merges user profile fields into personalInfo', async () => {
    const result = await ApplicationProfileService.getPrePopulationData('user-1');
    expect(result.personalInfo.firstName).toBe('Jane');
    expect(result.personalInfo.email).toBe('jane@example.com');
  });

  it('returns source = "profile_defaults"', async () => {
    const result = await ApplicationProfileService.getPrePopulationData('user-1');
    expect(result.source).toBe('profile_defaults');
  });

  it('includes a lastUpdated timestamp', async () => {
    const result = await ApplicationProfileService.getPrePopulationData('user-1');
    expect(result.lastUpdated).toBeInstanceOf(Date);
  });
});

describe('ApplicationProfileService.getProfileCompletion', () => {
  it('throws when the user is not found', async () => {
    mockFindByPk.mockResolvedValueOnce(null);
    await expect(ApplicationProfileService.getProfileCompletion('ghost')).rejects.toThrow(
      'User not found'
    );
  });

  it('returns a response with the correct shape', async () => {
    const result = await ApplicationProfileService.getProfileCompletion('user-1');
    expect(result).toHaveProperty('completionStatus');
    expect(result).toHaveProperty('canQuickApply');
    expect(result).toHaveProperty('missingFields');
    expect(result).toHaveProperty('recommendations');
  });

  it('canQuickApply is false when the profile is empty', async () => {
    // User with no applicationDefaults and no meaningful profile
    mockFindByPk.mockResolvedValueOnce(
      makeMockUser({
        applicationDefaults: null,
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: null,
        addressLine1: null,
        city: null,
        postalCode: null,
      })
    );
    const result = await ApplicationProfileService.getProfileCompletion('user-1');
    expect(result.canQuickApply).toBe(false);
  });

  it('missingFields is an array', async () => {
    const result = await ApplicationProfileService.getProfileCompletion('user-1');
    expect(Array.isArray(result.missingFields)).toBe(true);
  });
});

describe('ApplicationProfileService.processQuickApplication', () => {
  it('returns canProceed = true immediately when useDefaultData is false', async () => {
    const result = await ApplicationProfileService.processQuickApplication('user-1', {
      petId: 'pet-1',
      useDefaultData: false,
    });
    expect(result.canProceed).toBe(true);
    // No DB call needed when we skip defaults
    expect(mockFindByPk).not.toHaveBeenCalled();
  });

  it('returns canProceed = false with missingFields when profile is incomplete', async () => {
    // Minimal user with no applicationDefaults — profile cannot reach 80%
    mockFindByPk.mockResolvedValue(
      makeMockUser({
        applicationDefaults: null,
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: null,
        addressLine1: null,
        city: null,
        postalCode: null,
      })
    );
    const result = await ApplicationProfileService.processQuickApplication('user-1', {
      petId: 'pet-1',
      useDefaultData: true,
    });
    expect(result.canProceed).toBe(false);
    expect(Array.isArray(result.missingFields)).toBe(true);
    expect((result.missingFields ?? []).length).toBeGreaterThan(0);
  });
});
