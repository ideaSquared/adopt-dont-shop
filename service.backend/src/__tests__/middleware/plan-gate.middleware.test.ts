import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../models/Rescue', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../models/User', () => ({
  UserType: {
    ADOPTER: 'adopter',
    RESCUE_STAFF: 'rescue_staff',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
  },
  default: {},
}));

vi.mock('../../config/plans', () => ({
  PLAN_LIMITS: {
    free: {
      maxStaffSeats: 5,
      maxActivePets: 25,
      analyticsHistoryDays: null,
      maxCustomQuestions: 0,
      features: [],
    },
    growth: {
      maxStaffSeats: 15,
      maxActivePets: 100,
      analyticsHistoryDays: 90,
      maxCustomQuestions: 5,
      features: ['analytics', 'reports'],
    },
    professional: {
      maxStaffSeats: null,
      maxActivePets: null,
      analyticsHistoryDays: 0,
      maxCustomQuestions: null,
      features: [
        'analytics',
        'analytics_export',
        'reports',
        'scheduled_reports',
        'custom_questions',
        'bulk_operations',
      ],
    },
  },
  PLAN_HIERARCHY: ['free', 'growth', 'professional'],
  meetsMinPlan: (candidate: string, min: string) => {
    const order = ['free', 'growth', 'professional'];
    return order.indexOf(candidate) >= order.indexOf(min);
  },
  planHasFeature: (plan: string, feature: string) => {
    const features: Record<string, string[]> = {
      free: [],
      growth: ['analytics', 'reports'],
      professional: [
        'analytics',
        'analytics_export',
        'reports',
        'scheduled_reports',
        'custom_questions',
        'bulk_operations',
      ],
    };
    return (features[plan] ?? []).includes(feature);
  },
}));

import type { Response, NextFunction } from 'express';
import { requirePlan, requirePlanFeature } from '../../middleware/plan-gate';
import type { AuthenticatedRequest } from '../../types/auth';
import Rescue from '../../models/Rescue';

const mockRescue = Rescue as unknown as { findByPk: ReturnType<typeof vi.fn> };

const makeReq = (
  overrides: Partial<AuthenticatedRequest['user']> = {}
): Partial<AuthenticatedRequest> => ({
  params: {},
  user: {
    userId: 'user-1',
    userType: 'rescue_staff',
    rescueId: 'rescue-1',
    ...overrides,
  } as AuthenticatedRequest['user'],
});

const makeRes = (): Partial<Response> => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe('Plan Gate Middleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    res = makeRes();
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('requirePlan', () => {
    describe('when user is not authenticated', () => {
      it('returns 401', async () => {
        const req = { params: {}, user: undefined } as Partial<AuthenticatedRequest>;
        await requirePlan('growth')(req as AuthenticatedRequest, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('when user is an admin', () => {
      it('bypasses the plan check', async () => {
        const req = makeReq({ userType: 'admin' });
        await requirePlan('professional')(req as AuthenticatedRequest, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(mockRescue.findByPk).not.toHaveBeenCalled();
      });
    });

    describe('when user has no rescue affiliation', () => {
      it('returns 403 with NO_RESCUE code', async () => {
        const req = makeReq({ rescueId: undefined });
        await requirePlan('growth')(req as AuthenticatedRequest, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_RESCUE' }));
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('when rescue plan does not meet minimum tier', () => {
      it('returns 403 with PLAN_UPGRADE_REQUIRED for free rescue accessing growth feature', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'free' });
        const req = makeReq();
        await requirePlan('growth')(req as AuthenticatedRequest, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'PLAN_UPGRADE_REQUIRED',
            currentPlan: 'free',
            requiredPlan: 'growth',
          })
        );
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 403 for growth rescue accessing professional feature', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'growth' });
        const req = makeReq();
        await requirePlan('professional')(req as AuthenticatedRequest, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'PLAN_UPGRADE_REQUIRED',
            currentPlan: 'growth',
            requiredPlan: 'professional',
          })
        );
      });
    });

    describe('when rescue plan meets minimum tier', () => {
      it('allows free rescue to access free-tier routes', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'free' });
        const req = makeReq();
        await requirePlan('free')(req as AuthenticatedRequest, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('allows growth rescue to access growth-tier routes', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'growth' });
        const req = makeReq();
        await requirePlan('growth')(req as AuthenticatedRequest, res as Response, next);
        expect(next).toHaveBeenCalled();
      });

      it('allows professional rescue to access growth-tier routes', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'professional' });
        const req = makeReq();
        await requirePlan('growth')(req as AuthenticatedRequest, res as Response, next);
        expect(next).toHaveBeenCalled();
      });
    });

    describe('when Rescue.findByPk throws', () => {
      it('returns 500', async () => {
        mockRescue.findByPk.mockRejectedValue(new Error('DB error'));
        const req = makeReq();
        await requirePlan('growth')(req as AuthenticatedRequest, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('requirePlanFeature', () => {
    describe('when user is an admin', () => {
      it('bypasses the feature check', async () => {
        const req = makeReq({ userType: 'admin' });
        await requirePlanFeature('custom_questions')(
          req as AuthenticatedRequest,
          res as Response,
          next
        );
        expect(next).toHaveBeenCalled();
        expect(mockRescue.findByPk).not.toHaveBeenCalled();
      });
    });

    describe('when feature is not available on current plan', () => {
      it('returns 403 for free rescue accessing analytics', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'free' });
        const req = makeReq();
        await requirePlanFeature('analytics')(req as AuthenticatedRequest, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'FEATURE_NOT_AVAILABLE',
            currentPlan: 'free',
            requiredFeature: 'analytics',
          })
        );
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 403 for growth rescue accessing custom_questions', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'growth' });
        const req = makeReq();
        await requirePlanFeature('custom_questions')(
          req as AuthenticatedRequest,
          res as Response,
          next
        );
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'FEATURE_NOT_AVAILABLE',
            currentPlan: 'growth',
            requiredFeature: 'custom_questions',
          })
        );
      });

      it('returns 403 for growth rescue accessing bulk_operations', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'growth' });
        const req = makeReq();
        await requirePlanFeature('bulk_operations')(
          req as AuthenticatedRequest,
          res as Response,
          next
        );
        expect(res.status).toHaveBeenCalledWith(403);
      });
    });

    describe('when feature is available on current plan', () => {
      it('allows growth rescue to access analytics', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'growth' });
        const req = makeReq();
        await requirePlanFeature('analytics')(req as AuthenticatedRequest, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('allows professional rescue to access custom_questions', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'professional' });
        const req = makeReq();
        await requirePlanFeature('custom_questions')(
          req as AuthenticatedRequest,
          res as Response,
          next
        );
        expect(next).toHaveBeenCalled();
      });

      it('allows professional rescue to access bulk_operations', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'professional' });
        const req = makeReq();
        await requirePlanFeature('bulk_operations')(
          req as AuthenticatedRequest,
          res as Response,
          next
        );
        expect(next).toHaveBeenCalled();
      });

      it('allows professional rescue to access reports', async () => {
        mockRescue.findByPk.mockResolvedValue({ plan: 'professional' });
        const req = makeReq();
        await requirePlanFeature('reports')(req as AuthenticatedRequest, res as Response, next);
        expect(next).toHaveBeenCalled();
      });
    });

    describe('when user has no rescue affiliation', () => {
      it('returns 403 with NO_RESCUE', async () => {
        const req = makeReq({ rescueId: undefined });
        await requirePlanFeature('analytics')(req as AuthenticatedRequest, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_RESCUE' }));
      });
    });
  });
});
