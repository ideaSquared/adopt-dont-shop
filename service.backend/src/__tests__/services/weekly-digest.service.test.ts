/**
 * Behaviour tests for weekly-digest.service (ADS-631).
 *
 * All Sequelize models and the NotificationService are stubbed so we
 * can focus on payload shape, opt-in gating, and the "skip empty
 * digests" rule without booting a real database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/Pet', () => ({
  default: { findAll: vi.fn() },
  PetStatus: { AVAILABLE: 'available' },
}));
vi.mock('../../models/User', () => ({
  default: { findAll: vi.fn() },
  UserStatus: { ACTIVE: 'active' },
}));
vi.mock('../../models/UserFavorite', () => ({
  default: { findAll: vi.fn() },
}));
vi.mock('../../models/Application', () => ({
  default: { findAll: vi.fn() },
}));
vi.mock('../../models/UserNotificationPrefs', () => ({
  default: { findByPk: vi.fn() },
}));
vi.mock('../../models/Notification', () => ({
  NotificationType: { PET_AVAILABLE: 'pet_available' },
}));
vi.mock('../../services/notification.service', () => ({
  NotificationService: { createNotification: vi.fn() },
}));

import Application from '../../models/Application';
import Pet from '../../models/Pet';
import User from '../../models/User';
import UserFavorite from '../../models/UserFavorite';
import UserNotificationPrefs from '../../models/UserNotificationPrefs';
import { NotificationService } from '../../services/notification.service';
import {
  buildDigestPayload,
  isOptedIn,
  runWeeklyDigest,
  sendWeeklyDigestForUser,
  NEW_MATCHES_LIMIT,
  STILL_WAITING_LIMIT,
} from '../../services/weekly-digest.service';

const mockPetFindAll = Pet.findAll as unknown as ReturnType<typeof vi.fn>;
const mockUserFindAll = User.findAll as unknown as ReturnType<typeof vi.fn>;
const mockFavFindAll = UserFavorite.findAll as unknown as ReturnType<typeof vi.fn>;
const mockAppFindAll = Application.findAll as unknown as ReturnType<typeof vi.fn>;
const mockPrefsFindByPk = UserNotificationPrefs.findByPk as unknown as ReturnType<typeof vi.fn>;
const mockCreateNotification = NotificationService.createNotification as unknown as ReturnType<
  typeof vi.fn
>;

const makePet = (id: string, name: string) => ({ petId: id, name });

describe('weekly-digest.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isOptedIn', () => {
    it('returns false when prefs row is missing', () => {
      expect(isOptedIn(null)).toBe(false);
    });

    it('returns false when email channel is disabled', () => {
      const prefs = { email_enabled: false, pet_matches: true } as UserNotificationPrefs;
      expect(isOptedIn(prefs)).toBe(false);
    });

    it('returns false when pet_matches preference is disabled', () => {
      const prefs = { email_enabled: true, pet_matches: false } as UserNotificationPrefs;
      expect(isOptedIn(prefs)).toBe(false);
    });

    it('returns true only when both email and pet_matches are enabled', () => {
      const prefs = { email_enabled: true, pet_matches: true } as UserNotificationPrefs;
      expect(isOptedIn(prefs)).toBe(true);
    });
  });

  describe('buildDigestPayload', () => {
    it('returns null when user has neither new matches nor favourites', async () => {
      mockPetFindAll.mockResolvedValue([]);
      mockFavFindAll.mockResolvedValue([]);

      const payload = await buildDigestPayload('user-1');

      expect(payload).toBeNull();
    });

    it('builds payload with new matches and no still-waiting when user has no favourites', async () => {
      mockPetFindAll.mockResolvedValueOnce([makePet('p1', 'Rex'), makePet('p2', 'Mia')]);
      mockFavFindAll.mockResolvedValueOnce([]);

      const payload = await buildDigestPayload('user-1');

      expect(payload).toEqual({
        userId: 'user-1',
        newMatches: [
          { petId: 'p1', name: 'Rex' },
          { petId: 'p2', name: 'Mia' },
        ],
        stillWaiting: [],
      });
    });

    it('builds payload with still-waiting when user has un-applied favourites', async () => {
      mockPetFindAll
        .mockResolvedValueOnce([]) // new matches query
        .mockResolvedValueOnce([makePet('fav1', 'Buddy')]); // still-waiting query
      mockFavFindAll.mockResolvedValueOnce([
        { petId: 'fav1', userId: 'user-1' },
        { petId: 'fav2', userId: 'user-1' },
      ]);
      mockAppFindAll.mockResolvedValueOnce([{ petId: 'fav2' }]); // applied to fav2

      const payload = await buildDigestPayload('user-1');

      expect(payload).toEqual({
        userId: 'user-1',
        newMatches: [],
        stillWaiting: [{ petId: 'fav1', name: 'Buddy' }],
      });
    });

    it('excludes favourited pets the user has already applied for', async () => {
      mockPetFindAll
        .mockResolvedValueOnce([]) // new matches
        .mockResolvedValueOnce([]); // still-waiting
      mockFavFindAll.mockResolvedValueOnce([{ petId: 'applied-already', userId: 'user-1' }]);
      mockAppFindAll.mockResolvedValueOnce([{ petId: 'applied-already' }]);

      const payload = await buildDigestPayload('user-1');

      // All favourites have an application → still-waiting is empty AND
      // new-matches is empty → no digest at all.
      expect(payload).toBeNull();
    });

    it('respects the new-matches limit', async () => {
      mockPetFindAll.mockResolvedValueOnce([]);
      mockFavFindAll.mockResolvedValueOnce([]);

      await buildDigestPayload('user-1');

      const firstCall = mockPetFindAll.mock.calls[0][0];
      expect(firstCall.limit).toBe(NEW_MATCHES_LIMIT);
    });

    it('respects the still-waiting limit', async () => {
      mockPetFindAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockFavFindAll.mockResolvedValueOnce([{ petId: 'fav1', userId: 'user-1' }]);
      mockAppFindAll.mockResolvedValueOnce([]);

      await buildDigestPayload('user-1');

      const secondCall = mockPetFindAll.mock.calls[1][0];
      expect(secondCall.limit).toBe(STILL_WAITING_LIMIT);
    });
  });

  describe('sendWeeklyDigestForUser', () => {
    it('skips delivery when user is not opted-in', async () => {
      mockPrefsFindByPk.mockResolvedValue(null);

      const sent = await sendWeeklyDigestForUser('user-1');

      expect(sent).toBe(false);
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it('skips delivery when payload is empty even if opted-in', async () => {
      mockPrefsFindByPk.mockResolvedValue({
        email_enabled: true,
        pet_matches: true,
      });
      mockPetFindAll.mockResolvedValue([]);
      mockFavFindAll.mockResolvedValue([]);

      const sent = await sendWeeklyDigestForUser('user-1');

      expect(sent).toBe(false);
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it('creates a notification with the digest payload when there is data and opt-in is true', async () => {
      mockPrefsFindByPk.mockResolvedValue({
        email_enabled: true,
        pet_matches: true,
      });
      mockPetFindAll.mockResolvedValueOnce([makePet('p1', 'Rex')]);
      mockFavFindAll.mockResolvedValueOnce([]);
      mockCreateNotification.mockResolvedValue({ notification_id: 'n1' });

      const sent = await sendWeeklyDigestForUser('user-1');

      expect(sent).toBe(true);
      expect(mockCreateNotification).toHaveBeenCalledOnce();
      const arg = mockCreateNotification.mock.calls[0][0];
      expect(arg.userId).toBe('user-1');
      expect(arg.type).toBe('pet_available');
      expect(arg.title).toBe('Your weekly pet digest');
      expect(arg.data).toEqual({
        newMatches: [{ petId: 'p1', name: 'Rex' }],
        stillWaiting: [],
      });
    });
  });

  describe('runWeeklyDigest', () => {
    it('returns scan / send counts and continues past per-user failures', async () => {
      mockUserFindAll.mockResolvedValue([
        { userId: 'opted-in-with-data' },
        { userId: 'opted-out' },
        { userId: 'throws' },
      ]);

      mockPrefsFindByPk.mockImplementation(async (userId: string) => {
        if (userId === 'opted-out') {
          return null;
        }
        if (userId === 'throws') {
          throw new Error('db blew up');
        }
        return { email_enabled: true, pet_matches: true };
      });
      mockPetFindAll.mockResolvedValue([makePet('p1', 'Rex')]);
      mockFavFindAll.mockResolvedValue([]);
      mockCreateNotification.mockResolvedValue({ notification_id: 'n1' });

      const result = await runWeeklyDigest();

      expect(result).toEqual({ scanned: 3, sent: 1 });
    });
  });
});
