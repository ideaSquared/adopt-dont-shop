import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userManagementService } from '../services/userManagementService';

// Re-export UserFilters type for convenience
export type { UserFilters } from '../services/userManagementService';

/**
 * Hook to fetch paginated users with filtering
 */
export const useUsers = (filters: Parameters<typeof userManagementService.getUsers>[0] = {}) => {
  return useQuery(['users', filters], () => userManagementService.getUsers(filters), {
    keepPreviousData: true,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to fetch a single user by ID
 */
export const useUser = (userId: string) => {
  return useQuery(['user', userId], () => userManagementService.getUserById(userId), {
    enabled: !!userId,
  });
};

/**
 * Hook to create a new user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (userData: Parameters<typeof userManagementService.createUser>[0]) =>
      userManagementService.createUser(userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
      },
    }
  );
};

/**
 * Hook to update a user
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      userId,
      userData,
    }: {
      userId: string;
      userData: Parameters<typeof userManagementService.updateUser>[1];
    }) => userManagementService.updateUser(userId, userData),
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries(['user', variables.userId]);
      },
    }
  );
};

/**
 * Hook to delete a user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (params: { userId: string; reason?: string } | string) => {
      const userId = typeof params === 'string' ? params : params.userId;
      const reason = typeof params === 'string' ? undefined : params.reason;
      return userManagementService.deleteUser(userId, reason);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
      },
    }
  );
};

/**
 * Hook to reset user password
 */
export const useResetUserPassword = () => {
  return useMutation((userId: string) => userManagementService.resetUserPassword(userId));
};

/**
 * Hook to fetch user activity
 */
export const useUserActivity = (
  userId: string,
  filters: Parameters<typeof userManagementService.getUserActivity>[1] = {}
) => {
  return useQuery(
    ['user-activity', userId, filters],
    () => userManagementService.getUserActivity(userId, filters),
    {
      enabled: !!userId,
    }
  );
};

/**
 * Hook to search users
 */
export const useSearchUsers = (
  query: string,
  filters: Parameters<typeof userManagementService.searchUsers>[1] = {}
) => {
  return useQuery(
    ['users-search', query, filters],
    () => userManagementService.searchUsers(query, filters),
    {
      enabled: !!query,
      keepPreviousData: true,
    }
  );
};

/**
 * Hook to fetch user statistics
 */
export const useUserStats = () => {
  return useQuery(['user-stats'], () => userManagementService.getUserStats(), {
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to bulk update users
 */
export const useBulkUpdateUsers = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      userIds,
      updates,
    }: Parameters<typeof userManagementService.bulkUpdateUsers>[0] extends infer P
      ? P extends [infer A, infer B]
        ? { userIds: A; updates: B }
        : never
      : never) => userManagementService.bulkUpdateUsers(userIds, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
      },
    }
  );
};

/**
 * Hook to send notification to user
 */
export const useSendUserNotification = () => {
  return useMutation(
    ({
      userId,
      notification,
    }: {
      userId: string;
      notification: Parameters<typeof userManagementService.sendNotification>[1];
    }) => userManagementService.sendNotification(userId, notification)
  );
};

/**
 * Hook to fetch user's rescues
 */
export const useUserRescues = (userId: string) => {
  return useQuery(['user-rescues', userId], () => userManagementService.getUserRescues(userId), {
    enabled: !!userId,
  });
};

/**
 * Hook to fetch user's applications
 */
export const useUserApplications = (userId: string) => {
  return useQuery(
    ['user-applications', userId],
    () => userManagementService.getUserApplications(userId),
    {
      enabled: !!userId,
    }
  );
};

/**
 * Hook to suspend a user (alias for toggleUserStatus with isActive=false)
 */
export const useSuspendUser = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (params: { userId: string; reason?: string }) =>
      userManagementService.suspendUser(params.userId, params.reason),
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries(['user', variables.userId]);
      },
    }
  );
};

/**
 * Hook to unsuspend a user (alias for toggleUserStatus with isActive=true)
 */
export const useUnsuspendUser = () => {
  const queryClient = useQueryClient();

  return useMutation((userId: string) => userManagementService.unsuspendUser(userId), {
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries('users');
      queryClient.invalidateQueries(['user', variables]);
    },
  });
};

/**
 * Hook to verify a user (no-op for now, can be implemented later)
 */
export const useVerifyUser = () => {
  const queryClient = useQueryClient();

  return useMutation((userId: string) => userManagementService.verifyUser(userId), {
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries('users');
      queryClient.invalidateQueries(['user', variables]);
    },
  });
};
