import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffService, type StaffMember } from '../services/staffService';
import { NewStaffMember } from '../types/staff';
import { useAuth } from '@adopt-dont-shop/lib.auth';

const NO_STAFF: StaffMember[] = [];

export const useStaff = () => {
  const { user } = useAuth();
  const userId = user?.userId;
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  // Fetch staff for the current user's rescue (automatically filtered by backend)
  const query = useQuery({
    queryKey: ['staff', userId],
    queryFn: () => staffService.getRescueStaff(),
    enabled: Boolean(userId),
    staleTime: 0,
  });

  const addMutation = useMutation({
    mutationFn: ({ staffData, rescueId }: { staffData: NewStaffMember; rescueId: string }) =>
      staffService.addStaffMember(staffData, rescueId),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: ({ memberUserId, rescueId }: { memberUserId: string; rescueId: string }) =>
      staffService.removeStaffMember(memberUserId, rescueId),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      memberUserId,
      staffData,
      rescueId,
    }: {
      memberUserId: string;
      staffData: { title?: string };
      rescueId: string;
    }) => staffService.updateStaffMember(memberUserId, staffData, rescueId),
    onSuccess: invalidate,
  });

  const errorMessage = (() => {
    if (!query.isError) {
      return null;
    }
    return query.isRefetchError ? 'Failed to reload staff members' : 'Failed to load staff members';
  })();

  return {
    staff: query.data ?? NO_STAFF,
    loading: query.isFetching,
    error: errorMessage,
    refetch: async () => {
      if (userId) {
        await query.refetch();
      }
    },
    addStaffMember: (staffData: NewStaffMember, rescueId: string) =>
      addMutation.mutateAsync({ staffData, rescueId }),
    removeStaffMember: (memberUserId: string, rescueId: string) =>
      removeMutation.mutateAsync({ memberUserId, rescueId }),
    updateStaffMember: (memberUserId: string, staffData: { title?: string }, rescueId: string) =>
      updateMutation.mutateAsync({ memberUserId, staffData, rescueId }),
  };
};
