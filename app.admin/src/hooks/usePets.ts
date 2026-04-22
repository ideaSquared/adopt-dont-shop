import { useQuery, useMutation, useQueryClient } from 'react-query';
import { petService, type PetFilters, type BulkPetOperation } from '../services/petService';

export const usePets = (filters: PetFilters = {}) => {
  return useQuery(['pets', filters], () => petService.getAll(filters), {
    keepPreviousData: true,
    staleTime: 30000,
  });
};

export const useBulkUpdatePets = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
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
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pets');
      },
    }
  );
};
