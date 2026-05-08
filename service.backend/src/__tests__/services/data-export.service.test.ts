/**
 * Behaviour tests for data-export.service (GDPR Article 20 data portability).
 *
 * All Sequelize models are stubbed so we can focus on bundle-assembly
 * logic without a real database, and to verify that credential fields
 * (password, twoFactorSecret, etc.) are never included in the export.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal user JSON — includes safe fields AND sensitive fields that must
// be excluded.
const mockUserJson = {
  userId: 'user-export-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  emailVerified: true,
  phoneNumber: '07700900000',
  phoneVerified: false,
  dateOfBirth: '1815-12-10',
  profileImageUrl: null,
  bio: 'Mathematician',
  status: 'active',
  userType: 'adopter',
  lastLoginAt: new Date().toISOString(),
  timezone: 'UTC',
  language: 'en',
  country: 'GB',
  city: 'London',
  addressLine1: '10 Downing St',
  addressLine2: null,
  postalCode: 'SW1A 2AA',
  termsAcceptedAt: new Date().toISOString(),
  privacyPolicyAcceptedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  // Sensitive — must NOT appear in the bundle
  password: 'hashed-secret',
  twoFactorSecret: 'totp-secret',
  verificationToken: 'verify-me',
  resetToken: 'reset-me',
  applicationDefaults: {},
};

const mockUser = {
  toJSON: () => ({ ...mockUserJson }),
};

vi.mock('../../models/User', () => ({
  default: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../../models/Application', () => ({
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../models/ApplicationReference', () => ({
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../models/AuditLog', () => ({
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../models/EmailPreference', () => ({
  default: { findOne: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../models/Notification', () => ({
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../models/SwipeAction', () => ({
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../models/SwipeSession', () => ({
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../models/SupportTicket', () => ({
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../models/UserApplicationPrefs', () => ({
  default: { findOne: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../models/UserFavorite', () => ({
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../models/UserNotificationPrefs', () => ({
  default: { findOne: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../models/UserPrivacyPrefs', () => ({
  default: { findOne: vi.fn().mockResolvedValue(null) },
}));

import User from '../../models/User';
import { exportUserData } from '../../services/data-export.service';

const mockFindByPk = User.findByPk as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFindByPk.mockResolvedValue(mockUser);
});

describe('exportUserData', () => {
  it('throws when the user is not found', async () => {
    mockFindByPk.mockResolvedValueOnce(null);
    await expect(exportUserData('ghost-user')).rejects.toThrow('User not found');
  });

  it('returns a bundle with the correct userId', async () => {
    const bundle = await exportUserData('user-export-1');
    expect(bundle.userId).toBe('user-export-1');
  });

  it('includes a generatedAt ISO timestamp', async () => {
    const bundle = await exportUserData('user-export-1');
    expect(isNaN(Date.parse(bundle.generatedAt))).toBe(false);
  });

  it('includes safe profile fields', async () => {
    const bundle = await exportUserData('user-export-1');
    expect(bundle.profile.firstName).toBe('Ada');
    expect(bundle.profile.email).toBe('ada@example.com');
    expect(bundle.profile.userId).toBe('user-export-1');
  });

  it('excludes sensitive credential fields from the profile', async () => {
    const bundle = await exportUserData('user-export-1');
    expect(bundle.profile).not.toHaveProperty('password');
    expect(bundle.profile).not.toHaveProperty('twoFactorSecret');
    expect(bundle.profile).not.toHaveProperty('verificationToken');
    expect(bundle.profile).not.toHaveProperty('resetToken');
  });

  it('includes the preferences section with null values when no prefs exist', async () => {
    const bundle = await exportUserData('user-export-1');
    expect(bundle.preferences).toMatchObject({
      notifications: null,
      privacy: null,
      application: null,
      email: null,
    });
  });

  it('returns empty arrays for applications, favorites, and related data when none exist', async () => {
    const bundle = await exportUserData('user-export-1');
    expect(bundle.applications).toEqual([]);
    expect(bundle.favorites).toEqual([]);
    expect(bundle.swipeSessions).toEqual([]);
    expect(bundle.swipeActions).toEqual([]);
    expect(bundle.supportTickets).toEqual([]);
    expect(bundle.notifications).toEqual([]);
    expect(bundle.auditLogs).toEqual([]);
  });

  it('includes application references nested under their parent application', async () => {
    const mockApplication = {
      applicationId: 'app-1',
      userId: 'user-export-1',
      toJSON: () => ({ applicationId: 'app-1', userId: 'user-export-1' }),
    };
    const mockRef = {
      toJSON: () => ({ referenceId: 'ref-1', application_id: 'app-1' }),
    };

    const { default: ApplicationModel } = await import('../../models/Application');
    const { default: ApplicationReferenceModel } =
      await import('../../models/ApplicationReference');
    (ApplicationModel.findAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce([mockApplication]);
    (ApplicationReferenceModel.findAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      mockRef,
    ]);

    const bundle = await exportUserData('user-export-1');
    expect(bundle.applications).toHaveLength(1);
    expect(bundle.applications[0].references).toHaveLength(1);
    expect((bundle.applications[0].references[0] as Record<string, unknown>).referenceId).toBe(
      'ref-1'
    );
  });
});
