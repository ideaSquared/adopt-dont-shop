import type { QuestionSummary } from '../components/applications/ApplicationDetails/answer-sections';
import { apiService } from './libraryServices';

type RawQuestion = Partial<Record<keyof QuestionSummary, unknown>>;

const toQuestionSummary = (raw: RawQuestion): QuestionSummary | null =>
  typeof raw.questionKey === 'string' && typeof raw.questionText === 'string'
    ? {
        questionKey: raw.questionKey,
        questionText: raw.questionText,
        category: typeof raw.category === 'string' ? raw.category : '',
        questionType: typeof raw.questionType === 'string' ? raw.questionType : '',
        displayOrder: typeof raw.displayOrder === 'number' ? raw.displayOrder : 0,
      }
    : null;

/**
 * The rescue's application questionnaire (core questions plus its own),
 * from GET /api/v1/rescues/:rescueId/questions (`{ success, data }`).
 */
export const getApplicationQuestions = async (rescueId: string): Promise<QuestionSummary[]> => {
  const response = await apiService.get<{ data?: RawQuestion[] }>(
    `/api/v1/rescues/${rescueId}/questions`
  );
  return (response.data ?? [])
    .map(toQuestionSummary)
    .filter((q): q is QuestionSummary => q !== null);
};
