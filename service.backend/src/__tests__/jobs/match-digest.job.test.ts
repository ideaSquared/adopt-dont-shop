import { vi, beforeEach, describe, it, expect } from 'vitest';

/**
 * Defense-in-depth: the digest iterates AdopterMatchProfile rows
 * (which carry `notify_new_matches=true`) but the underlying User
 * may have been suspended or deleted since the profile was created.
 * The handler re-verifies the recipient User still exists and is
 * ACTIVE before sending a notification. No throw — a missing user
 * is an authorisation failure, not a transient error.
 */

vi.mock('../../lib/queue', () => ({
  isQueueAvailable: vi.fn(() => false),
  getReportsQueue: vi.fn(),
  buildWorker: vi.fn(),
}));

vi.mock('../../models/AdopterMatchProfile', () => ({
  __esModule: true,
  default: { findAll: vi.fn() },
}));

vi.mock('../../models/Pet', () => ({
  __esModule: true,
  default: { findAll: vi.fn(() => []) },
  PetStatus: { AVAILABLE: 'available' },
}));

vi.mock('../../models/Rescue', () => ({
  __esModule: true,
  default: {},
}));

vi.mock('../../models/Notification', () => ({
  NotificationType: { PET_AVAILABLE: 'pet_available' },
}));

vi.mock('../../models/User', () => ({
  __esModule: true,
  default: { findByPk: vi.fn() },
  UserStatus: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
    DEACTIVATED: 'deactivated',
  },
}));

vi.mock('../../matching', () => ({
  matchService: { rankPets: vi.fn(async () => []) },
}));

vi.mock('../../matching/config', () => ({
  loadMatchConfig: vi.fn(() => ({ digestEnabled: false })),
}));

vi.mock('../../services/notification.service', () => ({
  NotificationService: { createNotification: vi.fn().mockResolvedValue(undefined) },
}));

import AdopterMatchProfile from '../../models/AdopterMatchProfile';
import Pet from '../../models/Pet';
import User, { UserStatus } from '../../models/User';
import { matchService } from '../../matching';
import { NotificationService } from '../../services/notification.service';
import { runMatchDigest } from '../../jobs/match-digest.job';

const buildProfile = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'user-1',
  last_notified_at: null,
  min_notification_score: 0.5,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('runMatchDigest recipient re-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notifies when the profile owner is an active user', async () => {
    const profile = buildProfile();
    (AdopterMatchProfile.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([profile]);
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      status: UserStatus.ACTIVE,
    });
    (Pet.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([{ petId: 'pet-1', name: 'Rex' }]);
    (matchService.rankPets as ReturnType<typeof vi.fn>).mockResolvedValue([
      { petId: 'pet-1', score: 0.9 },
    ]);

    const result = await runMatchDigest();

    expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(result.notified).toBe(1);
  });

  it('skips notification when the profile owner has been deleted', async () => {
    const profile = buildProfile();
    (AdopterMatchProfile.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([profile]);
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await runMatchDigest();

    expect(NotificationService.createNotification).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });

  it('skips notification when the profile owner is suspended', async () => {
    const profile = buildProfile();
    (AdopterMatchProfile.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([profile]);
    (User.findByPk as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      status: UserStatus.SUSPENDED,
    });

    const result = await runMatchDigest();

    expect(NotificationService.createNotification).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });
});
