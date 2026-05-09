import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { petService, type PetFilters, type BulkPetOperation } from '../services/petService';

export const usePets = (filters: PetFilters = {}) => {
  return useQuery({
    queryKey: ['pets', filters],
    queryFn: () => petService.getAll(filters),
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });
};

export const useBulkUpdatePets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      petIds,
      operation,
      data,
      reason,
    }: {
      petIds: string[];
      operation: BulkPetOperation;
      data?: Record<string, unknown>;
      reason?: string;
    }) => petService.bulkUpdate(petIds, operation, data, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });
};
