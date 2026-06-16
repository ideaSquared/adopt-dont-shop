import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { BulkUserUpdateData } from '@adopt-dont-shop/lib.validation';
import { userManagementService } from '../services/userManagementService';

// Re-export UserFilters type for convenience
export type { UserFilters } from '../services/userManagementService';

/**
 * Hook to fetch paginated users with filtering
 */
export const useUsers = (filters: Parameters<typeof userManagementService.getUsers>[0] = {}) => {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => userManagementService.getUsers(filters),
    placeholderData: keepPreviousData,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to create a new user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: Parameters<typeof userManagementService.createUser>[0]) =>
      userManagementService.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/**
 * Hook to delete a user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userId: string; reason?: string } | string) => {
      const userId = typeof params === 'string' ? params : params.userId;
      const reason = typeof params === 'string' ? undefined : params.reason;
      return userManagementService.deleteUser(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/**
 * Hook to bulk update users
 */
export const useBulkUpdateUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userIds,
      updateData,
      reason,
    }: {
      userIds: string[];
      updateData: BulkUserUpdateData;
      reason?: string;
    }) => userManagementService.bulkUpdateUsers(userIds, updateData, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/**
 * Hook to suspend a user (alias for toggleUserStatus with isActive=false)
 */
export const useSuspendUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userId: string; reason?: string }) =>
      userManagementService.suspendUser(params.userId, params.reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
  });
};

/**
 * Hook to unsuspend a user (alias for toggleUserStatus with isActive=true)
 */
export const useUnsuspendUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userManagementService.unsuspendUser(userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables] });
    },
  });
};

/**
 * Hook to verify a user (no-op for now, can be implemented later)
 */
export const useVerifyUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userManagementService.verifyUser(userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables] });
    },
  });
};
