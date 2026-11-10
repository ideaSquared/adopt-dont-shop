import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { securityService, type CreateIpRuleRequest } from '../services/securityService';

const SESSIONS_KEY = ['security', 'sessions'] as const;
const IP_RULES_KEY = ['security', 'ip-rules'] as const;

export const useSecuritySessions = (userId: string) =>
  useQuery({
    queryKey: [...SESSIONS_KEY, { userId }],
    queryFn: () => securityService.listSessions({ userId: userId || undefined, limit: 50 }),
  });

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => securityService.revokeSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
};

export const useRevokeAllUserSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => securityService.revokeAllUserSessions(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
};

export const useIpRules = () =>
  useQuery({
    queryKey: IP_RULES_KEY,
    queryFn: () => securityService.listIpRules(),
  });

export const useCreateIpRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIpRuleRequest) => securityService.createIpRule(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: IP_RULES_KEY }),
  });
};

export const useDeleteIpRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ipRuleId: string) => securityService.deleteIpRule(ipRuleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: IP_RULES_KEY }),
  });
};

export const useLoginHistory = (userId: string, status: 'all' | 'success' | 'failure') =>
  useQuery({
    queryKey: ['security', 'login-history', { userId, status }],
    queryFn: () =>
      securityService.getLoginHistory({
        userId: userId || undefined,
        status: status === 'all' ? undefined : status,
        limit: 100,
      }),
  });

export const useSuspiciousActivity = (failureThreshold: number, windowHours: number) =>
  useQuery({
    queryKey: ['security', 'suspicious-activity', { failureThreshold, windowHours }],
    queryFn: () => securityService.getSuspiciousActivity({ failureThreshold, windowHours }),
  });

export const useUnlockAccount = () =>
  useMutation({ mutationFn: (userId: string) => securityService.unlockAccount(userId) });

export const useForceLockAccount = () =>
  useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      securityService.forceLockAccount(userId, reason),
  });
