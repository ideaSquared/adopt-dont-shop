import { useQuery } from '@tanstack/react-query';

import { getApplicationQuestions } from '../services/applicationQuestionsService';

// A rescue's questionnaire changes rarely; reviewing several applications in a
// row should not refetch it each time.
const FIVE_MINUTES = 5 * 60_000;

export const useApplicationQuestions = (rescueId: string | undefined) =>
  useQuery({
    queryKey: ['application-questions', rescueId],
    queryFn: () => (rescueId ? getApplicationQuestions(rescueId) : Promise.resolve([])),
    enabled: Boolean(rescueId),
    staleTime: FIVE_MINUTES,
  });
