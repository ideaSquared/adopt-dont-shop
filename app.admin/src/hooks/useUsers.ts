import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminService } from '../services/libraryServices';
import type { UserFilters, UserAction, UserStatus } from '../services/libraryServices';

/**
 * Hook to fetch paginated users with filtering
 */
export const useUsers = (filters: UserFilters = {}) => {
  return useQuery(
    ['users', filters],
    () => adminService.getUsers(filters),
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
    }
  );
};

/**
 * Hook to fetch a single user by ID
 */
export const useUser = (userId: string) => {
  return useQuery(
    ['user', userId],
    () => adminService.getUserById(userId),
    {
      enabled: !!userId,
    }
  );
};

/**
 * Hook to perform user actions (suspend, unsuspend, verify, etc.)
 */
export const useUserAction = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, action, data }: {
      userId: string;
      action: UserAction;
      data?: { status?: UserStatus; reason?: string };
    }) => adminService.performUserAction(userId, action, data),
    {
      onSuccess: () => {
        // Invalidate users query to refetch
        queryClient.invalidateQueries('users');
      },
    }
  );
};

/**
 * Hook to suspend a user
 */
export const useSuspendUser = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, reason }: { userId: string; reason?: string }) =>
      adminService.suspendUser(userId, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
      },
    }
  );
};

/**
 * Hook to unsuspend a user
 */
export const useUnsuspendUser = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (userId: string) => adminService.unsuspendUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
      },
    }
  );
};

/**
 * Hook to verify a user
 */
export const useVerifyUser = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (userId: string) => adminService.verifyUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
      },
    }
  );
};

/**
 * Hook to update user status
 */
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ userId, status }: { userId: string; status: UserStatus }) =>
      adminService.updateUserStatus(userId, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
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
    ({ userId, reason }: { userId: string; reason?: string }) =>
      adminService.deleteUser(userId, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
      },
    }
  );
};
