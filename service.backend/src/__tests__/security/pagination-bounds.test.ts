import { vi } from 'vitest';
import { Response } from 'express';

// Mocks must be hoisted before imports.
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn() },
}));

vi.mock('../../services/notification.service', () => ({
  NotificationService: {
    getUserNotifications: vi.fn(),
  },
}));

vi.mock('../../matching', () => ({
  matchService: {
    isEnabled: vi.fn(() => true),
    rankPets: vi.fn(async () => []),
  },
}));

vi.mock('../../models/Pet', () => {
  return {
    default: { findAll: vi.fn(async () => []) },
    PetStatus: { AVAILABLE: 'available' },
  };
});

vi.mock('../../models/PetMedia', () => ({
  default: {},
  PetMediaType: { IMAGE: 'image' },
}));

vi.mock('../../models/Breed', () => ({ default: {} }));
vi.mock('../../models/Rescue', () => ({ default: {} }));
vi.mock('../../models/AdopterMatchProfile', () => ({
  default: { findByPk: vi.fn() },
}));

vi.mock('../../services/security.service', () => ({
  default: {
    listSessions: vi.fn(),
    getLoginHistory: vi.fn(),
    getSuspiciousActivity: vi.fn(),
  },
}));

import { MatchController } from '../../controllers/match.controller';
import { NotificationController } from '../../controllers/notification.controller';
import { SecurityController } from '../../controllers/security.controller';
import { NotificationService } from '../../services/notification.service';
import SecurityService from '../../services/security.service';
import Pet from '../../models/Pet';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../constants/pagination';
import { AuthenticatedRequest } from '../../types/auth';

const mockUser = { userId: 'user-1' } as AuthenticatedRequest['user'];

const mockRes = (): Partial<Response> => ({
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
});

/**
 * The express-validator declared on each route ALREADY rejects out-of-range
 * limits with a 400. These tests exercise the controller directly (no route
 * middleware) to verify the in-controller cap acts as defense-in-depth: if
 * any future refactor removes or misconfigures the validator, the service
 * layer must still receive a bounded limit.
 */
