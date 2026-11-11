import { useCallback, useState } from 'react';
import { useDebouncedValue } from '@adopt-dont-shop/lib.components';

const TYPING_PAUSE_MS = 300;

/**
 * The search text that should drive the results query. Results follow the
 * typed text once typing pauses, so each keystroke doesn't fire a request;
 * submitting (the Search button or Enter) applies the current text at once.
 */
export const useAppliedSearchQuery = (
  query: string
): { appliedQuery: string; submit: () => void } => {
  const debouncedQuery = useDebouncedValue(query, TYPING_PAUSE_MS);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const submit = useCallback(() => setSubmittedQuery(query), [query]);

  // A submitted query only stands while the text is unchanged; editing it again
  // falls back to the typing pause.
  const appliedQuery = submittedQuery === query ? submittedQuery : debouncedQuery;
  return { appliedQuery, submit };
};
