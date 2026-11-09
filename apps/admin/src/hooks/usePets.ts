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

// Fetches one record by id for /pets/:id deep links, so a link opens its
// record even when it is not on the list page currently loaded. Idle while
// the id is undefined.
export const usePetById = (petId: string | undefined) =>
  useQuery({
    queryKey: ['pets', 'detail', petId],
    queryFn: () => petService.getById(petId ?? ''),
    enabled: petId !== undefined,
    retry: false,
  });

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
