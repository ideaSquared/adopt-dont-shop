import { apiService } from './libraryServices';
import { PaginatedResponse } from '@/types';

export type Session = {
  sessionId: string;
  userId: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
  user: {
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type IpRuleType = 'allow' | 'block';

export type IpRule = {
  ipRuleId: string;
  type: IpRuleType;
  cidr: string;
  label: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateIpRuleRequest = {
  type: IpRuleType;
  cidr: string;
  label?: string | null;
  expiresAt?: string | null;
};

export type LoginHistoryEntry = {
  id: number;
  timestamp: string;
  action: string;
  status: 'success' | 'failure' | null;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
};

export type SuspiciousActivityEntry = {
  userId: string | null;
  userEmail: string | null;
  failureCount: number;
  lastAttempt: string;
  lastIp: string | null;
};

type SuccessEnvelope<T> = { success: boolean; data: T };

class SecurityService {
  async listSessions(
    filters: {
      userId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<Session>> {
    return apiService.get<PaginatedResponse<Session>>(
      '/api/v1/admin/security/sessions',
      filters as Record<string, unknown>
    );
  }

  async revokeSession(sessionId: string): Promise<void> {
    await apiService.delete<void>(`/api/v1/admin/security/sessions/${sessionId}`);
  }

  async revokeAllUserSessions(userId: string): Promise<{ revokedCount: number }> {
    const response = await apiService.delete<SuccessEnvelope<{ revokedCount: number }>>(
      `/api/v1/admin/security/users/${userId}/sessions`
    );
    return response.data;
  }

  async listIpRules(): Promise<IpRule[]> {
    const response = await apiService.get<SuccessEnvelope<IpRule[]>>(
      '/api/v1/admin/security/ip-rules'
    );
    return response.data;
  }

  async createIpRule(input: CreateIpRuleRequest): Promise<IpRule> {
    const response = await apiService.post<SuccessEnvelope<IpRule>>(
      '/api/v1/admin/security/ip-rules',
      input
    );
    return response.data;
  }

  async deleteIpRule(ipRuleId: string): Promise<void> {
    await apiService.delete<void>(`/api/v1/admin/security/ip-rules/${ipRuleId}`);
  }

  async unlockAccount(userId: string): Promise<{ wasLocked: boolean }> {
    const response = await apiService.post<SuccessEnvelope<{ wasLocked: boolean }>>(
      `/api/v1/admin/security/users/${userId}/unlock`
    );
    return response.data;
  }

  async forceLockAccount(userId: string, reason?: string): Promise<void> {
    await apiService.post<void>(`/api/v1/admin/security/users/${userId}/lock`, { reason });
  }

  async getLoginHistory(
    filters: {
      userId?: string;
      status?: 'success' | 'failure';
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<LoginHistoryEntry>> {
    return apiService.get<PaginatedResponse<LoginHistoryEntry>>(
      '/api/v1/admin/security/login-history',
      filters as Record<string, unknown>
    );
  }

  async getSuspiciousActivity(
    filters: {
      failureThreshold?: number;
      windowHours?: number;
    } = {}
  ): Promise<SuspiciousActivityEntry[]> {
    const response = await apiService.get<SuccessEnvelope<SuspiciousActivityEntry[]>>(
      '/api/v1/admin/security/suspicious-activity',
      filters as Record<string, unknown>
    );
    return response.data;
  }
}

export const securityService = new SecurityService();
