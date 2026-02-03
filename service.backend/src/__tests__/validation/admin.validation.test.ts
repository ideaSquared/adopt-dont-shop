import { describe, it, expect } from 'vitest';
import { Request } from 'express';
import { validationResult } from 'express-validator';
import { adminValidation } from '../../validation/admin.validation';

const runValidation = async (
  validators: ReturnType<typeof adminValidation.searchUsers>,
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

describe('Admin Validation', () => {
  describe('searchUsers', () => {
    it('should pass with valid search parameters', async () => {
      const result = await runValidation(adminValidation.searchUsers, {
        query: { page: '1', limit: '20', search: 'test' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject page exceeding maximum', async () => {
      const result = await runValidation(adminValidation.searchUsers, {
        query: { page: '1001' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject limit exceeding 100', async () => {
      const result = await runValidation(adminValidation.searchUsers, {
        query: { limit: '101' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid user status', async () => {
      const result = await runValidation(adminValidation.searchUsers, {
        query: { status: 'invalid' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('getUserDetails', () => {
    it('should pass with valid UUID', async () => {
      const result = await runValidation(adminValidation.getUserDetails, {
        params: { userId: '550e8400-e29b-41d4-a716-446655440000' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject non-UUID userId', async () => {
      const result = await runValidation(adminValidation.getUserDetails, {
        params: { userId: 'user-123' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('performUserAction', () => {
    it('should pass with valid user action', async () => {
      const result = await runValidation(adminValidation.performUserAction, {
        params: { userId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { action: 'suspend', reason: 'Violated terms of service' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid action type', async () => {
      const result = await runValidation(adminValidation.performUserAction, {
        params: { userId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { action: 'delete_permanently' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid userId', async () => {
      const result = await runValidation(adminValidation.performUserAction, {
        params: { userId: 'bad-id' },
        body: { action: 'suspend' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject duration exceeding maximum', async () => {
      const result = await runValidation(adminValidation.performUserAction, {
        params: { userId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { action: 'suspend', duration: 9000 },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('moderateRescue', () => {
    it('should pass with valid rescue moderation', async () => {
      const result = await runValidation(adminValidation.moderateRescue, {
        params: { rescueId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { action: 'approve' },
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid rescueId', async () => {
      const result = await runValidation(adminValidation.moderateRescue, {
        params: { rescueId: 'not-uuid' },
        body: { action: 'approve' },
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid moderation action', async () => {
      const result = await runValidation(adminValidation.moderateRescue, {
        params: { rescueId: '550e8400-e29b-41d4-a716-446655440000' },
        body: { action: 'destroy' },
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('getAuditLogs', () => {
    it('should pass with valid query parameters', async () => {
      const result = await runValidation(adminValidation.getAuditLogs, {
        query: {
          page: '1',
          limit: '50',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid date format', async () => {
      const result = await runValidation(adminValidation.getAuditLogs, {
        query: { startDate: 'yesterday' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('exportData', () => {
    it('should pass with valid export type', async () => {
      const result = await runValidation(adminValidation.exportData, {
        params: { type: 'users' },
        query: {} as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid export type', async () => {
      const result = await runValidation(adminValidation.exportData, {
        params: { type: 'secrets' },
        query: {} as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should reject invalid format', async () => {
      const result = await runValidation(adminValidation.exportData, {
        params: { type: 'users' },
        query: { format: 'xml' } as Record<string, string>,
      });

      expect(result.isEmpty()).toBe(false);
    });
  });
});
