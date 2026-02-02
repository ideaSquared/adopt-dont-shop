import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { moderationValidation } from '../../validation/moderation.validation';

const runValidation = async (
  validators: ReturnType<typeof moderationValidation.getReports>,
  req: Partial<Request>
) => {
  const mockReq = {
    body: {},
    params: {},
    query: {},
    ...req,
  } as Request;

  for (const validator of validators) {
    await (validator as { run: (req: Request) => Promise<void> }).run(mockReq);
  }

  return validationResult(mockReq);
};

describe('Moderation Validation', () => {
  describe('getReports', () => {
    it('should pass with valid query parameters', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: {
          page: '1',
          limit: '10',
          status: 'pending',
          category: 'spam',
          severity: 'high',
        } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with no query parameters', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: {} as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject page exceeding maximum', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: { page: '1001' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.type === 'field' && e.path === 'page')).toBe(true);
    });

    it('should reject page less than 1', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: { page: '0' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject limit exceeding maximum', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: { limit: '101' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid status enum', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: { status: 'invalid_status' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid category enum', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: { category: 'invalid_category' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid date format', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: { dateFrom: 'not-a-date' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should accept valid ISO 8601 dates', async () => {
      const result = await runValidation(moderationValidation.getReports, {
        query: {
          dateFrom: '2024-01-01T00:00:00Z',
          dateTo: '2024-12-31T23:59:59Z',
        } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('getReportById', () => {
    it('should pass with valid UUID', async () => {
      const result = await runValidation(moderationValidation.getReportById, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid UUID', async () => {
      const result = await runValidation(moderationValidation.getReportById, {
        params: { reportId: 'not-a-uuid' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject empty reportId', async () => {
      const result = await runValidation(moderationValidation.getReportById, {
        params: { reportId: '' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('submitReport', () => {
    const validReport = {
      reportedEntityType: 'user',
      reportedEntityId: '550e8400-e29b-41d4-a716-446655440000',
      category: 'spam',
      title: 'Test Report Title',
      description: 'This is a test report description that is long enough',
    };

    it('should pass with valid report data', async () => {
      const result = await runValidation(moderationValidation.submitReport, {
        body: validReport,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid entity type', async () => {
      const result = await runValidation(moderationValidation.submitReport, {
        body: { ...validReport, reportedEntityType: 'invalid_type' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject non-UUID entity ID', async () => {
      const result = await runValidation(moderationValidation.submitReport, {
        body: { ...validReport, reportedEntityId: 'not-a-uuid' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid category', async () => {
      const result = await runValidation(moderationValidation.submitReport, {
        body: { ...validReport, category: 'not_a_category' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject title that is too short', async () => {
      const result = await runValidation(moderationValidation.submitReport, {
        body: { ...validReport, title: 'ab' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject description that is too short', async () => {
      const result = await runValidation(moderationValidation.submitReport, {
        body: { ...validReport, description: 'too short' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should accept optional reportedUserId when valid UUID', async () => {
      const result = await runValidation(moderationValidation.submitReport, {
        body: {
          ...validReport,
          reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid reportedUserId', async () => {
      const result = await runValidation(moderationValidation.submitReport, {
        body: { ...validReport, reportedUserId: 'not-uuid' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('updateReportStatus', () => {
    it('should pass with valid status update', async () => {
      const result = await runValidation(moderationValidation.updateReportStatus, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { status: 'resolved' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid report ID', async () => {
      const result = await runValidation(moderationValidation.updateReportStatus, {
        params: { reportId: 'bad-id' },
        body: { status: 'resolved' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid status value', async () => {
      const result = await runValidation(moderationValidation.updateReportStatus, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { status: 'invalid_status' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should accept valid resolution', async () => {
      const result = await runValidation(moderationValidation.updateReportStatus, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { status: 'resolved', resolution: 'warning_issued' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid resolution', async () => {
      const result = await runValidation(moderationValidation.updateReportStatus, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { status: 'resolved', resolution: 'invalid_resolution' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('bulkUpdateReports', () => {
    it('should pass with valid bulk update', async () => {
      const result = await runValidation(moderationValidation.bulkUpdateReports, {
        body: {
          reportIds: ['550e8400-e29b-41d4-a716-446655440000'],
          updates: { status: 'dismissed' },
        },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject empty reportIds array', async () => {
      const result = await runValidation(moderationValidation.bulkUpdateReports, {
        body: {
          reportIds: [],
          updates: { status: 'dismissed' },
        },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject reportIds array exceeding 50 items', async () => {
      const ids = Array.from({ length: 51 }, (_, i) =>
        `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
      );
      const result = await runValidation(moderationValidation.bulkUpdateReports, {
        body: {
          reportIds: ids,
          updates: { status: 'dismissed' },
        },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject non-UUID values in reportIds', async () => {
      const result = await runValidation(moderationValidation.bulkUpdateReports, {
        body: {
          reportIds: ['not-a-uuid'],
          updates: { status: 'dismissed' },
        },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('takeModerationAction', () => {
    const validAction = {
      targetEntityType: 'user',
      targetEntityId: '550e8400-e29b-41d4-a716-446655440000',
      actionType: 'warning_issued',
      severity: 'medium',
      reason: 'Violated community guidelines',
    };

    it('should pass with valid action data', async () => {
      const result = await runValidation(moderationValidation.takeModerationAction, {
        body: validAction,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid action type', async () => {
      const result = await runValidation(moderationValidation.takeModerationAction, {
        body: { ...validAction, actionType: 'invalid_action' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid severity', async () => {
      const result = await runValidation(moderationValidation.takeModerationAction, {
        body: { ...validAction, severity: 'extreme' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject reason that is too short', async () => {
      const result = await runValidation(moderationValidation.takeModerationAction, {
        body: { ...validAction, reason: 'ab' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject duration exceeding maximum', async () => {
      const result = await runValidation(moderationValidation.takeModerationAction, {
        body: { ...validAction, duration: 9000 },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should accept valid optional duration', async () => {
      const result = await runValidation(moderationValidation.takeModerationAction, {
        body: { ...validAction, duration: 24 },
      });

      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('assignReport', () => {
    it('should pass with valid UUIDs', async () => {
      const result = await runValidation(moderationValidation.assignReport, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { moderatorId: '660e8400-e29b-41d4-a716-446655440000' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid moderator ID', async () => {
      const result = await runValidation(moderationValidation.assignReport, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { moderatorId: 'not-uuid' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('escalateReport', () => {
    it('should pass with valid escalation data', async () => {
      const result = await runValidation(moderationValidation.escalateReport, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          escalatedTo: '660e8400-e29b-41d4-a716-446655440000',
          reason: 'Requires senior moderator review',
        },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject reason that is too short', async () => {
      const result = await runValidation(moderationValidation.escalateReport, {
        params: { reportId: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          escalatedTo: '660e8400-e29b-41d4-a716-446655440000',
          reason: 'ab',
        },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('getActiveActions', () => {
    it('should pass with valid userId filter', async () => {
      const result = await runValidation(moderationValidation.getActiveActions, {
        query: { userId: '550e8400-e29b-41d4-a716-446655440000' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid userId', async () => {
      const result = await runValidation(moderationValidation.getActiveActions, {
        query: { userId: 'not-uuid' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('getModerationMetrics', () => {
    it('should pass with valid date range', async () => {
      const result = await runValidation(moderationValidation.getModerationMetrics, {
        query: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          period: 'month',
        } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid period', async () => {
      const result = await runValidation(moderationValidation.getModerationMetrics, {
        query: { period: 'invalid_period' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });
  });
});
