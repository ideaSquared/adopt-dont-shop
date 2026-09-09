import { describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';

// The hook is a thin wrapper over react-query. Rather than render it (no
// react-dom / testing-library needed for this), capture the option object
// passed to useQuery and exercise its queryFn — the actual behaviour the
// hook defines. Mirrors packages/lib.analytics/src/hooks/useReports.test.ts.
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options: unknown) => options),
}));

vi.mock('../services/legal-service', () => ({
  fetchLegalDocument: vi.fn(),
}));

import { fetchLegalDocument } from '../services/legal-service';
import { useLegalDocument } from './useLegalDocument';

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => unknown;
  staleTime?: number;
};

describe('useLegalDocument', () => {
  it('queries the legal document keyed by slug', () => {
    const options = useLegalDocument('privacy') as unknown as QueryOptions;

    expect(options.queryKey).toEqual(['legal-document', 'privacy']);
    expect(vi.mocked(useQuery)).toHaveBeenCalled();
  });

  it('delegates fetching to fetchLegalDocument for the given slug', () => {
    const options = useLegalDocument('cookies') as unknown as QueryOptions;
    options.queryFn();

    expect(fetchLegalDocument).toHaveBeenCalledWith('cookies');
  });
});