describe('Pagination bounds — defense-in-depth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Pet.findAll).mockResolvedValue([]);
  });

  describe('MatchController.getTopPicks', () => {
    const MAX_TOP_PICKS = 50;
    const DEFAULT_TOP_PICKS = 10;

    const buildReq = (limit?: string) =>
      ({
        user: mockUser,
        query: limit === undefined ? {} : { limit },
      }) as unknown as AuthenticatedRequest;

    it('caps an oversized limit at the maximum allowed value', async () => {
      const req = buildReq('999999');
      const res = mockRes();

      await MatchController.getTopPicks(req, res as Response);

      const [args] = vi.mocked(Pet.findAll).mock.calls[0];
      // candidate pool is limit * 5; verifying the input limit was capped
      expect(args?.limit).toBe(MAX_TOP_PICKS * 5);
    });

    it('honours a valid in-range limit', async () => {
      const req = buildReq('10');
      const res = mockRes();

      await MatchController.getTopPicks(req, res as Response);

      const [args] = vi.mocked(Pet.findAll).mock.calls[0];
      expect(args?.limit).toBe(10 * 5);
    });

    it('uses the default limit when none is provided', async () => {
      const req = buildReq();
      const res = mockRes();

      await MatchController.getTopPicks(req, res as Response);

      const [args] = vi.mocked(Pet.findAll).mock.calls[0];
      expect(args?.limit).toBe(DEFAULT_TOP_PICKS * 5);
    });
  });

  describe('NotificationController.getUserNotifications', () => {
    const NOTIFICATION_MAX = 100;

    const buildReq = (limit?: string) =>
      ({
        user: mockUser,
        query: limit === undefined ? {} : { limit },
      }) as unknown as AuthenticatedRequest;

    beforeEach(() => {
      vi.mocked(NotificationService.getUserNotifications).mockResolvedValue({
        notifications: [],
        pagination: { page: 1, limit: 20, total: 0 },
      } as unknown as Awaited<ReturnType<typeof NotificationService.getUserNotifications>>);
    });

    it('caps an oversized limit at 100', async () => {
      const controller = new NotificationController();
      const req = buildReq('999999');
      const res = mockRes();

      await controller.getUserNotifications(req, res as Response);

      const [, options] = vi.mocked(NotificationService.getUserNotifications).mock.calls[0];
      expect(options?.limit).toBe(NOTIFICATION_MAX);
    });

    it('honours a valid in-range limit', async () => {
      const controller = new NotificationController();
      const req = buildReq('25');
      const res = mockRes();

      await controller.getUserNotifications(req, res as Response);

      const [, options] = vi.mocked(NotificationService.getUserNotifications).mock.calls[0];
      expect(options?.limit).toBe(25);
    });

    it('uses the default page size when no limit is provided', async () => {
      const controller = new NotificationController();
      const req = buildReq();
      const res = mockRes();

      await controller.getUserNotifications(req, res as Response);

      const [, options] = vi.mocked(NotificationService.getUserNotifications).mock.calls[0];
      expect(options?.limit).toBe(DEFAULT_PAGE_SIZE);
    });
  });

  describe('SecurityController.listSessions', () => {
    const buildReq = (limit?: string) =>
      ({
        user: mockUser,
        query: limit === undefined ? {} : { limit },
      }) as unknown as AuthenticatedRequest;

    beforeEach(() => {
      vi.mocked(SecurityService.listSessions).mockResolvedValue({
        sessions: [],
        total: 0,
        page: 1,
        totalPages: 1,
      });
    });

    it('caps an oversized limit at MAX_PAGE_SIZE', async () => {
      const req = buildReq('999999');
      const res = mockRes();

      await SecurityController.listSessions(req, res as Response);

      const [args] = vi.mocked(SecurityService.listSessions).mock.calls[0];
      expect(args?.limit).toBe(MAX_PAGE_SIZE);
    });

    it('honours a valid in-range limit', async () => {
      const req = buildReq('25');
      const res = mockRes();

      await SecurityController.listSessions(req, res as Response);

      const [args] = vi.mocked(SecurityService.listSessions).mock.calls[0];
      expect(args?.limit).toBe(25);
    });

    it('passes undefined limit when none is provided, letting the service use its default', async () => {
      const req = buildReq();
      const res = mockRes();

      await SecurityController.listSessions(req, res as Response);

      const [args] = vi.mocked(SecurityService.listSessions).mock.calls[0];
      expect(args?.limit).toBeUndefined();
    });

    it('clamps a limit of zero up to 1', async () => {
      const req = buildReq('0');
      const res = mockRes();

      await SecurityController.listSessions(req, res as Response);

      const [args] = vi.mocked(SecurityService.listSessions).mock.calls[0];
      expect(args?.limit).toBe(1);
    });
  });

  describe('SecurityController.getLoginHistory', () => {
    const buildReq = (limit?: string) =>
      ({
        user: mockUser,
        query: limit === undefined ? {} : { limit },
      }) as unknown as AuthenticatedRequest;

    beforeEach(() => {
      vi.mocked(SecurityService.getLoginHistory).mockResolvedValue({
        entries: [],
        total: 0,
        page: 1,
        totalPages: 1,
      });
    });

    it('caps an oversized limit at MAX_PAGE_SIZE', async () => {
      const req = buildReq('999999');
      const res = mockRes();

      await SecurityController.getLoginHistory(req, res as Response);

      const [args] = vi.mocked(SecurityService.getLoginHistory).mock.calls[0];
      expect(args?.limit).toBe(MAX_PAGE_SIZE);
    });

    it('honours a valid in-range limit', async () => {
      const req = buildReq('20');
      const res = mockRes();

      await SecurityController.getLoginHistory(req, res as Response);

      const [args] = vi.mocked(SecurityService.getLoginHistory).mock.calls[0];
      expect(args?.limit).toBe(20);
    });

    it('passes undefined limit when none is provided, letting the service use its default', async () => {
      const req = buildReq();
      const res = mockRes();

      await SecurityController.getLoginHistory(req, res as Response);

      const [args] = vi.mocked(SecurityService.getLoginHistory).mock.calls[0];
      expect(args?.limit).toBeUndefined();
    });
  });

  describe('SecurityController.getSuspiciousActivity', () => {
    const buildReq = (query: { failureThreshold?: string; windowHours?: string } = {}) =>
      ({
        user: mockUser,
        query,
      }) as unknown as AuthenticatedRequest;

    beforeEach(() => {
      vi.mocked(SecurityService.getSuspiciousActivity).mockResolvedValue([]);
    });

    it('clamps windowHours at the 720-hour ceiling', async () => {
      const req = buildReq({ windowHours: '99999' });
      const res = mockRes();

      await SecurityController.getSuspiciousActivity(req, res as Response);

      const [args] = vi.mocked(SecurityService.getSuspiciousActivity).mock.calls[0];
      expect(args?.windowHours).toBe(720);
    });

    it('clamps failureThreshold up to minimum 1', async () => {
      const req = buildReq({ failureThreshold: '0' });
      const res = mockRes();

      await SecurityController.getSuspiciousActivity(req, res as Response);

      const [args] = vi.mocked(SecurityService.getSuspiciousActivity).mock.calls[0];
      expect(args?.failureThreshold).toBe(1);
    });

    it('honours valid in-range params', async () => {
      const req = buildReq({ failureThreshold: '5', windowHours: '48' });
      const res = mockRes();

      await SecurityController.getSuspiciousActivity(req, res as Response);

      const [args] = vi.mocked(SecurityService.getSuspiciousActivity).mock.calls[0];
      expect(args?.failureThreshold).toBe(5);
      expect(args?.windowHours).toBe(48);
    });

    it('passes undefined params when none are provided', async () => {
      const req = buildReq();
      const res = mockRes();

      await SecurityController.getSuspiciousActivity(req, res as Response);

      const [args] = vi.mocked(SecurityService.getSuspiciousActivity).mock.calls[0];
      expect(args?.failureThreshold).toBeUndefined();
      expect(args?.windowHours).toBeUndefined();
    });
  });
});
