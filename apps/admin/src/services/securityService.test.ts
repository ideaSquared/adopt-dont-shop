import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import { securityService } from './securityService';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SecurityService', () => {
  describe('listSessions', () => {
    it('calls the sessions endpoint with provided filters', async () => {
      const paginated = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      mockGet.mockResolvedValueOnce(paginated);

      const result = await securityService.listSessions({ userId: 'u1', page: 2, limit: 5 });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/security/sessions', {
        userId: 'u1',
        page: 2,
        limit: 5,
      });
      expect(result).toEqual(paginated);
    });

    it('defaults to empty filters', async () => {
      const paginated = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      mockGet.mockResolvedValueOnce(paginated);

      await securityService.listSessions();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/security/sessions', {});
    });
  });

  describe('revokeSession', () => {
    it('calls DELETE on the correct session endpoint', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      await securityService.revokeSession('sess-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/admin/security/sessions/sess-1');
    });
  });

  describe('revokeAllUserSessions', () => {
    it('calls DELETE on the user sessions endpoint and unwraps the response', async () => {
      mockDelete.mockResolvedValueOnce({ data: { revokedCount: 3 } });

      const result = await securityService.revokeAllUserSessions('u1');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/admin/security/users/u1/sessions');
      expect(result).toEqual({ revokedCount: 3 });
    });
  });

  describe('listIpRules', () => {
    it('fetches IP rules and unwraps the data envelope', async () => {
      const rules = [
        {
          ipRuleId: 'r1',
          type: 'block' as const,
          cidr: '10.0.0.0/8',
          label: 'test',
          isActive: true,
          expiresAt: null,
          createdBy: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockGet.mockResolvedValueOnce({ data: rules });

      const result = await securityService.listIpRules();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/security/ip-rules');
      expect(result).toEqual(rules);
    });
  });

  describe('createIpRule', () => {
    it('posts a new IP rule and unwraps the response', async () => {
      const newRule = {
        ipRuleId: 'r2',
        type: 'allow' as const,
        cidr: '192.168.1.0/24',
        label: 'office',
        isActive: true,
        expiresAt: null,
        createdBy: 'u1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      mockPost.mockResolvedValueOnce({ data: newRule });

      const result = await securityService.createIpRule({
        type: 'allow',
        cidr: '192.168.1.0/24',
        label: 'office',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/security/ip-rules', {
        type: 'allow',
        cidr: '192.168.1.0/24',
        label: 'office',
      });
      expect(result).toEqual(newRule);
    });
  });

  describe('deleteIpRule', () => {
    it('calls DELETE on the correct IP rule endpoint', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      await securityService.deleteIpRule('r1');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/admin/security/ip-rules/r1');
    });
  });

  describe('unlockAccount', () => {
    it('posts to the unlock endpoint and unwraps the response', async () => {
      mockPost.mockResolvedValueOnce({ data: { wasLocked: true } });

      const result = await securityService.unlockAccount('u1');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/security/users/u1/unlock');
      expect(result).toEqual({ wasLocked: true });
    });
  });

  describe('forceLockAccount', () => {
    it('posts to the lock endpoint with a reason', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await securityService.forceLockAccount('u1', 'Suspicious activity');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/security/users/u1/lock', {
        reason: 'Suspicious activity',
      });
    });

    it('posts to the lock endpoint without a reason', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await securityService.forceLockAccount('u1');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/admin/security/users/u1/lock', {
        reason: undefined,
      });
    });
  });

  describe('getLoginHistory', () => {
    it('calls the login-history endpoint with filters', async () => {
      const paginated = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      mockGet.mockResolvedValueOnce(paginated);

      const result = await securityService.getLoginHistory({
        userId: 'u1',
        status: 'failure',
        page: 1,
        limit: 20,
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/security/login-history', {
        userId: 'u1',
        status: 'failure',
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(paginated);
    });
  });

  describe('getSuspiciousActivity', () => {
    it('calls the suspicious-activity endpoint and unwraps data', async () => {
      const entries = [
        {
          userId: 'u1',
          userEmail: 'bad@example.com',
          failureCount: 10,
          lastAttempt: '2024-01-01T00:00:00Z',
          lastIp: '1.2.3.4',
        },
      ];
      mockGet.mockResolvedValueOnce({ data: entries });

      const result = await securityService.getSuspiciousActivity({
        failureThreshold: 5,
        windowHours: 24,
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/security/suspicious-activity', {
        failureThreshold: 5,
        windowHours: 24,
      });
      expect(result).toEqual(entries);
    });
  });
});
